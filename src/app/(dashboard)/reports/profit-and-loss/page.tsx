// Profit & Loss Report Page for Urban Furniture Accounting System.
// What: Server component checking session role, fetching P&L data for selected year, and rendering ProfitAndLossView.
// Specification §3.1: Read-only P&L statement with Year selector, Print, and Back controls.
// Used by: /reports/profit-and-loss route.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProfitAndLossReport } from "@/lib/reports/profit-and-loss";
import { ProfitAndLossView } from "@/components/reports/ProfitAndLossView";

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function ProfitAndLossPage({ searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user as any;

  if (!user || (user.role !== "ADMIN" && user.role !== "ACCOUNTANT")) {
    redirect("/dashboard");
  }

  const { year: yearParam } = await searchParams;
  const parsedYear = yearParam ? parseInt(yearParam, 10) : undefined;
  const selectedYear = parsedYear && !isNaN(parsedYear) ? parsedYear : new Date().getFullYear();

  const data = await getProfitAndLossReport(selectedYear);

  return <ProfitAndLossView data={data} />;
}
