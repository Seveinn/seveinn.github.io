#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""AI Skills Visual Center - local static HTTP server."""

from __future__ import annotations

import os
import socket
import sys
import threading
import time
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

HOST = "127.0.0.1"
PREFERRED_PORT = 4173
PORT_RANGE = 20
ROOT = Path(__file__).resolve().parent.parent
STATE_FILE = Path(__file__).resolve().parent / "visual-center.state"
LOG_FILE = Path(__file__).resolve().parent / "visual-center.log"

MIME_EXTRA = {
    ".md": "text/markdown; charset=utf-8",
    ".markdown": "text/markdown; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
}


def log(message: str) -> None:
    line = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {message}"
    print(line, flush=True)
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def save_state(port: int, pid: int) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(
        f"pid={pid}\nport={port}\nurl=http://{HOST}:{port}/visual-center/\n",
        encoding="ascii",
    )


def clear_state() -> None:
    try:
        if STATE_FILE.exists():
            STATE_FILE.unlink()
    except OSError:
        pass


def port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((HOST, port))
            return True
        except OSError:
            return False


def find_port(start: int = PREFERRED_PORT, count: int = PORT_RANGE) -> int:
    for port in range(start, start + count):
        if port_free(port):
            return port
    raise RuntimeError(f"Port {start}-{start + count - 1} all busy")


def health_ok(port: int, timeout: float = 0.8) -> bool:
    try:
        with socket.create_connection((HOST, port), timeout=timeout) as sock:
            req = (
                f"GET /health HTTP/1.1\r\nHost: {HOST}:{port}\r\n"
                "Connection: close\r\n\r\n"
            ).encode("ascii")
            sock.sendall(req)
            data = sock.recv(256).decode("latin-1", errors="ignore")
            return "200" in data.split("\r\n", 1)[0]
    except OSError:
        return False


def find_running_port() -> int | None:
    # Prefer state file; only probe preferred port to avoid slow scans.
    if STATE_FILE.exists():
        try:
            for line in STATE_FILE.read_text(encoding="ascii").splitlines():
                if line.startswith("port="):
                    port = int(line.split("=", 1)[1])
                    if health_ok(port, timeout=0.4):
                        return port
        except (OSError, ValueError):
            pass
    if health_ok(PREFERRED_PORT, timeout=0.4):
        return PREFERRED_PORT
    return None


class VisualCenterHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str | None = None, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        log("%s - %s" % (self.address_string(), fmt % args))

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def guess_type(self, path: str):
        ext = Path(path).suffix.lower()
        if ext in MIME_EXTRA:
            return MIME_EXTRA[ext]
        return super().guess_type(path)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/health":
            body = b'{"ok":true}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if path in ("", "/"):
            self.send_response(302)
            self.send_header("Location", "/visual-center/")
            self.end_headers()
            return

        candidate = (Path(self.directory) / path.lstrip("/")).resolve()
        try:
            candidate.relative_to(Path(self.directory).resolve())
        except ValueError:
            self.send_error(403, "Forbidden")
            return

        super().do_GET()


def open_browser(url: str) -> None:
    try:
        webbrowser.open(url)
    except Exception as exc:  # noqa: BLE001
        log(f"Cannot open browser: {exc}")
        log(f"Open manually: {url}")


def run_server(port: int) -> None:
    handler = partial(VisualCenterHandler, directory=str(ROOT))
    server = ThreadingHTTPServer((HOST, port), handler)
    url = f"http://{HOST}:{port}/visual-center/"
    save_state(port, os.getpid())

    print()
    print("  AI Skills Visual Center")
    print("  --------------------------------")
    print(f"  Root: {ROOT}")
    print(f"  URL:  {url}")
    print("  Stop: Ctrl+C  or  stop-visual-center.bat")
    print()
    log(f"Server started: {url} (pid={os.getpid()})")

    threading.Timer(0.4, open_browser, args=(url,)).start()

    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        print()
        log("Interrupted, stopping...")
    finally:
        server.shutdown()
        server.server_close()
        clear_state()
        log("Server stopped.")


def main() -> int:
    os.chdir(ROOT)
    from_bat = os.environ.get("VISUAL_CENTER_FROM_BAT") == "1"

    def pause(message: str = "Press Enter to close...") -> None:
        if from_bat:
            return
        try:
            input(f"\n{message}")
        except EOFError:
            pass

    running = find_running_port()
    if running is not None:
        url = f"http://{HOST}:{running}/visual-center/"
        print(f"Already running: {url}")
        open_browser(url)
        pause("Browser should be open. Press Enter to close...")
        return 0

    try:
        port = find_port()
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        pause()
        return 1

    try:
        run_server(port)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to start: {exc}", file=sys.stderr)
        pause()
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
