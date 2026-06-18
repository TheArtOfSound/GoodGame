# GoodGame.center

Production is served by the Cloudflare Worker in `apps/web`. The Worker also
serves the React UI built from `frontend/build` and exposes the `/api/*`
compatibility routes that UI calls.

Useful commands:

```bash
pnpm install --frozen-lockfile
cd frontend && REACT_APP_BACKEND_URL= CI=false npm run build
cd ..
pnpm --filter web run cf-typegen
pnpm --filter web exec tsc --noEmit
pnpm --filter web exec wrangler deploy --dry-run
pnpm --filter web run deploy
```
