// Payments Ledger List Page for Urban Furniture Accounting System.
// Yeh page generic, read-only Payment log fetch karke PaymentsTable Client Component me pass karta hai.
// Specification §2.6 Columns: Date, Partner, Direction (Send/Receive badge), Method (Cash/Bank), Amount, Against (Link to Bill/Invoice).
// Used by: /payments route.

import { getPayments } from "@/lib/actions/payments";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentsTable } from "@/components/payments/PaymentsTable";

export default async function PaymentsPage() {
  const payments = await getPayments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment & Receipt Register"
        subtitle="Read-only audit register of money sent to vendors and collected from customers."
      />

      <PaymentsTable payments={payments} />
    </div>
  );
}
