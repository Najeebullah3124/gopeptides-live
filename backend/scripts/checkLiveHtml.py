import re
import sys
import urllib.request

url = sys.argv[1] if len(sys.argv) > 1 else 'https://gopeptides.nl/cagrilintide-10mg'
ua = sys.argv[2] if len(sys.argv) > 2 else 'Screaming Frog SEO Spider'
req = urllib.request.Request(url, headers={'User-Agent': ua})
with urllib.request.urlopen(req, timeout=30) as r:
    body = r.read().decode('utf-8', errors='replace')
    status = r.status
title = re.search(r'<title>([^<]+)</title>', body)
print('status', status, 'ua', ua)
print('title:', title.group(1)[:80] if title else '?')
print('has seo-prerender:', 'seo-prerender' in body)
if 'seo-prerender' in body:
    m = re.search(r'<article id="seo-prerender"[^>]*>(.*?)</article>', body, re.S | re.I)
    if m:
        text = re.sub(r'<[^>]+>', ' ', m.group(1))
        print('words:', len(text.split()))
