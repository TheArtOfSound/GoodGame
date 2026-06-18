# GoodGame.center end-to-end tests

This Playwright suite covers the full user journey on a running instance.

## What it covers

1. Sign up a fresh creator A via `/onboarding`.
2. Upload a synthetic browser-game zip (`index.html`) via `/create`.
3. Upload a PNG thumbnail in the creator console.
4. Verify the game is publicly playable at `/games/<slug>`.
5. Upload a tiny MP4 clip via `/clips`.
6. Sign up creator B, visit A's profile, **Follow** A, verify follower count.
7. Create a community as A, post in it, have B join, then **ban** and **unban** B from `/communities/<slug>/moderate`.

## Running

```bash
cd /app/tests/playwright
yarn install --silent
# Make sure the app is running at $PLAYWRIGHT_BASE_URL (defaults to http://localhost:3000)
PLAYWRIGHT_BASE_URL=https://your-deploy.example.com yarn test
```

The config uses the system Chrome at `/usr/bin/google-chrome` so it doesn't
need to download browsers. Switch to default Playwright browsers by removing
`launchOptions.executablePath` in `playwright.config.mjs` and running
`npx playwright install chromium`.

## Fixtures

- `fixtures.b64` is a base64-encoded ~7KB MP4 (1 second, 64x36, black frame).
- The PNG thumbnail and game zip are generated at runtime in the OS temp dir.
