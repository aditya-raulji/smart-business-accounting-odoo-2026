// PlaceholderPage UI component for Urban Furniture Accounting System.
// What: Branded coming-soon placeholder component for future prompts (Sales, Purchase, Reports).
// Why: Keeps the application free of 404 dead links while preserving exact wireframe navigation.
// Used by: /sales/*, /purchase/*, /accounting/journal-entries, /reports/* routes.

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Construction, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PlaceholderProps {
  title: string;
  subtitle: string;
  moduleName: string;
  upcomingPrompt: string;
}

export function PlaceholderPage({
  title,
  subtitle,
  moduleName,
  upcomingPrompt,
}: PlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />

      <Card className="p-12 text-center max-w-2xl mx-auto space-y-6 bg-[#FFFDF8]">
        <div className="w-16 h-16 rounded-sm bg-[#B91C1C]/10 text-[#B91C1C] flex items-center justify-center mx-auto">
          <Construction size={32} />
        </div>

        <div className="space-y-2">
          <span className="text-xs uppercase tracking-[2px] font-bold text-[#B91C1C]">
            {moduleName} Module
          </span>
          <h3 className="text-xl font-bold text-[#171717]" style={{ fontFamily: "var(--font-playfair)" }}>
            Coming in {upcomingPrompt}
          </h3>
          <p className="text-xs text-[#3D3A36] max-w-md mx-auto leading-relaxed">
            The full transaction flow, automated double-entry accounting entries, and PDF document generation
            for this module will arrive in {upcomingPrompt}. The underlying database schema and relations
            are already migrated and prepared.
          </p>
        </div>

        <div className="pt-4 border-t border-[#E2D9CC]">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#171717] hover:text-[#B91C1C] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Return to Operations Dashboard</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
