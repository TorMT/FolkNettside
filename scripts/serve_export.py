"""Serve an export at its configured URL prefix (including /FolkNettside)."""
import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


def server(directory, port=8000):
    directory = Path(directory).resolve()
    config = json.loads((directory / 'deployment/build.json').read_text(encoding='utf-8'))
    base = config['basePath']

    class Handler(SimpleHTTPRequestHandler):
        def do_HEAD(self):
            path = urlsplit(self.path).path
            if base and not path.startswith(base + '/'):
                self.send_error(404, 'Outside the configured mount path')
                return
            self.path = self.path[len(base):] if base else self.path
            super().do_HEAD()

        def do_GET(self):
            path = urlsplit(self.path).path
            if base and path == base:
                self.send_response(301)
                self.send_header('Location', base + '/')
                self.end_headers()
                return
            if base and not path.startswith(base + '/'):
                self.send_error(404, 'Outside the configured mount path')
                return
            self.path = self.path[len(base):] if base else self.path
            super().do_GET()

        def log_message(self, *args):
            pass

    return ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=str(directory)))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', default='export')
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    httpd = server(args.directory, args.port)
    print(f'http://127.0.0.1:{args.port}' + json.loads((Path(args.directory) / 'deployment/build.json').read_text())['basePath'] + '/', flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
