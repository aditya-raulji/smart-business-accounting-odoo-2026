# Urban Furniture — Architecture & Implementation Decisions

This document records the architectural and business decisions made during each prompt phase of the Urban Furniture Accounting System.

---

## Part 1: Master Data, Auth & Setup
- **Authentication**: Auth.js (NextAuth v5 beta) with credentials provider and bcrypt password hashing.
- **Roles & RBAC**: Exactly 3 roles: `ADMIN`, `ACCOUNTANT`, `CONTACT_USER`.
- **Contact Model**: Single `Contact` table with `ContactType` enum (`CUSTOMER`, `VENDOR`, `BOTH`).
- **Accounting Fundamentals**: Double-entry ledger architecture with balanced debits and credits.

---

## Part 2: Purchase Flow & Double-Entry Vendor Bills
- **PO Sequences**: Auto-numbering format `P00001`.
- **Bill Auto-Journal**: Bill confirmation generates double-entry: `Expense Dr = Creditors Cr`.
- **Bill Payment**: Direction `SEND`, `Creditors Dr = Bank/Cash Cr`.
- **Vendor Portal**: Read-only bill viewing for `CONTACT_USER` vendor contacts.

---

## Part 3: Sales Flow (SO → Customer Invoice → Payment → Auto Journal Entry)

| Decision Point | Chosen Approach | Why Chosen | Alternatives Rejected |
| :--- | :--- | :--- | :--- |
| **Tax Rate Storage & Calculation** | Added `taxRate Decimal @default(18) @db.Decimal(5, 2)` to `SOLine` and `InvoiceLine`. Computed per line: `tax = qty * unitPrice * (taxRate / 100)`. Line Total = `Subtotal + Tax`. | Accommodates Indian GST rates (0%, 5%, 12%, 18%, 28%) and custom percentages while preserving line-level auditability. | Global invoice-level tax percentage (rejected: cannot handle mixed tax rate items in furniture & hardware). |
| **Sales Double-Entry Journal Entry** | Automatic on Invoice Confirm:<br>`Debtors Dr` (Grand Total)<br>`Sales Income Cr` (Pre-tax Subtotal per account)<br>`Tax Payable Cr` (Tax Total). | Standard IFRS/GAAP & Indian Accounting Standard compliance. Debits total receivable while separating revenue from liability owed to government. | Manual journal creation (rejected: leads to unbalanced ledgers and missing tax liabilities). |
| **Payment Receipt Accounting** | Direction `RECEIVE`.<br>`Bank/Cash Dr` (Asset increases)<br>`Debtors Cr` (Receivable decreases). | Real-time reconciliation of bank and cash ledger balances against accounts receivable. | Direct invoice status toggle without journal entry (rejected: breaks balance sheet integrity). |
| **Duplicate Invoice Prevention** | When creating invoice with `sourceSOId`, system queries for any existing invoice where `status !== 'CANCELLED'`. Rejects duplicates with a descriptive error. | Prevents double billing for the same Sales Order commitment. | Allowing multiple partial invoices without order tracking (out of scope for Phase 3; 1:1 SO-to-Invoice matching required). |
| **Customer Self-Pay Security** | Allowed `CONTACT_USER` access to `/sales/invoices` and `/sales/invoices/[id]`. Partner is locked to logged-in `contactId`, direction is locked to `RECEIVE`. | Enables customer portal self-service for online payments while preventing access to other customers' invoices or admin routes. | Creating a detached external payment portal (rejected: reuses existing authenticated components and server actions). |
| **Numbering Sequences** | Sales Orders: `S00001` (continuous padded 5-digit).<br>Customer Invoices: `INV/YYYY/0001` (yearly reset, 4-digit padded). | Matches standard ERP formatting conventions and distinguishes sales documents from purchase documents. | Random UUID or database auto-increment ID (rejected: non-compliant with standard accounting invoice numbering). |

---

## Part 4: Accounting Engine Polish

| Decision | Chosen | Rejected alternative | Why rejected |
|---|---|---|---|
| **Editing auto-generated entries** | Fully locked, view-only, with a link back to the source document | Allow `Reset to Draft`/edit on any entry, including auto-generated ones | An auto-generated entry's whole point is that it's a mechanical reflection of a Bill/Invoice/Payment. Letting someone hand-edit it would let the books silently disagree with the document that supposedly produced them. If a Bill's amount is wrong, the fix is to correct the Bill (which regenerates its entry), not to hand-edit the entry. |
| **One Journal per Type** | Enforced uniqueness | Allow multiple Journals of the same Type (e.g. two "Bank" journals for two real bank accounts) | Prompts 2–3's automation was written to look up "the Bank journal" with a single `findFirst`. Supporting multiple would make that lookup ambiguous. |
| **Budget Achieved Amount** | Computed live on every page view | Denormalize it onto the Budget row, updated whenever a Bill/Invoice is confirmed | Achieved Amount depends on a set of documents across a date range — it would need to be recalculated from multiple trigger points to avoid drifting. Live aggregate query is fast and accurate. |
| **Manual entry numbering** | Simple `JE-00001` running sequence, editable | Force it to match some external numbering standard | A plain internal sequence is the smallest correct choice, and it's editable in case the accountant wants to key in a reference to a physical voucher. |

---

## Part 5: Reports (Balance Sheet, Profit & Loss, Budget Report)

| Decision | Chosen | Rejected alternative | Why rejected |
|---|---|---|---|
| **Making the Balance Sheet balance** | Add a synthetic "Retained Earnings" line under Capital, equal to cumulative Net Income | Do nothing and let Assets ≠ Liabilities + Capital | Systems without year-end closing entries need a synthetic line representing accumulated profit sitting in Equity; otherwise the fundamental accounting equation won't hold and the balance sheet won't balance. |
| **PDF export** | Browser `window.print()` + print stylesheet | A PDF-generation library (`@react-pdf/renderer`, Puppeteer) | A library adds a large dependency and separate rendering pipeline. A print CSS stylesheet combined with `window.print()` is a clean, built-in solution supported by all browsers ("Print → Save as PDF"). |
| **Report computation** | Query and sum `JournalItem`s live, every time a report is opened | Maintain running account-balance totals updated on every posting | Live query is fast at this data volume and can never drift from posted ledger items. |
| **P&L period vs Balance Sheet period** | P&L = selected year only; Balance Sheet = cumulative up to that year's end | Make both cumulative, or both year-only | Income/Expense accounts are temporary (reset each period), while Asset/Liability/Capital accounts are permanent (carry forward). This reflects standard double-entry accounting principles. |
