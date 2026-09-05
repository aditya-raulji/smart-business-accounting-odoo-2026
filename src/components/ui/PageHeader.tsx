// PageHeader UI primitive for Urban Furniture Accounting System.
// What: A page-level header with a Playfair Display italic title, optional subtitle, and an
//       optional action button (e.g., "+ New Contact") pinned to the right side.
// Why: Every list and detail page in the spec shares this header pattern. Building it as a
//      primitive ensures the title font, action button position, and spacing are always consistent
//      — changing the header layout once updates every page simultaneously.
// Why not: Duplicating the title + button layout on each page would lead to drift and make
//          spec-driven redesigns (e.g., moving the action button below the title) require N edits.
// Used by: All master-data list pages and form pages throughout the application.

import type { ReactNode } from "react";
import Link from "next/link";

interface ActionConfig {
  label: string;
  href: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode | ActionConfig;
  breadcrumb?: string;
}

export function PageHeader({ title, subtitle, action, breadcrumb }: PageHeaderProps) {
  const isActionConfig = (act: any): act is ActionConfig => {
    return act && typeof act === "object" && "label" in act && "href" in act;
  };

  return (
    <div className="flex items-start justify-between gap-4 pb-6 border-b border-[#E5DED2]">
      <div className="flex flex-col gap-1">
        {breadcrumb && (
          <p className="text-[11px] font-medium uppercase tracking-[1.5px] text-[#3D3A36]">
            {breadcrumb}
          </p>
        )}
        {/* Playfair Display italic heading per spec §3.2 — H2 size for page titles */}
        <h1
          className="text-[42px] font-bold leading-tight"
          style={{
            fontFamily: "var(--font-playfair)",
            fontStyle: "italic",
            letterSpacing: "-0.02em",
            color: "#171717",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[#3D3A36]">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0 pt-2">
          {isActionConfig(action) ? (
            <Link
              href={action.href}
              className="inline-flex items-center px-4 py-2 bg-[#B91C1C] hover:bg-[#991818] text-[#FFFDF8] font-semibold text-xs rounded-sm tracking-wider uppercase transition-colors"
            >
              {action.label}
            </Link>
          ) : (
            action
          )}
        </div>
      )}
    </div>
  );
}
