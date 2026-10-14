#!/usr/bin/env python3
"""Add security headers to nginx static asset locations (Screaming Frog)."""
from __future__ import annotations

import pathlib
import subprocess
import sys

CONF = pathlib.Path('/etc/nginx/sites-available/default')
MARKER = '# patchNginxStaticSecurity'
HEADERS = f"""        {MARKER}
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' https: data:; connect-src 'self' https:; frame-ancestors 'self'" always;"""


def insert_after(text: str, needle: str, block: str) -> str:
    if block.strip() in text:
        return text
    idx = text.find(needle)
    if idx == -1:
        raise SystemExit(f'needle not found: {needle!r}')
    end = idx + len(needle)
    return text[:end] + '\n' + block + text[end:]


def main() -> None:
    text = CONF.read_text(encoding='utf-8')
    if MARKER in text:
        print('Already patched')
    else:
        text = insert_after(
            text,
            'add_header Cache-Control "public, max-age=31536000, immutable";',
            HEADERS,
        )
        text = insert_after(
            text,
            'location /assets/ {\n        alias /var/www/html/frontend/assets/;\n        expires 30d;\n        add_header Cache-Control "public, immutable";',
            '\n' + HEADERS,
        )
        text = insert_after(
            text,
            'location /logo.jpeg {\n        alias /var/www/html/frontend/logo.jpeg;',
            '\n' + HEADERS,
        )
        text = insert_after(
            text,
            'location /products/ {\n        alias /var/www/html/frontend/products/;',
            '\n' + HEADERS,
        )
        CONF.write_text(text, encoding='utf-8')
        print('Patched', CONF)

    subprocess.run(['nginx', '-t'], check=True)
    subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    print('Nginx reloaded OK')


if __name__ == '__main__':
    main()
