# Family Legacy Commercial Command

Family Legacy Transportation Business Operating System.

Current development milestone: **V3.7 — Financial Close foundation**

- V3.5 preserves proposed-load estimates as immutable snapshots.
- V3.6 records actual mileage, gallons, fuel price, fuel spend, tolls, expenses, and receipt evidence by Load ID.
- Finance reports estimated-versus-actual cost and mileage variance.
- Actual MPG history follows the truck assigned by the audited dispatch lock.
- V3.7 reconciles POD, itemized invoices, payments, receivable, journal totals, and earned profit by Load ID.
- Invoice drafts separate transportation, approved accessorials, and approved credits/adjustments; confirmation freezes the billing snapshot before finalization.
- Payments receive stable IDs and invoice allocations; partial, paid, and overpaid receivables remain visible, while corrections append linked reversals.
- V3.7 requires an explicit multi-load finance-isolation check before close actions are enabled.

The application is a browser-based prototype that persists its working records in local storage. See `V3.7_FINANCIAL_CLOSE_PLAN.md` for the release contract and `V3.7_FINANCIAL_CLOSE_SMOKE_TEST.md` for verification.

Run `node v37-financial-close.test.js` before updating or merging the V3.7 financial-close module.
