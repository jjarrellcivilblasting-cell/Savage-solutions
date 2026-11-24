# Savage Solutions — free personal beta release gate

Date: 2026-11-24. Planning checklist only; this file does not deploy or enable access.

## Free registered tier (product decision November 24)
- Require individual account registration and login before tools are used; no credit card required. Replace the shared beta invitation key with proper per-user authentication, verification, recovery and deletion before public launch.
- Offer board-foot, Doyle scale, job quote and crew labor calculators for unlimited everyday free use, with explicit units and estimate disclaimers.
- Existing browser-local project and estimate drafts are **not** synced, account-private, or backed up. Warn before shared-device use and provide JSON export. Migrate to account-private durable storage before public launch.
- Keep English/Español interface selection and mobile-friendly navigation.
- Do not imply AI, translation of user text, or public marketplace is live. Keep paid AI disabled unless approved and verified.
- Show a privacy/support contact and accurate terms before inviting public users.

## Safety gates before inviting public users
- Verify live deployment and HTTPS, error behavior, mobile usability and accessibility; test on physical iPhones.
- Keep invitation-key endpoints private; never publish or share the beta invitation key. Remove any implication that the shared key creates personal accounts.
- Leave marketplace and payments off. No employee time records or employer accounts until identity, ownership, recovery, storage and deletion are implemented.
- Verify calculators and browser storage with automated tests and backup/restore checks; establish rollback plan.
- Confirm name and trademark clearance separately; working name does not establish trademark rights.

## Apple path
- Owner decides legal entity and seller name; do not enroll or pay without approval.
- Prepare a genuinely useful native iOS experience, screenshots, privacy details, support URL and review credentials.
- Complete Apple Developer enrollment, signing and TestFlight testing before App Store submission; no submission has occurred.

## Launch status
Not approved for unrestricted public launch. Review this checklist and collect real test results before changing that status.

## Monetization and user experience decisions (November 24)
- Free tier can display a clearly labeled, unobtrusive dashboard advertisement after ad-network approval; never use forced interstitials, deceptive dismiss buttons or ads that interrupt calculations, live translation or safety workflows.
- Premium tier is ad-free. The 30-day trial begins only when the user explicitly activates it, is recorded per verified account and cannot reset on logout or a new device.
- Test a tool-first home screen (search, four shortcuts, recent projects, unobtrusive ad) against category navigation. Track time-to-first-tool, task completion and repeat use; do not assume the winner before testing.
- Collect privacy-conscious account-level analytics for tool usage, conversions and subscription state. Do not record private translation or project contents in analytics by default.
- Proposed prices and enterprise employee plans require separate approval and implementation. No domain purchase, ad integration, payment integration or production release has been completed.

## Next implementation order
1. Implement secure individual registration, login, verification, recovery and deletion.
2. Add durable account-owned project data and migrate/export existing browser-only drafts.
3. Add server-side entitlements and explicitly activated, nonrenewing 30-day Premium trial.
4. Build the tool-first dashboard and privacy-conscious usage events.
5. Evaluate advertising providers, payment requirements and accessibility; test with real users before enabling either.
