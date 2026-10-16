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
