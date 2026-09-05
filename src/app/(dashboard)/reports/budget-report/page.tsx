// Budget Report Page for Urban Furniture Accounting System.
// What: Server component checking session role, fetching Budget Performance data for selected year, and rendering BudgetReportView.
// Specification §3.3: Read-only Budget Performance statement with Year selector, Print, and Back controls.
// Used by: /reports/budget-report route.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBudgetReport } from "@/lib/reports/budget-report";
import { BudgetReportView } from "@/components/reports/BudgetReportView";

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function BudgetReportPage({ searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user as any;

  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    redirect("/dashboard");
  }

  const { year: yearParam } = await searchParams;
  const parsedYear = yearParam ? parseInt(yearParam, 10) : undefined;
  const selectedYear = parsedYear && !isNaN(parsedYear) ? parsedYear : new Date().getFullYear();

  const data = await getBudgetReport(selectedYear);

  return <BudgetReportView data={data} />;
}
