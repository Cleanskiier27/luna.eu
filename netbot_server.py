"""Local NetBot frontend and optional Anthropic Messages API adapter."""

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

SITE = Path(__file__).resolve().parent / "GITREPOVSLOCAL"
HOST = "127.0.0.1:4190"


class NetBot(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    def respond(self, status, **body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path != "/api/netbot":
            return self.respond(404, error="Unknown endpoint.")
        if self.headers.get("Host") != HOST or self.headers.get("Origin") != f"http://{HOST}":
            return self.respond(403, error="Open NetBot from the local preview.")
        if self.headers.get_content_type() != "application/json":
            return self.respond(415, error="JSON required.")
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 32768:
                return self.respond(413, error="Message body too large or empty.")
            body = json.loads(self.rfile.read(length))
        except (ValueError, RecursionError):
            return self.respond(400, error="Invalid JSON request.")
        message = body.get("message") if isinstance(body, dict) else None
        if not isinstance(message, str) or not message.strip() or len(message) > 4000:
            return self.respond(400, error="Enter a message of 1 to 4000 characters.")
        key, model = os.getenv("ANTHROPIC_API_KEY"), os.getenv("ANTHROPIC_MODEL")
        if not key or not model:
            return self.respond(503, error="Configure ANTHROPIC_API_KEY and ANTHROPIC_MODEL on the server.")
        request = Request("https://api.anthropic.com/v1/messages", headers={
            "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json",
        }, data=json.dumps({
            "model": model, "max_tokens": 768,
            "system": "You are NetBot, a text-only NetworkBuster assistant. You cannot run commands.",
            "messages": [{"role": "user", "content": message}],
        }).encode())
        try:
            with urlopen(request, timeout=30) as upstream:
                payload = json.load(upstream)
            reply = "\n".join(b["text"] for b in payload["content"] if b["type"] == "text")
            if not reply.strip():
                return self.respond(502, error="Claude returned no text.")
        except (URLError, OSError, ValueError, KeyError, TypeError):
            return self.respond(502, error="Claude request failed. Check the server credentials, model and quota.")
        self.respond(200, reply=reply)


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 4190), NetBot).serve_forever()
