// ViewToggle UI primitive for Urban Furniture Accounting System.
// What: A two-button toggle (List / Kanban) used on Contacts, Products, and Budgets list pages.
// Why: Spec §3.6 explicitly lists ViewToggle as a required UI primitive. Encapsulating the
//      active/inactive state and icons here means any list page can add Kanban support with
//      a single component import rather than re-building the toggle each time.
// Why not: Radio buttons or tabs could achieve the same effect, but they have more default browser
//          styling to fight against; two icon buttons with an active state is visually cleaner
//          and matches the editorial brand aesthetic (no pill-shapes per §3.5).
// Used by: /master/contacts, /master/products, /master/budgets list pages.

"use client";

import { LayoutList, LayoutGrid } from "lucide-react";

export type ViewMode = "list" | "kanban";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex border border-[#D4CCC0] rounded-sm overflow-hidden">
      <button
        onClick={() => onChange("list")}
        title="List view"
        className={[
          "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors duration-150",
          view === "list"
            ? "bg-[#171717] text-[#FFFDF8]"
            : "bg-[#FFFDF8] text-[#3D3A36] hover:bg-[#F7F3EA]",
        ].join(" ")}
      >
        <LayoutList size={15} />
        <span className="hidden sm:inline">List</span>
      </button>
      <button
        onClick={() => onChange("kanban")}
        title="Kanban view"
        className={[
          "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors duration-150 border-l border-[#D4CCC0]",
          view === "kanban"
            ? "bg-[#171717] text-[#FFFDF8]"
            : "bg-[#FFFDF8] text-[#3D3A36] hover:bg-[#F7F3EA]",
        ].join(" ")}
      >
        <LayoutGrid size={15} />
        <span className="hidden sm:inline">Kanban</span>
      </button>
    </div>
  );
}
