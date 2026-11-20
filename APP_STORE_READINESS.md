# Savage Solutions — iOS App Store readiness plan
Status: PREPARATION ONLY (November 20, 2026). No native iOS build, TestFlight release, App Store submission, or review approval has occurred.

## Product identity
- Working app name: **Savage Solutions**. “Savage Tech” appears as a feature/tagline brand; owner must confirm the final seller and app name.
- Working tagline: **Let Savage Tech help solve your lack-of-work problem.**
- Draft subtitle (subject to App Store length and availability checks): **Contractor Tools & Job Leads**
- Draft short description: Contractor estimates, trade calculators, private project drafts and access to public bid sources in one mobile workspace.
- Do not advertise AI answers, a public marketplace, real-time loads, or in-app job awards as active until independently verified in the shipping app.

## Existing beta product
- Node backend with invitation-key beta authentication, estimates, in-browser projects and feedback.
- 20+ trade categories, independent formulas for general and hardscaping estimates on the development branch.
- Find Work directory links to official public solicitations and provider-described free freight sources. **These are outgoing links, not a licensed live listing feed.**
- Customer job submissions, bid-interest and reporting APIs are behind `MARKETPLACE_ENABLED=true` and a separate persistent-storage confirmation. All new jobs start *pending*. No automatic public posting or live payments.
- Current Render free service has no confirmed persistent disk. **Do not enable the marketplace on ephemeral storage.**

## Before public marketplace and App Store review
1. Replace shared invitation key with individual accounts, secure recovery, access controls, account deletion, and distinct customer/contractor profiles.
2. Add job ownership, customer inbox, contractor profiles, request-for-quote and bid workflows; verify credentials, licenses and insurance as applicable. Do not call any user “verified” until checked.
3. Deploy durable database, backups, retention, deletion requests, monitoring, spam/fraud detection and operator moderation dashboard. Prevent scraping or unauthorized disclosure of private contacts.
4. Add publishing filters, in-app report, block abusive users, published moderator support contact and a timely review process. Current report endpoint and operator CLI are not a substitute for these release requirements.
5. Publish accurate Privacy Policy and Terms, with contact, data categories, deletion/retention, external sources, and AI-provider disclosures; add App Store privacy nutrition labels from actual data flows.
6. Make an actual native iOS build and provide meaningful app functionality, not merely a website wrapped in a WebView. Candidate native value: offline calculators, draft sharing, secure document/photo capture, bid-deadline notifications and relevant iOS accessibility features.
7. Test on physical iPhones (small and large layouts), VoiceOver, dynamic type, portrait/landscape support where enabled, poor connectivity, account/logout/deletion, and date/currency input.
8. Set up Apple Developer Program enrollment (currently US $99/year), App Store Connect, a unique bundle identifier, signing, certificates, version/build numbers, TestFlight, app icon, screenshots, description, support URL, privacy URL, review demo account and release notes.
9. Decide subscription pricing and payment rails only after app functionality is scoped. Review Apple's in-app purchase requirements for digital subscriptions separately from payment for real-world contractor services.
10. Verify all live AI calls with an approved spend limit. Existing implementation uses protected mock tests; paid AI calls remain disabled unless explicitly approved.

## Candidate review metadata (draft, not submitted)
App name: Savage Solutions
Subtitle: Contractor Tools & Job Leads
Category: Business
Keywords: contractor, estimate, bid, hardscape, landscaping, construction, project, freight
Description:
"Savage Solutions helps builders, tradespeople and project owners stay organized. Estimate common job quantities, build preliminary quotes, save project drafts, and find links to construction bid opportunities. The Find Work center supports many trades, including landscaping, hardscaping, excavation, concrete and freight. All estimates must be verified for site conditions and applicable professional requirements."
Age rating, privacy answers, support email, seller legal name and merchant disclosures: NOT FINALIZED.

## Release gates
- **Current live website:** https://savage-solutions.onrender.com (verify behavior after each deployment).
- **Development branch:** feature/find-work-marketplace-appstore; do not deploy without passing automated and physical-device tests.
- **Market beta:** require reliable persistence and active moderation; keep disabled otherwise.
- **App Store:** requires Apple Developer enrollment and a signed native binary, actual account/privacy and user-generated-content protections.

Apple official review guidance: https://developer.apple.com/app-store/review/guidelines/
Developer enrollment: https://developer.apple.com/programs/
