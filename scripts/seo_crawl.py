#!/usr/bin/env python3
import argparse
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


UA = "GoodGameSEOAudit/1.0 (+https://goodgame.center)"


def fetch(url, accept="*/*"):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            body = res.read()
            return {
                "url": url,
                "final_url": res.geturl(),
                "status": res.status,
                "headers": {k.lower(): v for k, v in res.headers.items()},
                "body": body.decode("utf-8", "replace"),
            }
    except urllib.error.HTTPError as exc:
        body = exc.read()
        return {
            "url": url,
            "final_url": exc.geturl(),
            "status": exc.code,
            "headers": {k.lower(): v for k, v in exc.headers.items()},
            "body": body.decode("utf-8", "replace"),
        }
    except Exception as exc:
        return {"url": url, "final_url": url, "status": 0, "headers": {}, "body": "", "error": str(exc)}


def xml_locs(xml_text, tag):
    root = ET.fromstring(xml_text)
    return [el.text.strip() for el in root.findall(f".//{{*}}{tag}/{{*}}loc") if el.text and el.text.strip()]


def first_match(pattern, text, flags=re.I | re.S):
    m = re.search(pattern, text, flags)
    if not m:
        return None
    return re.sub(r"\s+", " ", m.group(1)).strip()


def meta_content(name, html):
    return first_match(rf'<meta[^>]+name=["\']{re.escape(name)}["\'][^>]+content=["\']([^"\']+)["\']', html)


def property_content(prop, html):
    return first_match(rf'<meta[^>]+property=["\']{re.escape(prop)}["\'][^>]+content=["\']([^"\']+)["\']', html)


def canonical(html):
    return first_match(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']', html)


def jsonld_blocks(html):
    return re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.I | re.S)


def normalize_url(url):
    p = urllib.parse.urlsplit(url)
    path = p.path.rstrip("/") or "/"
    return urllib.parse.urlunsplit((p.scheme, p.netloc, path, "", ""))


def page_audit(url, expected_host):
    res = fetch(url, accept="text/html,application/xhtml+xml")
    critical = []
    warnings = []
    body = res["body"]
    xrobots = res["headers"].get("x-robots-tag", "")
    ctype = res["headers"].get("content-type", "")
    if res["status"] != 200:
        critical.append(f"status {res['status']}")
    if normalize_url(res["final_url"]) != normalize_url(url):
        critical.append(f"redirected to {res['final_url']}")
    if "noindex" in xrobots.lower():
        critical.append("X-Robots-Tag contains noindex")

    title = first_match(r"<title[^>]*>(.*?)</title>", body)
    desc = meta_content("description", body)
    canon = canonical(body)
    if "text/html" in ctype:
        if not title:
            warnings.append("missing title")
        elif not (20 <= len(title) <= 90):
            warnings.append(f"title length {len(title)}")
        if not desc:
            warnings.append("missing meta description")
        elif not (70 <= len(desc) <= 220):
            warnings.append(f"description length {len(desc)}")
        if not re.search(r"<h1[\s>]", body, re.I):
            warnings.append("missing h1")
        if not property_content("og:title", body):
            warnings.append("missing og:title")
        if not property_content("og:description", body):
            warnings.append("missing og:description")
        if not property_content("og:image", body):
            warnings.append("missing og:image")
        if not canon:
            critical.append("missing canonical")
        elif urllib.parse.urlsplit(canon).netloc != expected_host:
            critical.append(f"canonical host mismatch: {canon}")
        for i, block in enumerate(jsonld_blocks(body), start=1):
            try:
                json.loads(block)
            except Exception as exc:
                warnings.append(f"invalid JSON-LD block {i}: {exc}")

    return {
        "url": url,
        "final_url": res["final_url"],
        "status": res["status"],
        "content_type": ctype,
        "title": title,
        "description": desc,
        "canonical": canon,
        "x_robots_tag": xrobots,
        "critical": critical,
        "warnings": warnings,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="https://goodgame.center")
    parser.add_argument("--output", default="reports/seo-crawl.json")
    parser.add_argument("--limit", type=int, default=500)
    args = parser.parse_args()

    base = args.base.rstrip("/")
    host = urllib.parse.urlsplit(base).netloc
    critical = []
    warnings = []

    robots = fetch(f"{base}/robots.txt", accept="text/plain")
    if robots["status"] != 200:
        critical.append(f"robots.txt status {robots['status']}")
    if "Sitemap:" not in robots["body"]:
        critical.append("robots.txt missing Sitemap directive")
    if "Disallow: /admin" not in robots["body"]:
        warnings.append("robots.txt does not explicitly disallow /admin")

    sitemap_index = fetch(f"{base}/sitemap.xml", accept="application/xml,text/xml")
    sitemap_urls = []
    if sitemap_index["status"] != 200:
        critical.append(f"sitemap.xml status {sitemap_index['status']}")
    else:
        try:
          sitemap_urls = xml_locs(sitemap_index["body"], "sitemap")
        except Exception as exc:
          critical.append(f"sitemap.xml parse failed: {exc}")
        if not sitemap_urls:
          critical.append("sitemap.xml has no sitemap index entries")

    sitemap_reports = []
    page_urls = []
    for sitemap_url in sitemap_urls:
        res = fetch(sitemap_url, accept="application/xml,text/xml")
        report = {"url": sitemap_url, "status": res["status"], "url_count": 0, "critical": [], "warnings": []}
        if res["status"] != 200:
            report["critical"].append(f"status {res['status']}")
        else:
            try:
                locs = xml_locs(res["body"], "url")
                report["url_count"] = len(locs)
                page_urls.extend(locs)
            except Exception as exc:
                report["critical"].append(f"parse failed: {exc}")
        sitemap_reports.append(report)

    unique_page_urls = []
    seen = set()
    for url in page_urls:
        if url not in seen:
            seen.add(url)
            unique_page_urls.append(url)
    page_reports = [page_audit(url, host) for url in unique_page_urls[: args.limit]]

    for report in sitemap_reports:
        critical.extend(f"{report['url']}: {msg}" for msg in report["critical"])
        warnings.extend(f"{report['url']}: {msg}" for msg in report["warnings"])
    for report in page_reports:
        critical.extend(f"{report['url']}: {msg}" for msg in report["critical"])
        warnings.extend(f"{report['url']}: {msg}" for msg in report["warnings"])

    out = {
        "base": base,
        "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "summary": {
            "sitemaps": len(sitemap_reports),
            "urls": len(unique_page_urls),
            "checked_urls": len(page_reports),
            "critical_count": len(critical),
            "warning_count": len(warnings),
        },
        "robots": {"status": robots["status"], "has_sitemap": "Sitemap:" in robots["body"]},
        "sitemaps": sitemap_reports,
        "pages": page_reports,
        "critical": critical,
        "warnings": warnings,
    }

    output = pathlib.Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(out, indent=2) + "\n")
    print(json.dumps(out["summary"], indent=2))
    return 1 if critical else 0


if __name__ == "__main__":
    sys.exit(main())
