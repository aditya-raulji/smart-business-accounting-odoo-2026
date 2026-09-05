// DataTable UI primitive for Urban Furniture Accounting System.
// What: A generic, reusable sortable data table with built-in search, configurable columns,
//       row click handler, and empty state. Used across all list views in the app.
// Why: Every master-data module (Contacts, Products, CoA, Journals, Budgets) needs the same
//      sort/search/click pattern. A shared generic DataTable means we build the UX once and
//      all list pages get consistent behaviour for free.
// Why not: Module-specific tables (ContactsTable, ProductsTable, etc.) would duplicate 80% of
//          logic and make table-level improvements (like keyboard navigation or row selection)
//          require N changes instead of 1.
// Used by: All list pages — /master/contacts, /master/products, /master/chart-of-accounts,
//          /master/journals, /master/analytic-accounts, /master/budgets.

"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, Search } from "lucide-react";

type SortDirection = "asc" | "desc" | null;

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  // Custom render: if provided, called with the row; otherwise displays row[key] as string.
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  emptyMessage?: string;
  rowKey: (row: T) => string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  searchPlaceholder = "Search…",
  searchKeys = [],
  emptyMessage = "No records found.",
  rowKey,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  // Derived: filter by search term across all searchKeys, then sort if a column is active.
  // Why: Deriving filtered+sorted data with useMemo avoids re-computing on unrelated re-renders.
  const processedData = useMemo(() => {
    let result = [...data];

    // Search: case-insensitive substring match across all specified keys.
    if (search.trim() && searchKeys.length > 0) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        searchKeys.some((key) =>
          String(row[key] ?? "").toLowerCase().includes(q)
        )
      );
    }

    // Sort: lexicographic for strings, numeric for numbers.
    if (sortKey && sortDir) {
      result.sort((a, b) => {
        const aVal = a[sortKey] ?? "";
        const bVal = b[sortKey] ?? "";
        const cmp =
          typeof aVal === "number" && typeof bVal === "number"
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, searchKeys, sortKey, sortDir]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4CCC0]"
          size={15}
        />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={[
            "w-full pl-9 pr-3 py-2 bg-[#FFFDF8] border border-[#D4CCC0] rounded-sm",
            "text-sm text-[#171717] placeholder:text-[#D4CCC0]",
            "focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent",
          ].join(" ")}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-[#D4CCC0] rounded-[4px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F7F3EA] border-b border-[#D4CCC0]">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{ width: col.width }}
                  className={[
                    "px-4 py-3 text-left",
                    "text-[11px] font-semibold uppercase tracking-[1.5px] text-[#3D3A36]",
                    col.sortable ? "cursor-pointer select-none hover:text-[#B91C1C]" : "",
                  ].join(" ")}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span className="flex flex-col -space-y-1">
                        <ChevronUp
                          size={10}
                          className={
                            sortKey === col.key && sortDir === "asc"
                              ? "text-[#B91C1C]"
                              : "text-[#D4CCC0]"
                          }
                        />
                        <ChevronDown
                          size={10}
                          className={
                            sortKey === col.key && sortDir === "desc"
                              ? "text-[#B91C1C]"
                              : "text-[#D4CCC0]"
                          }
                        />
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-[#3D3A36] text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              processedData.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={[
                    "border-b border-[#E5DED2] bg-[#FFFDF8]",
                    "transition-colors duration-150",
                    onRowClick ? "cursor-pointer hover:bg-[#F7F3EA]" : "",
                  ].join(" ")}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className="px-4 py-3 text-[#171717]"
                    >
                      {col.render
                        ? col.render(row)
                        : String(row[String(col.key)] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Row count */}
      <p className="text-[11px] text-[#3D3A36]">
        {processedData.length} record{processedData.length !== 1 ? "s" : ""}
        {search && ` matching "${search}"`}
      </p>
    </div>
  );
}
