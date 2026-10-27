#!/usr/bin/env python3
"""Local test server with the same routing rules as production.  Run: python3 serve.py  ->  http://localhost:8000"""
import http.server, os, sys
ROOT = os.path.dirname(os.path.abspath(__file__)); os.chdir(ROOT)
PRIV = {'dashboard','profile','login','signup','forgot','reset','complete','cart'}; DYN = {'learn','certificate','admin'}
class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        p = self.path.split('?')[0].split('#')[0]; seg = [s for s in p.split('/') if s]
        full = os.path.join(ROOT, p.lstrip('/'))
        if os.path.isdir(full) and not p.endswith('/'):   # /courses -> /courses/
            self.send_response(301); self.send_header('Location', p + '/' + ('?' + self.path.split('?')[1] if '?' in self.path else '')); self.end_headers(); return
        if not os.path.exists(full) and not (os.path.isdir(full)):
            if seg and (seg[0] in PRIV and len(seg) == 1 or seg[0] in DYN): self.path = '/app.html'
            else:
                self.send_response(404); self.send_header('Content-Type', 'text/html; charset=utf-8'); data = open('404.html', 'rb').read(); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data); return
        return super().do_GET()
    def log_message(self, *a): pass
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f'Serving on http://localhost:{port}  (Ctrl+C to stop)'); http.server.ThreadingHTTPServer(('', port), H).serve_forever()
