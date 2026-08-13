from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE = "http://127.0.0.1:3000"
PUBLIC_ROUTES = [
    "/", "/services", "/intake", "/legal-disclaimer", "/auth/signin",
    "/matters", "/notifications", "/admin", "/admin/intakes", "/sitemap.xml",
]
API_ROUTES = [
    "/api/auth/me", "/api/legal/services", "/api/admin/intakes",
    "/api/admin/matters", "/api/notifications",
]

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs = []
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            href = dict(attrs).get("href")
            if href and href.startswith("/") and not href.startswith("//"):
                self.hrefs.append(href.split("#", 1)[0])

def fetch(path):
    req = Request(BASE + path, headers={"User-Agent": "WakeelyPro smoke-check"})
    try:
        with urlopen(req, timeout=10) as response:
            return response.status, response.read().decode("utf-8", "ignore")
    except HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", "ignore")
    except URLError as exc:
        return 0, str(exc)

print("PUBLIC ROUTES")
all_links = set()
for path in PUBLIC_ROUTES:
    status, body = fetch(path)
    print(f"{status:3} {path:28} bytes={len(body):6} footer={'site-footer' in body} logo-root={'href=\"/\"' in body}")
    if status == 200 and "text/html" in body[:5000].lower():
        parser = Links()
        parser.feed(body)
        all_links.update(parser.hrefs)

print("LINK TARGETS")
for path in sorted(p for p in all_links if p and not p.startswith("/_next")):
    status, _ = fetch(path)
    print(f"{status:3} {path}")

print("API ROUTES")
for path in API_ROUTES:
    status, body = fetch(path)
    print(f"{status:3} {path} body={body[:120].replace(chr(10), ' ')}")
