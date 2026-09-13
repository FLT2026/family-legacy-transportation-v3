# GitHub Copilot instructions for Family Legacy Commercial Command

## Product summary

Family Legacy Commercial Command is a browser-based transportation operating system prototype for owner-operators and very small fleets. It turns a single Load ID into a complete operational and financial record from load decision through dispatch, pickup, delivery, POD, invoicing, payments, ledger posting, actual-trip costing, and financial close.

The product contract in this repository is:

- Preserve approved V3.5, V3.6, and V3.7 behavior.
- Do not interfere with the active V3.8 Operational Integrity workstream, which is currently tracked separately as PR #37.
- Keep the system simple for owner-operators and fleets with 1–3 drivers.
- Keep one focused task per pull request.
- Never merge a pull request automatically.

## Repository shape

This repository is a static browser app with no package manager metadata and no backend service.

- `index.html` — primary application shell, V3.5 UI, embedded load-decision logic, and top-level navigation.
- `fleet-module.js` — ordered script loader for the milestone modules.
- `zip-autofill.js` — ZIP-to-city/state helper for Business Setup.
- `v36-date-utils.js` — shared date validation helpers.
- `fleet-core.js` — Drivers & Equipment view, trip-lock enforcement, and dispatch audit trail.
- `v35-guided-workflow.js` — guided workflow / readiness behavior.
- `v35-fleet-master.js` — protected editing and cancellation of driver/truck/trailer master records.
- `v35-proposed-load.js` — proposed-load economics, dispatch checks, and V3.5 gate logic.
- `v35-data-controls.js` — protected export/restore/reset controls for local test data.
- `v36-actual-trip.js` — actual-trip snapshots, variance review, MPG history, and V3.6 gate.
- `v37-itemized-invoice.js` — invoice draft/finalize/print lifecycle with frozen billing snapshots.
- `v37-payments-receivables.js` — payment IDs, allocations, receivable state, and linked reversals.
- `v37-double-entry-ledger.js` — immutable per-load journal posting plus expense/receipt protection.
- `v37-financial-close.js` — financial-close eligibility, immutable close snapshots, and correction workflow.
- `*.test.js` — Node-based regression tests for the V3.7 modules.
- `README.md`, `FLT_MARKET_LEADING_SYSTEM_BLUEPRINT.md`, `V3.5_COMPLETION_SMOKE_TEST.md`, `V3.6_ACTUAL_TRIP_SMOKE_TEST.md`, and `V3.7_FINANCIAL_CLOSE_SMOKE_TEST.md` — release contract and manual verification references.

## Environment and commands

## Installation

There is no repo-specific install step in the current branch.

Required tools already expected by this repo:

- Node.js for the existing `*.test.js` files
- Python 3 (or another simple static file server) for local browser serving

## Startup

Serve the repository root and open `index.html` in a browser:

```bash
# from the repository root
python3 -m http.server 5500
```

Then open:

- `http://127.0.0.1:5500/index.html`

If port 5500 is unavailable locally, use another open port and update the browser URL to match.

## Build

There is no build step in the current branch.

## Lint

There is no lint command or lint configuration in the current branch.

## Tests

Run the existing automated V3.7 regressions from the repository root:

```bash
# from the repository root
node v37-itemized-invoice.test.js
node v37-payments-receivables.test.js
node v37-double-entry-ledger.test.js
node v37-financial-close.test.js
```

Manual browser gates also exist and remain part of the release contract:

- `V3.5_COMPLETION_SMOKE_TEST.md`
- `V3.6_ACTUAL_TRIP_SMOKE_TEST.md`
- `V3.7_FINANCIAL_CLOSE_SMOKE_TEST.md`

## Existing test gates that must pass

Do not ship changes that break any approved V3.5–V3.7 behavior. Run every applicable gate for the area you touched, keep passing gates green, and do not hide or bypass a known baseline failure.

### Automated V3.7 regression gates

- `v37-itemized-invoice.test.js`
- `v37-payments-receivables.test.js`
- `v37-double-entry-ledger.test.js`
- `v37-financial-close.test.js`

### Manual acceptance gates

- V3.5 Accurate Proposed Load smoke test
- V3.6 Actual Trip Cost smoke test
- V3.7 Financial Close Foundation smoke test
- In-app gates such as the V3.5 gate, Fleet & Dispatch Gate, V3.6 gate, and V3.7 Financial Close Gate

### Current baseline verification note

During this task:

- `node v37-itemized-invoice.test.js` passed
- `node v37-payments-receivables.test.js` passed
- `node v37-financial-close.test.js` passed
- `node v37-double-entry-ledger.test.js` passed

Keep all four regression gates green and avoid introducing regressions to approved V3.5–V3.7 behavior.

## Data and workflow protections that must not be broken

### Closed loads

- A financially closed load is locked.
- Closed loads require a protected correction workflow before financial edits.
- Reclosing must re-pass all financial gates.
- Closed financial snapshots must remain unchanged after close unless a protected correction is opened and reclosed.

### Payments and reversals

- Payments require a finalized invoice.
- Payments must keep stable IDs and invoice allocations tied to the same Load ID.
- Partial, paid, and overpaid receivable states must stay visible.
- Reversals must append linked negative records; they must not delete the original payment.
- Reversals require a reason and confirmation.
- Closed loads must block new payments and payment reversals unless a protected correction flow explicitly allows the work.

### Expenses and receipts

- Expenses and receipt evidence are load-specific and must not leak across loads.
- Closed loads must block new expenses and receipt changes.
- Receipt edits on protected corrections must not create accounting drift or duplicate journal entries.

### Audit trails and immutable history

- Dispatch lock events, blocked dispatch attempts, authorized assignment changes, master-record updates, master-record cancellations, and financial correction history must remain auditable.
- Destructive or corrective actions must keep the original record and append audit history rather than silently rewriting history.
- Confirmed financial source records must post once to the immutable journal and remain source-linked.

### Verified driver / truck / trailer records

- Dispatch must stay blocked unless the selected driver, truck, and trailer are active / verified.
- Verified drivers require current license state and expiration data.
- Verified trucks require VIN, weight basis, verification date, GVWR, GCWR, empty weight, GAWR, tire capacities, and hitch rating, with ratings that remain internally valid.
- Verified trailers require VIN, weight basis, verification date, GVWR, empty weight, axle capacity, tire capacity, and hitch/coupler rating, with ratings that remain internally valid.
- Blocked dispatch attempts must preserve the exact failure reasons in the audit trail.
- Locked assignments require an authorized, audited change reason.

## Pull request operating rules

- Keep each PR limited to one focused task.
- Preserve all approved V3.7 behavior.
- Do not mix unrelated V3.8 operational-integrity work into another PR.
- Do not modify application code, dependencies, configuration, tests, or stored data unless the assigned task explicitly requires it.
- Do not auto-merge PRs.
