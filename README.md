# Family Legacy Commercial Command

Family Legacy Transportation Business Operating System.

Current development milestone: **V3.8 — Operational Integrity**

Completed foundation:

- V3.5 preserves proposed-load estimates as immutable snapshots.
- V3.6 records actual mileage, gallons, fuel price, fuel spend, tolls, expenses, receipt evidence, and estimate-versus-actual variance by Load ID.
- V3.7 Financial Close is complete through protected load closing, controlled correction/re-close, receipt protection, itemized invoices, payments/receivables, double-entry journal posting, and finance isolation by Load ID.

Current V3.8 focus:

- driver / truck / trailer assignment integrity
- assignment-change reasons and audit history
- weight and equipment-fit checks before dispatch
- transportation-type document and compliance gates
- screen-by-screen auto-populate verification so known data is never re-entered unnecessarily
- owner-operator and 1–3 driver usability

The application is still a browser-based prototype that persists working records in local storage. V4.0 will add authentication, database persistence, tenant isolation, durable document storage, backups, and production audit infrastructure.

Reference documents:

- `FLT_MARKET_LEADING_SYSTEM_BLUEPRINT.md` — overall product blueprint and build gates
- `V3.7_FINANCIAL_CLOSE_PLAN.md` — completed V3.7 release contract
- `V3.7_FINANCIAL_CLOSE_SMOKE_TEST.md` — V3.7 verification checklist
- `V3.8_OPERATIONAL_INTEGRITY_PLAN.md` — current V3.8 release contract
- `FLT_CARRY_FORWARD_REQUIREMENTS.md` — prior requirements that must remain tracked through V3.8 and V4.0

Core product rule: **Enter once. Calculate once. Auto-populate everywhere. Verify before records become final.**

## Proposed-load navigation verification

Dashboard **Continue to Evaluate Proposed Load** routes once through the existing
gated navigation button. The Evaluate Proposed Load heading and saved
driver/truck/trailer selection precede Fast Load inputs. NEXT guidance highlights
unfinished fields without automatically focusing or scrolling to them; explicit
validation on submission still guides the operator to invalid inputs.

Run `node v38-full-regression.test.js` for the automated regression suite, including
[the proposed-load navigation regression](./v38-proposed-load-navigation.test.js).
For browser verification, use a separate test origin with saved, verified setup
and fleet records:

1. Reload Dashboard and click **Continue to Evaluate Proposed Load**.
2. Confirm the heading and saved rig section are at the top, and stay there after
   delayed guidance updates finish.
3. Complete the source, source name, and ZIP inputs; confirm NEXT advances without
   stealing focus. Return to Dashboard and repeat, including after another reload.
4. Confirm saved setup, fleet, estimates, customer records, and recurring
   assumptions remain unchanged.

## PR #66 browser acceptance corrections

- Dispatch Control has its own dynamically loaded navigation handler, like the
  other module-owned screens. It refreshes open loads on entry and evaluates the
  same proposed combination for weight and compliance before creating a first
  dispatch lock; all document and safety gates still apply.
- Dashboard utilization and its caption use active assignments to verified
  trucks; financially closed loads do not consume active capacity.
- Dashboard invoice readiness distinguishes drafts awaiting load-specific
  delivery proof, drafts ready to finalize, and finalized invoices.
- Shared financial/reset modals fit the current viewport height and scroll
  internally, keeping Save and Cancel reachable on short screens.
- Pickup/delivery canvas drafts survive viewport resize without reverting to
  saved signatures. Clearing or resizing a draft does not rewrite saved proof.
- Receipt file selection is pinned to the original Load ID and expense, not a
  mutable row index. Changing loads or removing the expense requires selecting
  the target again; new receipt metadata includes Load ID and expense ID.
- Dispatch evidence selection rejects a stale panel after its selected load
  changes, matching the pickup/delivery evidence guard.
- Rendering the Test Gate never attaches shipping documents as fuel receipts or
  repairs saved financial evidence. Attach actual expense receipts explicitly;
  existing receipts, historical trip snapshots, and closed records are preserved.
  Previously auto-linked shipping evidence requires operator review, not an
  automatic rewrite; closed loads still require protected correction.

Run `node v38-full-regression.test.js`, including
[browser acceptance regressions](./v38-browser-acceptance-regression.test.js).
Use only a disposable browser origin/profile to test navigation, receipt
classification, invoice readiness, and reload persistence. Original saved-record
and authentic-document verification remain manual acceptance requirements.

### Evidence storage and release limits

V3.8 shipping documents and expense receipts store **attachment metadata, not
file contents**. Keep the original BOL, POD, photographs, and receipts outside
FLT. A document-integrity PASS verifies required metadata, classification,
Load-ID/stage associations, and saved signature fields; it does not establish
document authenticity, legibility, or retrievable file storage. Canvas signatures
are saved separately in browser load records. Downloading a POD summary is not
a stored package of the original attachments.

Durable object storage, hashes, backups, and document-package generation are
explicit V4.0 work in [the V3.8 plan](./V3.8_OPERATIONAL_INTEGRITY_PLAN.md) and
[carry-forward requirements](./FLT_CARRY_FORWARD_REQUIREMENTS.md), not implemented
or implied by the prototype's Attached/PASS labels. If retrievable original files
are required for deployment, that deployment remains blocked pending that work.

Passing automated tests or a disposable load's COMPLETE gate does not constitute
full V3.8 acceptance. Owner verification of original historical records,
authentic evidence, required release smoke checks, and physical mobile/tablet
keyboard/touch behavior remain manual acceptance requirements. Do not clear
original storage to perform them.
