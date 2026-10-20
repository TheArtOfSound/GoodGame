# GoodGame hosted community bot

This service runs in the existing `goodgame-web` Cloudflare Worker, independently of Codex and the owner's computer. Its hourly cron is separate from the existing four-hour news cron. A dedicated D1 namespace of tables holds public drafts, source links, reservations, publication URLs, run results, and short-lived Telegram deduplication/rate counters.

## What is live versus prepared

The Playtest Club at `/playtest` uses live eligible games and review counts. Existing X and Bluesky links are real. Telegram is shown only after its dedicated configuration exists. Deployment defaults **both publishing and AI to disabled**. A deployed cron is not proof of an active social connection.

Telegram commands `/start`, `/help`, `/play`, `/mission`, `/gg`, `/publish`, `/privacy` use checked product facts and live mission data. They require no inference calls. The guide identifies itself as automated, ignores non-commands and messages directed to other bots, and does not store private message contents or profiles. Update IDs expire after seven days and hashed chat-rate buckets after one day. It sends only requested command replies; it does not approach people privately.

The AI editor selects a checked draft by index. It cannot publish unrestricted model prose, invent partnerships, or execute tools. Candidate invitations rotate real eligible releases and concrete playtest questions. Published posts use first-party project art labeled accurately, with alt text on Bluesky. This is a bounded community editor, not a copy of Codex's full research capabilities. Automatic trend replies, unrestricted browsing, financial actions, paid ads, and bulk outreach are absent.

## Free quota only

No paid provider fallback exists. `COMMUNITY_AI_ENABLED` and `COMMUNITY_AI_FREE_PLAN_VERIFIED` both default to `false`. Do not set the latter on a shared Workers Paid account: Cloudflare's 10,000 free neurons are shared account-wide and excess usage can be billed. A local call counter cannot prevent account-wide overages. Use a provider-enforced Workers Free limit, verify it in billing, and leave AI paused if this cannot be established. Never upgrade, purchase credits, or enable overages for this bot. If the account plan changes, disable AI before that change.

After the hard free limit is established, at most eight selection calls per UTC day are attempted, using `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, bounded input and 60 output tokens. Any inference error pauses AI publishing until the next UTC day. No template publishing bypass is used when AI is paused or exhausted. Deterministic Telegram commands remain available. Local tests mock inference; Wrangler AI bindings can consume real remote quota even during development.

## Owner-controlled connections

1. Create a **new dedicated** bot through verified `@BotFather`. Suggested name: GoodGame Playtest Guide; suggested available username: `GoodGameCenterGuideBot`. Do not reuse or revoke another project's bot. Creation of persistent API access through desktop automation requires the owner's action-time confirmation.
2. Install its newly issued token as the `GG_TELEGRAM_TOKEN` Worker secret with `wrangler secret put GG_TELEGRAM_TOKEN` from `apps/web`. Enter it only at the hidden prompt, never in chat, source code, command arguments, logs, or public Desktop notes. Create a random independent `GG_TELEGRAM_WEBHOOK_SECRET` and install it through `wrangler secret put` too.
3. Check Telegram `getMe` using this **new** token. Verify the bot username, then set `GG_TELEGRAM_USERNAME` in Wrangler vars. Register the webhook with `setWebhook`, URL `https://goodgame.center/api/community-bot/telegram`, `secret_token` equal to the webhook secret, `allowed_updates: ["message"]`, and `max_connections: 1`. The endpoint rejects unauthenticated requests and bounds request bodies.
4. Set the bot's command list to the supported commands above. Keep group privacy enabled. Open the dedicated bot and verify `/play`, `/mission`, `/gg`. Check `getWebhookInfo` for errors. No public Telegram link should be called connected until these checks pass.
5. For scheduled public Telegram posts, create a dedicated owner-controlled public GoodGame channel, add only the new bot with post permission, and pin the official site and exact mint. Configure `GG_TELEGRAM_CHANNEL_ID` and `GG_TELEGRAM_CHANNEL_URL` (exact `https://t.me/<public-channel-username>`). The adapter checks `getChat` before each post. It refuses groups and a mismatched channel URL.
6. For Bluesky, owner-create a dedicated app password on the confirmed `ggcenterhub.bsky.social` account, then install `GG_BLUESKY_APP_PASSWORD` as a Worker secret. The adapter pins the known DID as well as the handle. Never extract browser tokens/passwords. X remains on the owner-operated browser workflow until official user API access is available within the free-only budget; this service does not buy API access or impersonate a browser.

## Handoff without duplicate posting

Before enabling scheduled publishing, import all recent verified owned posts from the existing isolated ledger, inspect both live timelines for missing posts, and resolve pending reservations. The public status endpoint exposes `publishing.channels_owned`; the desktop bot must skip those channels while the hosted coordinator owns them, including during quota pauses. X stays with its existing isolated ledger. Do not enable two dispatchers for the same account.

Set `COMMUNITY_BOT_ENABLED=true` only after credentials, free-limit protection, history import, dispatcher handoff, and a verified controlled publication work. Keep `COMMUNITY_AI_ENABLED=false` until the free-only prerequisite is met. Change these versioned vars in the repository so the normal deployment workflow preserves them. Store secrets only using Wrangler secrets, which are not committed.

The SQL reservation atomically enforces a six-hour gap, four posts per rolling 24 hours, a seven-day topic gap, permanent normalized text deduplication, and one pending post per channel. A publication timeout remains pending. Bluesky uses the reservation UUID as its record key, then reads that exact record to verify text and account. Later crons can reconcile it. Telegram cannot retrieve arbitrary sent channel messages through the Bot API: inspect the channel manually before resolving an uncertain reservation. Never blindly retry it.

## Deployment and checks

Run the existing CI plus `node --test scripts/community-bot.test.mjs`. Build the frontend, typecheck, and run `wrangler deploy --dry-run`. Production CI applies **only** additive `migrations/0013_community_bot.sql` with `CREATE TABLE/INDEX IF NOT EXISTS` before deployment. Never replay every old migration: some historical migrations intentionally cleared old seed catalogs.

Public: `/api/community-bot/status`. Private operational drafts, source links, pending posts and run results: `/api/admin/community-bot` with the site's existing admin session. It exposes no credentials. A site admin cookie does not grant cloud secret access. No public run-now, credential setter, or reservation-clearing API exists.

Sources: [Telegram Bot API](https://core.telegram.org/bots/api), [Cloudflare AI pricing and hard free limits](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/), [AT Protocol repository records](https://atproto.com/specs/repository).
