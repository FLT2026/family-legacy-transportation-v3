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

### V4.0 evidence-storage acceptance requirements (not implemented in V3.8)

V3.8 attachment metadata is not proof that an original file has been uploaded,
stored, backed up, or can be retrieved. Do not backfill file-storage success or
hashes onto historical metadata. Preserve existing Load IDs, expense IDs,
signatures, closed snapshots, and financial history during any future migration.

1. **Durable storage and retrieval:** persist original bytes for BOLs, signed
   PODs, photographs, expense receipts, and invoices in access-controlled,
   tenant-isolated durable object storage. Link immutable object/version IDs to
   the Load ID, document classification/stage, and expense ID where applicable.
   Record size, MIME type, capture/upload time, and provenance. Distinguish
   metadata-only, upload pending/failed, stored, verified, and unavailable states.
   Only claim storage success after durable write and authenticated retrieval
   have been verified; a filename or upload request alone is insufficient.
2. **SHA-256 verification:** compute SHA-256 over original bytes, persist the
   digest and algorithm with the immutable version, and verify stored/retrieved
   bytes against it. Detect corruption/substitution and fail explicitly rather
   than returning a storage PASS. A matching hash establishes byte integrity,
   not authenticity, signer authority, or legal validity.
3. **Signed POD/BOL preservation:** preserve the original signed file, associated
   signature image/record, signer and event timestamps/timezone, Load ID, stage,
   and capture provenance. Preserve every corrected version and its audit reason;
   do not overwrite originals, flatten away signature evidence, or silently
   replace the evidence referenced by a finalized invoice or closed load.
4. **Receipt storage:** store actual receipt bytes independently of shipping
   documents. Maintain stable Load-ID/expense-ID associations, capture metadata,
   hash/version references, and correction history. Do not infer a fuel receipt
   from a BOL/POD. Receipt corrections must preserve immutable journal source
   values and protected financial-close behavior without duplicate postings.
5. **Backup and recovery:** back up both files and their association/audit
   metadata consistently, with documented retention and recovery point/time
   objectives, access protection, and restoration procedures. Test restores into
   an isolated environment and verify hashes, file retrieval, Load-ID/expense-ID
   associations, signed evidence, and financial-history consistency. Original
   browser data must not be destroyed as part of migration or a restore test.
6. **Exportable compliance packages:** export authorized, load-specific original
   evidence plus a human-readable index and machine-readable manifest identifying
   document/version IDs, classifications, signer/capture details, Load ID,
   associated expense IDs, byte sizes, MIME types, and SHA-256 values. Include
   applicable signed BOL/POD, condition photos, source/compliance evidence,
   receipts, and invoice references. Verify exported bytes against the manifest.
   Explicitly list missing/metadata-only/unavailable evidence; never label an
   incomplete package complete. Prevent cross-load/tenant leakage and audit
   export access.
7. **Failure and preservation tests:** exercise interrupted uploads, retries,
   duplicate uploads, unavailable objects, hash mismatches, unauthorized access,
   backup restoration, migration with metadata-only historical records, and
   exported-package verification. A missing original must remain visibly missing;
   no fabricated files, digests, audit events, or success-shaped fallbacks.

These are future development and acceptance requirements, not a V3.8 storage
implementation or a claim of production readiness. Deployment requiring FLT to
retain and retrieve original evidence remains blocked until they are verified.

## Non-negotiable product rules

- Enter once. Calculate once. Auto-populate everywhere.
- One immutable Load ID connects the complete transaction.
- Estimated and actual values remain separate.
- AI may recommend or prefill but may not silently change an auditable record.
- Protected/destructive changes require confirmation and audit history.
- FLT's core Load → Profit transaction must work without requiring an outside bookkeeping, mileage, invoicing, receivables, or load-profit application.
