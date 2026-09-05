// Purchase Payments Redirect Page for Urban Furniture Accounting System.
// Yeh route purchase payments ko global generic `/payments` page par redirect karta hai.
// Used by: /purchase/payments route.

import { redirect } from "next/navigation";

export default function PurchasePaymentsRedirect() {
  redirect("/payments");
}
