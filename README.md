# Urban Furniture — Accounting System

A production-grade, double-entry business accounting web application designed specifically for **Urban Furniture**. Built with **Next.js 15+ (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, **Neon PostgreSQL**, and **Auth.js v5 (NextAuth)**.

---

## 🚀 Key Modules & Capabilities

### 1. Foundation & Master Data (Prompt 1)
- **Role-Based Access Control (RBAC)**:
  - `ADMIN`: Full access to company accounting, master data, configuration, team member provisioning (`/users/new`).
  - `ACCOUNTANT`: Full operational access to day-to-day books, orders, bills, customer invoices, manual journals, and financial reports.
  - `CONTACT_USER`: Dedicated vendor & customer portal view restricted strictly to personal bills, invoices, and self-service payments.
- **Master Data Management**:
  - **Contacts**: Customers, Vendors, or Both with auto-provisioned `CONTACT_USER` portal credentials.
  - **Products**: Goods, Services, standard cost and sales price tracking with dynamic categories.
  - **Chart of Accounts**: Core system accounts (*Cash, Bank, Debtors, Creditors, Capital, Sales Income, Purchase Expense, Tax Payable*) locked against destructive modifications.
  - **Journals**: Sales, Purchase, Bank, and Cash journals with default balancing accounts.
  - **Analytic Accounts & Budgets**: Departmental cost centers with full lifecycle state machine (`Draft` → `Confirmed` → `Revised` with linked revisions) and live Achieved Amount tracking.

### 2. Purchase Flow & Vendor Bills (Prompt 2)
- **Purchase Orders (PO)**: Sequential auto-numbering (`P00001`), line item valuation, confirmation, and cancellation.
- **PO → Vendor Bill Conversion**: 1-click conversion copying line items, products, quantities, and rates with duplicate bill prevention.
- **Fiscal Bill Numbering**: Standard format (`Bill/YYYY/0001`) reset per calendar year.
- **Automated Journal Entries**:
  - **Bill Confirmation**: `Debit: Purchase Expense` / `Credit: Creditors Liability` (balanced down to 0.00 paisa).
  - **Payment Registration**: `Debit: Creditors Liability` / `Credit: Bank or Cash Account`.

### 3. Sales Flow & Customer Invoices (Prompt 3)
- **Sales Orders (SO)**: Sequential auto-numbering (`S00001`), line item tax rate selection (Indian GST 0%-28%), subtotal & tax calculation.
- **SO → Customer Invoice Conversion**: 1-click conversion with duplicate invoice guards (`INV/YYYY/0001`).
- **Automated Sales Journal Entries**:
  - **Invoice Confirmation**: `Debit: Debtors` (Grand Total) / `Credit: Sales Income` (Subtotal) / `Credit: Tax Payable` (Tax).
  - **Payment Receipt**: `Debit: Bank/Cash` / `Credit: Debtors`.
- **Customer Self-Service Payment Portal**: `CONTACT_USER` portal viewing and 1-click payment execution.

### 4. Accounting Engine Polish (Prompt 4)
- **Manual Journal Entries**: Create custom multi-line journal entries (`JE-00001`) with live debit === credit balance guards.
- **Chart of Accounts & Journal Management**: View, archive, and manage accounts and journals with strict system account protections.
- **Live Budget Achieved Amount**: Dynamic live aggregation across posted bill and invoice lines against analytic accounts.

### 5. Financial Reports (Prompt 5)
- **Profit & Loss Statement** (`/reports/profit-and-loss`): Year-to-date Income, Expenses, and Net Income / Net Loss calculations.
- **Balance Sheet** (`/reports/balance-sheet`): Permanent account snapshot with synthetic **Retained Earnings** line (cumulative Net Income) and double-entry `Assets === Liabilities + Capital` equation verification check.
- **Budget Performance Report** (`/reports/budget-report`): Active Confirmed/Revised budgets table with committed, achieved, and amount-to-achieve metrics.
- **Print / PDF Export**: Native browser `window.print()` triggered via `@media print` clean report view.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Server Actions)
- **Language**: TypeScript (Strict typechecking)
- **Styling**: Tailwind CSS & Lucide Icons (Editorial cream & paper aesthetic)
- **Database**: Neon PostgreSQL via Prisma ORM
- **Authentication**: Auth.js v5 (Edge JWT sessions)
- **Validation**: Zod & React Hook Form

---

## ⚡ Quick Start

### 1. Prerequisites & Installation
```bash
git clone https://github.com/aditya-raulji/smart-business-accounting-odoo-2026.git
cd smart-business-accounting-odoo-2026
npm install
```

### 2. Environment Setup
Configure `.env` with your Neon PostgreSQL connection string:
```env
DATABASE_URL="postgresql://neondb_owner:npg_5QiFcqAzRY1E@ep-fancy-mode-ayco0rmv.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"
AUTH_SECRET="urban-furniture-super-secret-key-32chars"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Migration & Seed
```bash
npx prisma migrate deploy
npx prisma db seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Seeded Demo Login Credentials

| Role | Login ID | Password | Scope & Accessible Routes |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin1234` | `Admin@123` | Full System Access + User Provisioning (`/users/new`) |
| **ACCOUNTANT** | `accountant1` | `Accountant@123` | Full Operational Access (Blocked from `/users/new`) |
| **VENDOR USER** | `vendor123` | `Vendor@123` | Read-only Vendor Bills Portal (`/purchase/bills`) |
| **CUSTOMER USER** | `customer123` | `Customer@123` | Read-only Invoices & Self-Payment Portal (`/sales/invoices`) |

---

## 🧪 Automated Integrity Check & QA Verification

Run the 5 database integrity assertions directly against Neon PostgreSQL:
```bash
npx tsx src/scripts/qa-integrity-check.ts
```
1. **Journal Entry Debit/Credit Balance**: Verifies `sum(debit) === sum(credit)` for every posted entry.
2. **Accounting Equation**: Verifies `Assets === Liabilities + Capital + Retained Earnings`.
3. **Document Number Uniqueness**: Verifies no sequence collisions across PO, Vendor Bill, SO, or Invoice numbers.
4. **Payment Amounts Sum Consistency**: Verifies `paidAmount` equals `sum(payments)`.
5. **Budget Achieved Calculations**: Verifies valid non-NaN metric outputs for active budgets.
