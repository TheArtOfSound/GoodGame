# GoodGame.center SEO Deployment

## Live Routes

- `/robots.txt`
- `/sitemap.xml`
- `/sitemap-index.xml`
- `/sitemaps/static.xml`
- `/sitemaps/games.xml`
- `/sitemaps/creators.xml`
- `/sitemaps/clips.xml`
- `/sitemaps/communities.xml`
- `/sitemaps/tags.xml`
- `/healthz`
- `/__version`
- `/indexnow-key.txt`

## Rules

Sitemaps use canonical `https://goodgame.center` URLs and only include public database rows. Deleted, unpublished, quarantined, private, and thin tag pages are excluded.

Robots allows public pages and render assets, while blocking private/admin/API/raw game runtime surfaces. API JSON, raw UGC, health, and version routes also emit `X-Robots-Tag: noindex`.

## Validation

Run:

```bash
pnpm run seo:crawl
curl -fsS https://goodgame.center/robots.txt
curl -fsS https://goodgame.center/sitemap.xml
curl -fsS https://goodgame.center/sitemaps/static.xml
curl -fsS https://goodgame.center/healthz
curl -fsS https://goodgame.center/__version
```

Submit both sitemap URLs in Google Search Console and Bing Webmaster Tools:

```text
https://goodgame.center/sitemap.xml
https://goodgame.center/sitemap-index.xml
```

The IndexNow key is available at `/indexnow-key.txt`. If `INDEXNOW_KEY` is set as a Worker env var, the dynamic `/<key>.txt` route returns that configured key.
