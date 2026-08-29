# FLT Transportation Operating System

## Market-Leading Product Blueprint

**Product owner:** Family Legacy Transportation, LLC  
**Reference implementation:** FLT internal operation  
**Product scope:** Non-CDL and CDL hot shot, automobile hauling, cargo vans, box trucks, small carriers, owner-operators, and other commercial vehicles  
**Design principle:** Enter once. Calculate once. Auto-populate everywhere. Verify before records become final.

## 1. Product Goal

FLT will build an independent transportation operating system that turns a proposed load into a complete, auditable business transaction:

**Customer → Load Decision → Dispatch → Pickup → Delivery → POD → Invoice → Payment → Ledger → Actual Profit**

One immutable Load ID connects every operational and financial record. FLT will not require an outside bookkeeping, mileage, invoicing, receivables, or load-profit application to complete this transaction.

## 2. FLT's Market Advantage

Existing products commonly solve only one portion of the problem:

- Load calculators quickly estimate fuel, deadhead, fees, and profit.
- Traditional TMS products manage dispatch, documents, invoicing, and reports.
- Fleet platforms emphasize GPS, ELD, safety, telematics, and maintenance.
- Accounting products record money after a transaction but do not decide whether a load should be accepted.

FLT combines those strengths into a single load-centered workflow while removing duplicate entry, hidden calculations, unnecessary screens, and features that do not apply to the selected transportation type.

## 3. Non-Negotiable Efficiency Rules

1. A value entered once must auto-populate every authorized downstream record.
2. The system must never ask a driver for information already known from the load, vehicle, customer, or business profile.
3. The proposed load decision must take no more than one short screen in Quick Check mode.
4. Every calculated value must expose its formula and source inputs.
5. Estimated and actual values must remain separate; actual records never overwrite the original estimate.
6. AI may recommend, detect, explain, or prefill, but it may not silently change an auditable record.
7. Destructive actions require two-step confirmation and an audit entry.
8. Modules irrelevant to the chosen operation are hidden, not deleted from the architecture.
9. Driver screens are mobile/iPad-first with large controls and offline-safe drafts.
10. Owner screens emphasize exceptions, cash, profit, compliance, and actions—not decorative statistics.

## 4. Load Decision Engine

### Required inputs

- Transportation type
- Selected truck and trailer
- Cargo type, weight, dimensions, and deck space
- Origin, pickup, delivery, next destination or return-home location
- Offered linehaul and accessorial revenue
- Deadhead to pickup
- Loaded miles
- repositioning/return deadhead
- Expected loaded MPG and empty MPG, or a blended MPG override
- Fuel price per gallon
- Tolls, parking, permits, lodging, meals, scale, washout, loading, and securement costs
- Driver compensation
- Dispatcher percentage or flat fee
- Factoring/payment fee when used
- Truck and trailer maintenance reserve per mile
- Tire reserve per mile
- Insurance and other fixed-cost allocation
- Expected trip hours, detention, layover, and number of operating days
- Target profit dollars, target margin, profit per total mile, and hourly earnings floor

### Core formulas

```text
total_miles = deadhead_to_pickup + loaded_miles + repositioning_deadhead

loaded_gallons = loaded_miles / loaded_mpg
empty_gallons = (deadhead_to_pickup + repositioning_deadhead) / empty_mpg
estimated_gallons = loaded_gallons + empty_gallons
estimated_fuel_cost = estimated_gallons * fuel_price_per_gallon

variable_mileage_cost = total_miles * configured_variable_cost_per_mile
maintenance_reserve = total_miles * maintenance_reserve_per_mile
tire_reserve = total_miles * tire_reserve_per_mile
fixed_cost_allocation = configured_fixed_costs / expected_billable_units
percentage_fees = gross_revenue * applicable_fee_percentages

estimated_total_cost = fuel + variable_mileage_cost + maintenance_reserve
                     + tire_reserve + fixed_cost_allocation + driver_cost
                     + percentage_fees + tolls + accessorial_costs + other_costs

estimated_profit = gross_revenue - estimated_total_cost
all_in_revenue_per_mile = gross_revenue / total_miles
profit_per_total_mile = estimated_profit / total_miles
profit_margin = estimated_profit / gross_revenue
profit_per_hour = estimated_profit / expected_trip_hours
deadhead_percentage = total_deadhead / total_miles
```

### Required price outputs

- **Break-even / Walk-away:** the lowest revenue that covers all configured costs.
- **Minimum acceptable:** walk-away plus the owner's minimum required profit.
- **Target:** revenue required to meet the configured target margin and hourly/per-mile floors.
- **Recommended ask:** target plus a configurable negotiation allowance.
- **Counteroffer:** the exact additional dollars and rate needed when the offer is below target.

### Decision states

- **ACCEPT:** all safety, weight, compliance, margin, per-mile, and hourly floors pass.
- **NEGOTIATE:** legal and operational checks pass, but price is below target and above or near walk-away.
- **DECLINE:** offer is below walk-away or fails a non-price business rule.
- **DO NOT DISPATCH:** weight, equipment, insurance, authority, driver qualification, or compliance check fails.

The engine must show the reason for the decision. A green result without an explanation is not sufficient.

## 5. Two Calculation Modes

### Quick Check

Used while speaking with a customer, shipper, dispatcher, or broker. It uses saved vehicle and business defaults and asks only for route, offer, load, fuel price, and exceptions. The result must appear immediately.

### Full Analysis

Used for unusual loads, new lanes, multi-stop work, partials, vehicle transport, heavy cargo, accessorials, or what-if comparisons. It exposes every assumption and allows side-by-side scenarios.

Quick Check and Full Analysis use the same calculation engine; they do not maintain separate formulas.

## 6. Vehicle-Aware Cost Profiles

Each truck/trailer combination receives an effective-dated cost profile containing:

- Loaded, empty, city, and highway MPG history
- Fuel type and tank capacity
- GVWR, GAWR, GCWR, curb/empty scale weights, payload, towing and trailer ratings
- Maintenance and tire reserves
- Financing/depreciation allocation
- Insurance allocation
- Registration, inspection, permit, ELD, technology, and subscription allocations
- Typical loading and securement time

The system recommends an MPG from actual history by vehicle, trailer, cargo weight band, and driving condition. The operator can override it, but the override and reason are retained.

## 7. Estimate-to-Actual Learning Loop

At load close, FLT compares:

- Estimated versus actual loaded/deadhead/total miles
- Estimated versus actual gallons, price per gallon, and fuel cost
- Estimated versus actual MPG
- Estimated versus actual trip time and detention
- Estimated versus actual accessorial and operating expenses
- Quoted versus invoiced versus collected revenue
- Estimated versus actual profit, margin, profit per mile, and profit per hour

Approved actual history improves future defaults. Outliers are flagged for review rather than automatically changing the model.

## 8. Native End-to-End Record

Every Load ID must connect:

- Customer and contacts
- Quote and rate confirmation
- Vehicle, trailer, and driver assignments
- Route, stops, dates, and appointment windows
- Weight/dimension/equipment checks
- Pickup inspection, photographs, documents, and e-signature
- Securement checklist
- Delivery inspection, exceptions, photographs, documents, and e-signature
- BOL and POD
- Mileage and fuel records
- Expenses and receipts
- Invoice, adjustments, payments, balance, and collection activity
- Estimated and actual profitability snapshots
- Audit history

## 9. Automation Without Loss of Control

FLT should automatically:

- Reuse customer, vehicle, route, and cost-profile information
- Calculate route and deadhead candidates
- Create the load packet from accepted quote data
- Change workflow status when required evidence is completed
- Generate POD and invoice drafts from the signed load record
- Match a payment to the correct invoice and Load ID
- Warn about missing receipts, signatures, documents, dates, mileage, or costs
- Alert when actual cost or mileage exceeds the estimate
- identify repeat-lane performance and customer payment patterns

FLT should require human confirmation before:

- Accepting or declining a load
- Finalizing a legal/compliance determination
- Sending an invoice or customer communication
- Posting an adjustment or deleting/voiding a record
- Changing a locked actual or financial record

## 10. Financial Integrity

- Use double-entry accounting beneath the simple operator interface.
- Treat invoices, payments, expenses, owner contributions/distributions, reserves, assets, liabilities, and equity as distinct transaction types.
- Use append-and-reverse corrections for posted transactions rather than silent edits.
- Preserve the original load estimate as a time-stamped snapshot.
- Store receipt/document hashes and audit events when persistent file storage is implemented.
- Reconcile invoice total, payments, balance, ledger postings, and load profit before the Test Gate can pass.

## 11. Product Architecture

The production system will use:

- Responsive web application and installable mobile experience
- Multi-tenant relational database with tenant isolation
- Central calculation service with versioned formulas
- Object storage for documents, images, signatures, BOLs, PODs, receipts, and invoices
- Role-based access and field-level permissions
- Offline draft queue with conflict handling
- Immutable audit log for protected actions
- API/event layer for optional future GPS, ELD, fuel-card, banking, load-board, and telematics connections

No integration may become required for the FLT core transaction to work.

## 12. Build Gates

### V3.5 — Accurate Proposed Load

- Loaded and deadhead miles
- Loaded/empty or blended MPG
- Fuel price per gallon
- Complete configurable costs and reserves
- Walk-away, target, recommended ask, and counteroffer
- ACCEPT / NEGOTIATE / DECLINE with reasons
- Save immutable estimate snapshot

### V3.6 — Actual Trip Cost

- Actual mileage, gallons, fuel price, receipts, tolls, and expenses
- Estimated-versus-actual variance
- Vehicle MPG history

### V3.7 — Financial Close

- POD, invoice, payment, receivable balance, ledger posting, and final profit reconcile for one Load ID
- Finance isolation test: no values may leak from another load

### V3.8 — Operational Integrity

- Truck/trailer/driver assignments
- Weight and equipment fit checks
- required document and compliance gates by transportation type

### V4.0 — Production Foundation

- Authentication, roles, database, persistent document storage, backups, audit log, tenant isolation, and migration from browser prototype data

Expansion modules begin only after the complete Load → Profit Test Gate passes.

## 13. FLT Product Measures

FLT will measure whether the system is more efficient by tracking:

- Seconds and taps required to evaluate a load
- Percentage of fields auto-populated
- Duplicate-entry rate
- Estimated-versus-actual fuel and profit accuracy
- Deadhead percentage
- Profit per total mile and per operating hour
- Invoice cycle time and days to payment
- Missing-document and unreconciled-record rate
- User correction rate
- Number of loads rejected before they could lose money

## 14. Research Basis

The design combines publicly described market patterns including rapid mobile load evaluation, deadhead-aware RPM, fuel calculations from MPG and price, fixed/variable cost profiles, target-based accept/negotiation decisions, route and destination risk, saved lane templates, dispatch-to-invoice workflows, maintenance/compliance alerts, and estimated-versus-actual reporting.

Research references include:

- Diezl load profitability calculator: https://apps.apple.com/us/app/diezl/id6759265593
- HaulMargin load profitability calculator: https://apps.apple.com/us/app/haulmargin/id6782427618
- Route-Margin load profit calculator: https://apps.apple.com/us/app/route-margin/id6792972059
- RouteRunner Profit: https://apps.apple.com/us/app/routerunner-profit/id6766761877
- TruckingOffice profit-per-load and cost-per-mile materials: https://www.truckingoffice.com/
- TruckLogics dispatch, trip, fuel, expense, and IFTA materials: https://www.trucklogics.com/
- RapidLane Pro hot-shot load grading workflow: https://rapidlanepro.com/
- Goosedeck hot-shot Profit Meter: https://www.goosedeck.com/

These sources inform feature research only. FLT's specifications, workflow, calculation policy, interface, data model, and source code remain independently designed for FLT.
