# Verification record

Local runtime: Node.js 24.19.0, October 15, 2026 UTC.

- `npm test`: 20/20 passing tests.
- `npm run build`: passed.
- `node --check public/app.js`: passed.
- Every bundled script passed Node's syntax check.

Tests cover domain decisions and invalid inputs, escaped interface output,
accessible control labels, and evidence exports tied to the executed input.
Where included, authenticated HTTP and SCIM tests make real loopback requests.
Tests use independent expected outcomes, not randomly generated scores.

Not verified: live browser rendering at 390/768/1280px, keyboard-in-browser,
LCP/CLS, real identity-provider integration, paid model calls, external PR
publication, or production infrastructure. The supported browser QA capability
was unavailable. Configured CI targets Node.js 22 and 24 but has not run on
GitHub because the new repositories have not been published.

GitHub CI and deployment status are tracked by the publishing platforms. Local
tests alone do not establish successful publication.
