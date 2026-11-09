# Savage Solutions MVP

Private beta built from the original single-file app. Node 24+ with a persistent writable disk is required. **No deployment has been performed. Paid AI calls are off by default.**

## Run locally

1. Copy `.env.example` to `.env` (gitignored).
2. Set `BETA_ACCESS_KEY` to a random secret of at least 24 characters; generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Share only with invited testers, never commit it. Do not reuse your GitHub password.
3. Run `npm start`, then open `http://localhost:3000`. No runtime npm dependencies or build step are required.
4. Sign in with the invitation key. Calculators and browser-local projects work without sign-in. AI stays unavailable until explicitly enabled.

Use the exact `APP_ORIGIN` URL in your browser; it is the allowlist for write requests. The server binds to loopback by default. Keep `.env`, database files, and exports private.

## AI setup — only after spending approval

Set `AI_ENABLED=true`, `OPENAI_API_KEY`, and `OPENAI_MODEL` in the server environment, then restart. The implementation calls OpenAI's Chat Completions API from the server; the browser never receives the key. The model must support `max_completion_tokens`. No live provider call has been made or verified during implementation.

Controls: invitation authentication, 8-hour HttpOnly/SameSite session, exact Origin checks, 32 KB request bodies, alternating role validation, maximum 12 messages / 16,000 input characters, 800 output tokens, 25-second timeout, no automatic retries, two concurrent provider calls, 10 chat requests per minute per direct peer, and a persistent global UTC daily request cap (default 20). Failed provider calls consume a reservation. The cap is a request cap, **not a dollar budget**; configure provider-side project spending controls before enabling. Model prices can change. Do not enable until paid API use is approved.

The assistant provides planning estimates, not certified engineering or hazardous-work instructions. Chat is held in page memory, submitted to the provider for answers, and cleared on refresh/sign-out/new chat. The app does not store chat in its database. `store:false` is sent to OpenAI; provider retention remains subject to your provider account terms. Recent complete exchanges are retained within the context limits; the visual transcript may include older messages outside that context.

## Features and storage

- Board feet, Doyle log scale (small-end inside-bark diameter), gross-margin job quoting, and crew labor with range/integer validation. Dollars are USD; dimensions use the displayed imperial units. Quotes exclude taxes/overhead unless entered in equipment/other.
- Multi-turn AI conversation with loading/error/retry states and plain-text rendering.
- Projects: create, edit, complete/reopen, delete; quotes: calculate, save, delete. These records use **this browser's localStorage**, persist after sign-out, and are not account-private or synced across devices. Use a private browser profile on shared machines. Export JSON backups before clearing browser storage. Backup import is not included in this beta.
- Feedback: authenticated, validated, rate-limited and persisted in `DATA_DIR/savage.sqlite` (SQLite). Success is shown only after insertion. There is no public feedback listing.
- Community posting / professional directory are explicitly deferred and marked unavailable.
- Image uploads stay in browser memory, restricted to JPEG/PNG/WebP, 5 MB and 20 MP; no image is sent to the server. Background resets on reload.

Operator feedback export (run locally on the server, redirect to a private file):

```sh
node --env-file-if-exists=.env scripts/export-feedback.js > feedback-private.json
```

Feedback can contain personal information. Restrict exported file access, define a retention period, and delete records when no longer needed. Do not commit exports. Back up SQLite with its online backup API (`node:sqlite` `backup`) or stop the server before copying the database and WAL files together. Do not copy a live main DB alone. Sessions and per-peer rate counters are memory-only and reset on restart; feedback and daily AI request reservations persist.

## Tests — no paid API calls

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
# Or use an existing browser:
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

Backend tests inject a fake fetch implementation; browser tests start a local backend with the same mock and block all browser requests outside localhost. Tests never use a real API key or the live provider. Browser checks run at 1280×900 and 390×844, saving screenshots to ignored `test-results/`. See `TEST_RESULTS.md` for the implementation run.

## Release gate for November 16, 2026

This branch is prepared for an invite-only beta, not an unrestricted community launch. Before deploying, obtain deployment approval, choose the host/domain and persistent disk, configure an HTTPS reverse proxy, set `NODE_ENV=production` and an exact HTTPS `APP_ORIGIN`, inject secrets through host settings, and verify the deployed root/API/cookie behavior. GitHub Pages alone cannot run this backend. Serve through the Node server so the allowlisted static routes and security headers apply; never expose the repository or data directory as a static root.

Run one server process/instance with SQLite on local disk. Do not horizontally scale this design without shared sessions, a shared rate limiter and a production database. Proxy headers are deliberately ignored; behind a proxy the conservative per-peer limits can apply to all users together. The invitation key grants beta access, not individual accounts. For public signup, add individual identity, recovery, authorization, moderation, abuse controls and deletion workflows before expanding scope.

Before enabling AI, obtain paid-use approval and run an approved live smoke test; mocked tests do not establish provider-account availability or answer quality. Review real outputs with domain experts. Before launch, complete tester acceptance on actual phones, keyboard/screen-reader checks, privacy/retention notices, backup/restore and rollback rehearsal. Keep `AI_ENABLED=false` if provider approval or validation is outstanding.
