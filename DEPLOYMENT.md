# GoodGame.center Deployment

Production is served by one Cloudflare Worker:

- Worker: `goodgame-web`
- Source: `apps/web`
- Static UI: `frontend/build`, generated from the React app in `frontend`
- Public routes: `goodgame.center/*` and `www.goodgame.center/*`
- Health: `/healthz`
- Version: `/__version` and `/api/__version`

## Local Verification

```bash
pnpm install --frozen-lockfile
cd frontend && REACT_APP_BACKEND_URL= CI=false npm run build
cd ..
pnpm --filter web run cf-typegen
pnpm --filter web exec tsc --noEmit
pnpm --filter web exec wrangler deploy --dry-run
```

## Deploy

GitHub Actions builds the React app, typechecks the Worker, and deploys with Wrangler.
Manual deploys use the same Worker:

```bash
SHA=$(git rev-parse HEAD)
BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
pnpm --filter web exec wrangler deploy \
  --var BUILD_SHA:$SHA \
  --var BUILD_REF:main \
  --var BUILD_TIME:$BUILD_TIME
```

## Domain Notes

The apex domain currently reaches Cloudflare and is handled by the Worker route.
The `www` route is configured in Wrangler, but DNS must point `www.goodgame.center`
through Cloudflare for that route to execute.
