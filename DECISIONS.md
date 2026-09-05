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
