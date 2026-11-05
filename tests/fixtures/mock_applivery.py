#!/usr/bin/env python3
"""Minimal mock of the Applivery API used by the action tests.

Usage: mock_applivery.py PORT LOGFILE

Behaviour is controlled by env vars:
  MOCK_UPLOAD_STATUS   status of the build returned by the upload (default: processed)
  MOCK_GET_STATUS      status returned by GET builds/<id>   (default: processed)
  MOCK_EXISTING_SLUGS  comma separated slugs that already have a publication
  MOCK_UPLOAD_HTTP     HTTP status code for the upload endpoint (default: 200)

Every request is appended to LOGFILE as one JSON object per line:
  {"method": ..., "path": ..., "body": ...}
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

PORT = int(sys.argv[1])
LOGFILE = sys.argv[2]

UPLOAD_STATUS = os.environ.get("MOCK_UPLOAD_STATUS", "processed")
GET_STATUS = os.environ.get("MOCK_GET_STATUS", "processed")
EXISTING = [s for s in os.environ.get("MOCK_EXISTING_SLUGS", "").split(",") if s]
UPLOAD_HTTP = int(os.environ.get("MOCK_UPLOAD_HTTP", "200"))

TS = "2024-01-01T00:00:00.000Z"


def build(status):
    return {
        "id": "build-123",
        "status": status,
        "tags": [],
        "versionName": "test",
        "application": "app-1",
        "applicationInfo": {"id": "app-1", "name": "App", "slug": "app"},
        "createdAt": TS,
        "updatedAt": TS,
    }


def publication(pid, slug, ftype="gitBranch", fvalue="x"):
    return {
        "id": pid,
        "slug": slug,
        "distributionUrl": "https://dl.example.com/" + slug,
        "createdAt": TS,
        "updatedAt": TS,
        "filter": {"type": ftype, "value": fvalue},
        "visibility": "unlisted",
        "security": "public",
        "groups": [],
        "tags": [],
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("mock: " + (fmt % args) + "\n")

    def _log(self, body):
        with open(LOGFILE, "a") as f:
            f.write(json.dumps({"method": self.command, "path": self.path, "body": body}) + "\n")

    def _send(self, code, obj):
        data = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _body(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b""
        return raw.decode("utf-8", errors="replace")

    def do_GET(self):
        self._log("")
        u = urlparse(self.path)
        if u.path == "/health":
            return self._send(200, {"ok": True})
        if "/integrations/builds/" in u.path:
            return self._send(200, {"status": True, "data": build(GET_STATUS)})
        if u.path.endswith("/integrations/distributions"):
            slug = parse_qs(u.query).get("slug", [""])[0]
            items = [publication("pub-existing", slug)] if slug in EXISTING else []
            return self._send(200, {"data": {"items": items, "totalItems": len(items),
                                             "itemsPerPage": 25, "currentPage": 1, "totalPages": 1}})
        self._send(404, {"error": "not found"})

    def do_POST(self):
        body = self._body()
        self._log(body)
        u = urlparse(self.path)
        if u.path.endswith("/integrations/builds"):
            if UPLOAD_HTTP != 200:
                return self._send(UPLOAD_HTTP, {"status": False, "error": {"code": UPLOAD_HTTP, "message": "boom"}})
            return self._send(200, {"status": True, "data": build(UPLOAD_STATUS)})
        if u.path.endswith("/integrations/distributions"):
            payload = json.loads(body or "{}")
            f = payload.get("filter", {})
            pub = publication("pub-new", payload.get("slug", ""), f.get("type"), f.get("value"))
            pub["security"] = payload.get("security")
            return self._send(201, {"data": pub})
        self._send(404, {"error": "not found"})


HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
