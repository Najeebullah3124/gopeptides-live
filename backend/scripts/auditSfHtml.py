import re
import sys
import urllib.request

UA = {'User-Agent': 'Screaming Frog SEO Spider/24.2'}

def fetch(url: str) -> str:
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20).read().decode('utf-8', 'replace')

def audit(url: str) -> None:
    h = fetch(url)
    m = re.search(r'id="seo-prerender"[^>]*>(.*?)</article>', h, re.S)
    pr = re.sub(r'<[^>]+>', ' ', m.group(1) if m else '').split()
    desc = re.search(r'name="description" content="([^"]+)"', h)
    title = re.search(r'<title>([^<]+)</title>', h)
    h1s = re.findall(r'<h1[^>]*>([^<]+)', h, re.I)
    h2s = re.findall(r'<h2[^>]*>([^<]+)', h, re.I)
    print(url)
    print('  title:', (title.group(1) if title else '')[:70])
    print('  desc len:', len(desc.group(1)) if desc else 0)
    print('  prerender words:', len(pr))
    print('  h1:', h1s)
    print('  h2:', h2s)
    print()

if __name__ == '__main__':
    urls = sys.argv[1:] or [
        'https://gopeptides.nl/cagrilintide-10mg',
        'https://gopeptides.nl/cagrilintide-10mg?lang=en',
        'https://gopeptides.nl/blog/sermorelin-and-growth-hormone-secretagogues-in-anti-aging-research?lang=de',
        'https://gopeptides.nl/sitemap.xsl',
    ]
    for u in urls:
        try:
            audit(u)
        except Exception as e:
            print(u, e)
