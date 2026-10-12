# GoodGame.center

**Play GoodGame:** https://goodgame.center/

## GG First 100

Help 100 independent game creators publish a playable browser game and receive five useful written playtest reviews. [Join the mission](https://goodgame.center/mission), [publish a game](https://goodgame.center/create), or [play Moon Dash](https://goodgame.center/arena) and invite a friend.

GOODGAME (GG) is on Solana mainnet. Exact mint: `5QNJ5DDnTPYW1gfNoxeXBGy85Ws5k5vH5Ass1KWYmoon`.
GG connects to optional direct creator tips through Solana Pay requests and a gold Moon Dash pilot cosmetic. Free play and mission participation do not require buying tokens. Tips go to each creator's opt-in wallet; there is no pooled donation fund, funded grant, promised yield, or guaranteed return.

Progress counts distinct eligible creators whose playable release has five published written reviews (40+ characters) from different active accounts, excluding the creator. It measures accounts, not independently verified people. Official house games are excluded.

[Token facts](https://goodgame.center/gg) · [Official media kit](https://goodgame.center/press) · Community contact: goodgame-center@agentmail.to

Official GoodGame X channel: [@GGcenterhub](https://x.com/GGcenterhub).

Discover free browser games, gaming clips, creators, and communities. The public site is the entry point for playing and exploring; this repository contains the application source and deployment workflow.

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
