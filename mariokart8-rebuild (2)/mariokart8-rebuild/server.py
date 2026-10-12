#!/usr/bin/env python3
"""MK8 Web local host — static + romfs proxy (disk cache).

  python3 server.py
  python3 server.py --port 9000

Online rooms: net.js on localhost connects to wss://mariokart8.online/ws by default.
Override with ?ws=wss://host/ws
"""
from __future__ import annotations

import argparse
import hashlib
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
ORIGIN = os.environ.get("MK8_ORIGIN", "https://mariokart8.online").rstrip("/")
CACHE = ROOT / "romfs-cache"
CACHE.mkdir(exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/romfs"):
            return self.proxy_romfs()
        return super().do_GET()

    def do_HEAD(self):
        if self.path.startswith("/romfs"):
            return self.proxy_romfs(head_only=True)
        return super().do_HEAD()

    def proxy_romfs(self, head_only=False):
        # /romfs or /romfs/...
        path = self.path.split("?", 1)[0]
        if path == "/romfs":
            path = "/romfs/"
        rel = path[len("/romfs/") :]
        is_dir = path.endswith("/") or not rel

        key = hashlib.sha1(rel.encode()).hexdigest()
        if is_dir:
            cache_path = CACHE / (key + ".dir.html")
        else:
            safe = rel.replace("/", "__")
            if len(safe) > 180:
                safe = key + (Path(rel).suffix or "")
            cache_path = CACHE / safe

        data = None
        ctype = "application/octet-stream"
        if cache_path.is_file() and cache_path.stat().st_size > 0:
            data = cache_path.read_bytes()
            ct_file = cache_path.with_suffix(cache_path.suffix + ".ctype")
            if ct_file.is_file():
                ctype = ct_file.read_text().strip()
        else:
            url = f"{ORIGIN}/romfs/{rel}"
            try:
                req = Request(url, headers={"User-Agent": "mk8-local-proxy/1.1"})
                with urlopen(req, timeout=180) as r:
                    data = r.read()
                    ctype = r.headers.get("Content-Type", "application/octet-stream")
            except HTTPError as e:
                self.send_error(e.code, f"upstream {e.code}")
                return
            except Exception as e:
                self.send_error(502, str(e))
                return
            # Directory listings use relative hrefs; keep them under /romfs/<rel>
            if is_dir or (ctype.startswith("text/html") and b"<ul>" in data[:500]):
                prefix = "/romfs/" + rel
                def fix(m):
                    h = m.group(1)
                    if h.startswith(("http:", "https:", "/", "?", "#")):
                        return m.group(0)
                    return f'href="{prefix}{h}"'
                try:
                    text = data.decode("utf-8", "replace")
                    text = re.sub(r'href="([^"]+)"', fix, text)
                    data = text.encode("utf-8")
                    ctype = "text/html; charset=utf-8"
                except Exception:
                    pass
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_bytes(data)
            cache_path.with_suffix(cache_path.suffix + ".ctype").write_text(ctype)

        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "public, max-age=86400")
        self.end_headers()
        if not head_only:
            self.wfile.write(data)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8080)
    args = ap.parse_args()
    print(f"MK8 origin : {ORIGIN}")
    print(f"Site root  : {ROOT}")
    print(f"Romfs cache: {CACHE}")
    print(f"Open       : http://{args.host}:{args.port}/")
    print("Online WS  : wss://mariokart8.online/ws (auto on localhost)")
    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    main()
