"""Tiny static server for the built Burnwise site (no npm needed). Usage: python serve.py"""
import http.server, mimetypes, os, socketserver

for ext, mt in {'.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.csv': 'text/csv'}.items():
    mimetypes.add_type(mt, ext)
os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = 4200

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.translate_path(self.path.split('?')[0])
        if not os.path.exists(path) and '.' not in os.path.basename(path):
            self.path = '/index.html'   # Angular routes (e.g. /fire-analysis) -> index.html
        return super().do_GET()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', PORT), Handler) as httpd:
    print(f'Burnwise running at http://localhost:{PORT}  (press Ctrl+C to stop)')
    httpd.serve_forever()
