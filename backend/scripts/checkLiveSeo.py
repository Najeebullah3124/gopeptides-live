import re
import sys
import urllib.request

urls = sys.argv[1:] or [
    'https://gopeptides.nl/',
    'https://gopeptides.nl/?lang=en',
    'https://gopeptides.nl/?lang=de',
    'https://gopeptides.nl/5-amino-1mq-50mg',
    'https://gopeptides.nl/5-amino-1mq-50mg?lang=en',
]

for u in urls:
    req = urllib.request.Request(u, headers={'User-Agent': 'SemrushBot'})
    html = urllib.request.urlopen(req, timeout=15).read().decode('utf-8', 'replace')[:12000]
    lang = re.search(r'<html[^>]*lang="([^"]+)"', html)
    canon = re.search(r'rel="canonical" href="([^"]+)"', html)
    hrefs = re.findall(r'hreflang="([^"]+)" href="([^"]+)"', html)
    title = re.search(r'<title>([^<]+)</title>', html)
    desc = re.search(r'name="description" content="([^"]+)"', html)
    print('URL', u)
    print('  html lang:', lang.group(1) if lang else '?')
    print('  canonical:', canon.group(1) if canon else '?')
    print('  title:', (title.group(1)[:70] if title else '?'))
    print('  desc:', (desc.group(1)[:70] if desc else '?'))
    for h, href in hrefs:
        print(f'  hreflang {h} -> {href}')
    print()
