# Family Legacy Commercial Command

Family Legacy Transportation Business Operating System.

Current development milestone: **V3.7 — Financial Close foundation**

- V3.5 preserves proposed-load estimates as immutable snapshots.
- V3.6 records actual mileage, gallons, fuel price, fuel spend, tolls, expenses, and receipt evidence by Load ID.
- Finance reports estimated-versus-actual cost and mileage variance.
- Actual MPG history follows the truck assigned by the audited dispatch lock.
- V3.7 begins with a read-only reconciliation of POD, invoice, payments, receivable, journal totals, and earned profit by Load ID.
- V3.7 requires an explicit multi-load finance-isolation check before close actions are enabled.

The application is a browser-based prototype that persists its working records in local storage. See `V3.7_FINANCIAL_CLOSE_PLAN.md` for the release contract and `V3.7_FINANCIAL_CLOSE_SMOKE_TEST.md` for verification.
