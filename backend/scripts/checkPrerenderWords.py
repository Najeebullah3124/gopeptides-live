import re
import sys
import urllib.request

urls = sys.argv[1:] or ['https://gopeptides.nl/cagrilintide-10mg']
for u in urls:
    req = urllib.request.Request(u, headers={'User-Agent': 'Screaming Frog SEO Spider'})
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read().decode('utf-8', errors='replace')
        ct = r.headers.get('Content-Type', '')
    m = re.search(r'<article id="seo-prerender"[^>]*>(.*?)</article>', body, re.S | re.I)
    h2s = re.findall(r'<h2>(.*?)</h2>', body, re.I)
    words = 0
    if m:
        text = re.sub(r'<[^>]+>', ' ', m.group(1))
        words = len(text.split())
    print(u)
    print('  content-type:', ct.split(';')[0])
    print('  prerender words:', words)
    print('  h2s:', [re.sub(r'<[^>]+>', '', h) for h in h2s[:3]])
    print()
