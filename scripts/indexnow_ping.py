#!/usr/bin/env python3
"""Submit every public GoodGame URL to IndexNow (Bing, Yandex, and partners)."""
import json
import urllib.request
import xml.etree.ElementTree as ET

HOST = "https://goodgame.center"
KEY = "a8df7c0d6f3b4ad2a6f9487c8f0b1d25"
UA = "GoodGameIndexNow/1.0"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as res:
        return res.read()


def locs_from(xml_bytes, tag="loc"):
    root = ET.fromstring(xml_bytes)
    return [el.text.strip() for el in root.findall(f".//{{*}}{tag}") if el.text]


def main():
    index = fetch(f"{HOST}/sitemap.xml")
    sitemap_locs = locs_from(index)
    urls = []
    for sm in sitemap_locs:
        urls.extend(locs_from(fetch(sm)))
    urls.append(f"{HOST}/rss.xml")
    urls = sorted(set(urls))
    payload = json.dumps({
        "host": "goodgame.center",
        "key": KEY,
        "keyLocation": f"{HOST}/{KEY}.txt",
        "urlList": urls,
    }).encode()
    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": UA},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            print("IndexNow", res.status, len(urls), "urls")
    except urllib.error.HTTPError as exc:
        print("IndexNow error", exc.code, exc.read()[:300], "urls", len(urls))
    print("sample", urls[:8])


if __name__ == "__main__":
    import urllib.error
    main()
