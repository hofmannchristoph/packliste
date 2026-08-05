#!/usr/bin/env python3
"""Kleiner Entwicklungsserver für die Packliste.

`python3 -m http.server` lässt sich hier nicht verwenden: das Modul ruft schon
beim Laden `os.getcwd()` auf, und in einer Sandbox ohne Zugriff auf das
Arbeitsverzeichnis bricht es mit `PermissionError` ab, noch bevor eine Option
ausgewertet wird. Dieses Skript nimmt stattdessen sein eigenes Verzeichnis.

    python3 dev-server.py [port] [--lan]

`--lan` lauscht auf allen Netzwerkschnittstellen, damit sich das Handy im
gleichen WLAN verbinden kann. Ohne die Option nur lokal.
"""

import functools
import os
import socket
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
ARGS = [a for a in sys.argv[1:] if not a.startswith('-')]
PORT = int(ARGS[0]) if ARGS else 4173
LAN = '--lan' in sys.argv
HOST = '0.0.0.0' if LAN else '127.0.0.1'


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Beim Entwickeln nie aus dem Browser-Cache liefern, sonst sieht man
        # Änderungen an den Modulen nicht.
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write('%s %s\n' % (self.address_string(), fmt % args))


def lan_adresse():
    """Die eigene IP im WLAN – ohne echte Verbindung aufzubauen."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        return s.getsockname()[0]
    except OSError:
        return '127.0.0.1'
    finally:
        s.close()


def main():
    os.chdir(ROOT)
    server = ThreadingHTTPServer((HOST, PORT), functools.partial(Handler, directory=ROOT))
    print(f'Packliste läuft auf http://localhost:{PORT} (aus {ROOT})', flush=True)
    if LAN:
        print(f'Vom Handy im gleichen WLAN: http://{lan_adresse()}:{PORT}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == '__main__':
    main()
