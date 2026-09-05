// Balance Sheet Report Page for Urban Furniture Accounting System.
// What: Server component checking session role, fetching Balance Sheet data for selected year end date, and rendering BalanceSheetView.
// Specification §3.2: Read-only Balance Sheet statement with synthetic Retained Earnings, double-entry verification check, Year selector, Print, and Back controls.
// Used by: /reports/balance-sheet route.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBalanceSheetReport } from "@/lib/reports/balance-sheet";
import { BalanceSheetView } from "@/components/reports/BalanceSheetView";

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function BalanceSheetPage({ searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user as any;

  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    redirect("/dashboard");
  }

  const { year: yearParam } = await searchParams;
  const parsedYear = yearParam ? parseInt(yearParam, 10) : undefined;
  const selectedYear = parsedYear && !isNaN(parsedYear) ? parsedYear : new Date().getFullYear();

  const data = await getBalanceSheetReport(selectedYear);

  return <BalanceSheetView data={data} />;
}
