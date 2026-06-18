# Railway deployment

This repo is configured to run on Railway as a Node service.

## Railway settings

- Builder: Dockerfile
- Dockerfile path: `Dockerfile`
- Start command: `npm start`
- Healthcheck path: `/healthz`
- Version endpoint: `/__version`

These settings are in `railway.json`.

## Verify after deploy

```bash
curl -fsS https://goodgame.center/healthz
curl -fsS https://goodgame.center/__version
curl -I https://goodgame.center/
```

## Domain

Attach these domains in Railway:

```text
goodgame.center
www.goodgame.center
```

Then add the DNS records Railway gives you at the DNS provider.

## Content behavior

The server serves static files if present, then falls back to rendering `README.md`:

1. `public/index.html`
2. `dist/index.html`
3. `build/index.html`
4. root `index.html`
5. `README.md`

This keeps the repo deployable even when it only has README content.
