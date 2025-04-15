# C2 Server

A command and control server application with a web interface for managing client connections.

## Features

- Web-based control panel for managing connected clients
- Interactive shell access to clients
- Command execution on connected machines
- Support for both Windows and Linux clients
- Session logging

## Components

- **app.py**: Flask web application for the control panel
- **c2_server_logic.py**: Core server functionality
- **integrated_client.py**: Client agent for connecting to the C2 server

## Setup

1. Install dependencies:
   ```
   pip install flask psutil
   ```

2. Run the server:
   ```
   python app.py
   ```

3. Client connection:
   ```
   python integrated_client.py
   ```

## Note

This is an educational project for learning about network programming and client-server architecture.
