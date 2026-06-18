# Railway deployment

This repo is configured to run on Railway as a Python FastAPI service.

## Railway settings

- Builder: Railpack
- Start command: `cd backend && uvicorn railway_app:app --host 0.0.0.0 --port $PORT`
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

## Current live contract

The Railway entrypoint is `backend/railway_app.py`.

Required live responses:

```text
/healthz     -> 200 JSON
/__version   -> 200 JSON
/            -> 200 JSON
/api/        -> 200 JSON
```

If `/healthz` returns 404, the domain is not serving the latest Railway deployment.
