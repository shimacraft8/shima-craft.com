"""Loopback-only preview of an exported Expo app; no deployment or upload."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--directory', required=True)
parser.add_argument('--port', type=int, default=4901)
args = parser.parse_args()
root = Path(args.directory).resolve()

class Preview(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(root), **kw)
    def do_GET(self):
        path = urlsplit(self.path).path
        if path.rstrip('/') in {'/more', '/move', '/explore', '/safety'}:
            self.path = path.rstrip('/') + '.html'
        super().do_GET()
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    print(f'AMAMI LIFE app preview: http://localhost:{args.port}/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Preview).serve_forever()
