// Dashboard layout for Urban Furniture Accounting System.
// What: Shell layout that surrounds all authenticated views with a left-hand Sidebar and a top bar.
// Why: Provides a consistent navigation and branding frame across all dashboard, master data,
//      sales, purchase, and reporting views.
// Why not: Per-page sidebars would duplicate markup, re-mount on navigation, and risk layout shifts.
// Used by: /dashboard, /master/*, /sales/*, /purchase/*, /reports/*, /users/new.

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/ui/Sidebar";
import Link from "next/link";
import { UserPlus } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role || "ACCOUNTANT";
  const userName = session.user.name || session.user.email || "User";

  return (
    <div className="flex min-h-screen bg-[#F7F4EE]">
      {/* Fixed/sticky role-aware sidebar */}
      <Sidebar role={role} userName={userName} />

      {/* Main content scrollable container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top utility bar */}
        <header className="h-14 border-b border-[#E2D9CC] bg-[#FFFDF8] px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#3D3A36]">
            <span className="font-semibold text-[#171717]">Urban Furniture</span>
            <span>/</span>
            <span className="capitalize">{role.toLowerCase().replace("_", " ")} Portal</span>
          </div>

          <div className="flex items-center gap-4">
            {role === "ADMIN" && (
              <Link
                href="/users/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold bg-[#171717] text-[#FFFDF8] hover:bg-[#262626] transition-colors"
              >
                <UserPlus size={13} />
                <span>+ New User</span>
              </Link>
            )}
            <div className="flex items-center gap-2 text-xs text-[#3D3A36]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
