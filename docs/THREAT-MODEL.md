# TenantSafe threat model

## Assets and boundary

The prototype protects the integrity and explainability of a local experiment,
not a production account. Inputs are untrusted JSON; output is rendered as text
through HTML escaping. Browser files are not uploaded. The public build has no
server-side secrets or authenticated API. Imported labels and reference hashes
remain assertions from the input, not independently established ground truth.

## Implemented controls

Bounded record counts and input sizes; explicit supported operations; stable
identifiers; escaped output; strict same-origin CSP; local-only preview server;
no arbitrary evaluation, shell execution, or cloud mutation in the public lab.
Domain-specific validation is tested in `tests/engine.test.cjs`.

## Important limitation

All documents are fictional. The public comparator accepts synthetic perspectives; actual server-side identity binding is exercised by the separate local HTTP server.

## Acceptance checks

1. Complete each README walkthrough and export its evidence.
2. Import malformed JSON and unsupported operations; confirm clear failure.
3. Test 390px, 768px, and 1280px; use only the keyboard; zoom to 200%.
4. Confirm all data displayed is synthetic and claims match actual execution.
5. Run any local integration tests before describing server-enforced behavior.

Code-level design review: hierarchy 4/5, distinctiveness 4/5, readability 4/5,
accessibility 4/5, polish 4/5. These judgments do not substitute for browser QA.
