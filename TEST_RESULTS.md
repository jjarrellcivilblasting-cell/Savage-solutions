# Verification — November 9, 2026

Run against the MVP branch in Node 24.22.1 and Chromium, using fake provider responses only. No deployment and no paid API requests.

- `npm test`: **14 tests passed**, zero failures.
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`: desktop (1280×900), mobile (390×844), and corrupted-storage recovery checks passed.
- `npm audit --omit=dev`: 0 vulnerabilities; production has no external npm dependencies.
- `node --check server.js` and `node --check public/app.js`: passed.
- `git diff --check`: passed before commit.

Browser coverage: invitation sign-in/sign-out; two-turn AI context; failed AI requests preserve the question; new chat; all calculators and their invalid-input regressions; saved estimates and project editing/completion/deletion across reload; JSON export; feedback submission with HTML attack text; URL/back navigation; image validation and reset; input labels; no horizontal overflow at the tested mobile width; no uncaught JavaScript errors or CSP violations. AI and user content render as text, not executable markup. Malformed stored records cannot crash initialization or be silently overwritten.

Backend coverage: static allowlist/private file protection, CSP, unauthenticated rejection, cross-origin rejection, session expiration/logout, login throttling, durable SQLite feedback and SQL injection text, disabled-AI zero-call behavior, model/key isolation, role/size validation, daily request limits across server instances, concurrency cap, sanitized provider errors/exceptions/invalid answers, body/content-type limits, production HTTPS requirement and Secure cookies.

Limitations: no live OpenAI request, deployment, real multi-device sync, community implementation, load test, domain-expert validation, or full assistive-technology certification. Projects/estimates are deliberately browser-local; server feedback persists on the host's disk. Read the release gate in README before launch.
