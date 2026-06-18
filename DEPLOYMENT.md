# GoodGame.center — Deployment runbook (Vercel + Railway + Cloudflare DNS)

This repo is set up to deploy as **two services**:

- **Frontend** (React) on **Vercel**
- **Backend** (FastAPI) on **Railway**
- **MongoDB**: Railway plugin OR MongoDB Atlas (free tier is fine to start)
- **Object storage**: Emergent managed object storage (uses `EMERGENT_LLM_KEY`)
- **DNS**: Cloudflare (where `goodgame.center` already lives)

The Emergent agent has set up the config files. The remaining work is **clicking through the dashboards and pasting env vars** — none of which the agent can do from inside this run.

---

## 1. Push this repo to GitHub

In the Emergent UI: **Save to GitHub** → push to `TheArtOfSound/GoodGame`, branch `main`.

The newly added files at the repo root are:

- `vercel.json` — Vercel build/output/SPA-rewrites config
- `.vercelignore` — keeps `backend/`, `tests/`, etc. out of the Vercel bundle
- `railway.json` — Railway service config
- `nixpacks.toml` — Python 3.11 build for the backend
- `Procfile` — alternate start command (Railway will pick whichever it finds)

Plus the existing app code in `backend/` and `frontend/`.

> ⚠️ Delete `.github/workflows/deploy.yml` from your repo if you don't want the failing Cloudflare workflow to keep firing on every push. (Or rename it `deploy.yml.disabled`.) Vercel and Railway deploy on their own; you don't need a GitHub Actions workflow.

---

## 2. MongoDB

Pick one:

**A. MongoDB Atlas (recommended)**
1. Create a free M0 cluster at <https://www.mongodb.com/atlas>.
2. Create a database user + IP allowlist (`0.0.0.0/0` is fine for Railway).
3. Copy the SRV connection string:
   `mongodb+srv://USER:PASS@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority`
4. Note the connection string — you'll paste it into Railway as `MONGO_URL`.

**B. Railway MongoDB plugin**
- In your Railway project: **+ New → Database → MongoDB**.
- Railway exposes `MONGO_URL` to the backend service automatically once you link them.

---

## 3. Backend on Railway

1. Go to <https://railway.app>, sign in with GitHub.
2. **+ New Project → Deploy from GitHub repo → `TheArtOfSound/GoodGame`**.
3. Railway will detect Python via `nixpacks.toml`. It builds `backend/` and starts:
   `uvicorn server:app --host 0.0.0.0 --port $PORT`.
4. In **Variables**, set:

   | Name | Value |
   |---|---|
   | `MONGO_URL` | from step 2 |
   | `DB_NAME` | `goodgame` (or any name) |
   | `EMERGENT_LLM_KEY` | the same key from `backend/.env` here (`sk-emergent-...`) |
   | `APP_NAME` | `goodgame` |
   | `CORS_ORIGINS` | leave **empty** for now (the backend will reflect any HTTPS origin). Tighten to `https://goodgame.center,https://www.goodgame.center` after DNS is live. |

5. **Settings → Networking → Generate Domain.** Railway gives you something like `https://goodgame-backend.up.railway.app`. Copy this; you need it for Vercel.

6. Sanity check:
   ```bash
   curl https://goodgame-backend.up.railway.app/api/__version
   # { "ok": true, "service": "goodgame-web", ... }
   ```

7. (Optional, recommended for clean cookies) Add a **custom domain** `api.goodgame.center` to the Railway service in **Settings → Networking → Custom Domain**. Railway will give you a CNAME target — add it in Cloudflare DNS.

---

## 4. Frontend on Vercel

1. Go to <https://vercel.com>, sign in with GitHub.
2. **Add New → Project → Import `TheArtOfSound/GoodGame`**.
3. **Framework Preset**: leave as "Other" — `vercel.json` at the repo root handles everything.
4. **Environment Variables**:

   | Name | Value |
   |---|---|
   | `REACT_APP_BACKEND_URL` | the Railway URL from step 3.5 (e.g. `https://goodgame-backend.up.railway.app` or `https://api.goodgame.center`) — **no trailing slash** |

5. **Deploy**. After it builds, Vercel gives you `https://goodgame-xyz.vercel.app`. Open it. Onboarding / login / game upload should all work against the Railway backend.

---

## 5. Point goodgame.center at Vercel

1. In Vercel **Settings → Domains → Add** → `goodgame.center` (and add `www.goodgame.center` as a redirect).
2. Vercel will show DNS records to add. In Cloudflare DNS:
   - Replace any existing A/CNAME records for `@` and `www` with the ones Vercel shows.
   - Set the proxy status to **DNS only** (gray cloud) initially so Vercel can issue the cert; you can flip to proxied after.
3. Wait 1–10 minutes for SSL.
4. Confirm:
   ```bash
   curl -I https://goodgame.center
   curl -I https://www.goodgame.center
   curl -s https://goodgame.center/   # should serve the React app
   ```

---

## 6. Lock down CORS

Once everything is live and verified:

1. In Railway **Variables**, set `CORS_ORIGINS=https://goodgame.center,https://www.goodgame.center`.
2. Redeploy the backend. Now only your real domains can talk to the API with credentials.

---

## 7. Re-run the e2e suite against the live site

```bash
cd tests/playwright
yarn install --silent
PLAYWRIGHT_BASE_URL=https://goodgame.center yarn test
```

All steps (signup → upload game → thumbnail → clip → follow → community moderate) should pass against production.

---

## Common gotchas

- **Login works locally but not on Vercel** → check `REACT_APP_BACKEND_URL` is correct in Vercel (no trailing slash) and check the cookie is being set: open DevTools → Application → Cookies → look for `gg_session`. If it's missing, your backend domain is probably HTTP (it must be HTTPS for `SameSite=None`).
- **CORS errors in browser** → either your Vercel origin isn't whitelisted in `CORS_ORIGINS` (leave it empty during initial setup), or you set `CORS_ORIGINS=*` which is invalid with `credentials=true`.
- **Game iframe shows blank** → ensure `EMERGENT_LLM_KEY` is set in Railway (the storage layer needs it) and that R2/object-storage requests are succeeding (`curl https://api.your-domain/api/games/<slug>` should include an `upload_entry`).
- **Auto-spin-down on Railway free tier** → upgrade plan or use UptimeRobot to ping `/api/__version` every 5 min.
