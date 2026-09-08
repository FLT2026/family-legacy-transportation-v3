# FLT Commercial Command — Carry-Forward Requirements

This checklist preserves prior product decisions that must not be lost while moving from V3.7 Financial Close into V3.8 Operational Integrity and V4.0 Production Foundation.

## Confirmed present in the prototype

- Planned versus Active / Verified driver, truck, and trailer records.
- Authorized change reasons for saved master records.
- Cancellation reasons and audit retention for fleet master records.
- My Regular Rig for owner-operator driver/truck/trailer selection.
- Dispatch assignment lock tied to a Load ID.
- Guided workflow that reuses saved business, fleet, and load data.
- V3.5 Accurate Proposed Load foundation.
- V3.6 Actual Trip cost and variance foundation.
- V3.7 itemized invoice, payments/receivables, immutable double-entry ledger, protected financial close, controlled correction/re-close, and closed-load receipt protection.

## V3.8 Operational Integrity — verify or complete

### Assignment lifecycle
- Explicit assignment reason when assigning or changing a load assignment.
- Planned, verified, locked, cancelled, and corrected states are unambiguous.
- Changing/cancelling an assignment requires a reason and audit entry.
- Verified assignment remains attached to the Load ID unless changed through an authorized correction.
- My Regular Rig preselects but never bypasses eligibility/compliance checks.

### Weight and equipment fit
- Selected truck/trailer ratings and verified scale data auto-populate the load check.
- Cargo weight, dimensions, deck space, hitch/coupler, axle/tire limits, payload, towing/GCWR, and transportation-type rules are checked before dispatch.
- DO NOT DISPATCH reasons are explicit and auditable.

### Documents and compliance
- Required evidence varies by transportation type and operation classification.
- Pickup and delivery documents remain tied to the Load ID.
- Missing required documents, signatures, or photographs block the appropriate workflow step.
- Uploaded/photographed documents can be categorized and reused without re-entry.

### Auto-populate audit
- Review Dashboard and every menu/view field-by-field.
- Known Business Setup, Fleet, Proposed Load, Actual Trip, Pickup, Delivery, Finance, and Load-ID data auto-populates downstream where authorized.
- Do not duplicate customer, driver, truck, trailer, route, mileage, revenue, expense, invoice, or payment entry.
- Estimated and actual values remain separate.

### Small-fleet usability
- Default workflow is optimized for owner-operators and 1–3 driver companies.
- Common actions remain fast and mobile-friendly.
- Irrelevant modules/fields are hidden rather than forcing enterprise complexity on small fleets.

## Carry-forward implementation decisions

- Reusable Vendor / Payee list across expenses and financial records.
- Tax recognition rules: what FLT records, when recognized, and whether it affects load profit, liabilities, or reporting only.
- Link fuel, driver pay, tolls, maintenance, and other expenses to data already captured elsewhere.
- Receipt/document classification with human confirmation of any automatic recommendation.
- Controlled PDF generation/combination for pickup and delivery document packages when persistent storage is available.
- Persistent receipt/document hashes and immutable document audit events in V4.0 unless intentionally pulled forward.

## V4.0 Production Foundation carry-forward

- Authentication and role-based access.
- Multi-tenant database and tenant isolation.
- Persistent object storage for documents, images, signatures, BOLs, PODs, receipts, and invoices.
- Backups and migration from browser/localStorage prototype data.
- Immutable audit log and field-level permissions.
- Offline-safe draft queue and conflict handling.
- Document/receipt hashes.

## Non-negotiable product rules

- Enter once. Calculate once. Auto-populate everywhere.
- One immutable Load ID connects the complete transaction.
- Estimated and actual values remain separate.
- AI may recommend or prefill but may not silently change an auditable record.
- Protected/destructive changes require confirmation and audit history.
- FLT's core Load → Profit transaction must work without requiring an outside bookkeeping, mileage, invoicing, receivables, or load-profit application.
