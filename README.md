# GoodGame.center

Production is served by the Cloudflare Worker in `apps/web`.

Useful commands:

```bash
pnpm install --frozen-lockfile
pnpm --filter web exec tsc --noEmit
pnpm --filter web exec wrangler deploy --dry-run
pnpm --filter web run deploy
```
