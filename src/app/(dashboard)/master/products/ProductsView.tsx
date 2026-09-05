// Products list and kanban interactive view for Urban Furniture Accounting System.
// What: Client component managing view toggle (List vs Kanban), search filtering, and navigation for Products.
// Why: Provides rich catalog visualization including sales price, cost margins, and product categories.
// Used by: /master/products page.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ViewToggle, ViewMode } from "@/components/ui/ViewToggle";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Card } from "@/components/ui/Card";
import { Package, Tag, Layers } from "lucide-react";
import { ProductType } from "@prisma/client";

interface Product {
  id: string;
  name: string;
  type: ProductType;
  category: string;
  salesPrice: number | string | any;
  cost: number | string | any;
  imageUrl: string | null;
}

export function ProductsView({ products }: { products: Product[] }) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("list");

  // Format currency helper
  const formatCurrency = (val: any) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product Name",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#1E3A8A]/10 text-[#1E3A8A] flex items-center justify-center font-bold text-xs shrink-0">
            <Package size={15} />
          </div>
          <div>
            <span className="font-semibold text-[#171717]">{row.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (row) => (
        <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#171717]/5 text-[#171717]">
          {row.type}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-[#3D3A36] bg-[#F7F4EE] px-2 py-0.5 rounded border border-[#E2D9CC]">
          {row.category}
        </span>
      ),
    },
    {
      key: "salesPrice",
      header: "Sales Price",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-[#171717]">
          {formatCurrency(row.salesPrice)}
        </span>
      ),
    },
    {
      key: "cost",
      header: "Cost Price",
      sortable: true,
      render: (row) => (
        <span className="text-[#3D3A36]">
          {formatCurrency(row.cost)}
        </span>
      ),
    },
    {
      key: "margin",
      header: "Est. Margin",
      render: (row) => {
        const sp = Number(row.salesPrice) || 0;
        const cp = Number(row.cost) || 0;
        const diff = sp - cp;
        const pct = sp > 0 ? ((diff / sp) * 100).toFixed(0) : "0";
        return (
          <span className={`text-xs font-semibold ${diff >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {diff >= 0 ? "+" : ""}{formatCurrency(diff)} ({pct}%)
          </span>
        );
      },
    },
  ];

  // Group by category for Kanban view
  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <DataTable
          data={products}
          columns={columns}
          rowKey={(r) => r.id}
          searchKeys={["name", "category"]}
          searchPlaceholder="Search products by title or category..."
          onRowClick={(r) => router.push(`/master/products/${r.id}`)}
          emptyMessage="No products in catalog. Click '+ New Product' to add items."
        />
      ) : (
        /* Kanban View by Category */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.length === 0 ? (
            <div className="col-span-3 p-8 text-center text-xs text-[#3D3A36] border border-dashed border-[#D4CCC0] rounded bg-[#FFFDF8]">
              No products found to display in kanban view.
            </div>
          ) : (
            categories.map((cat) => {
              const catProducts = products.filter((p) => p.category === cat);
              return (
                <div key={cat} className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2D9CC]">
                    <div className="flex items-center gap-1.5">
                      <Tag size={13} className="text-[#B91C1C]" />
                      <h3 className="text-xs font-semibold uppercase tracking-[1.5px] text-[#171717]">
                        {cat}
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-[#171717] bg-[#E5DED2] px-2 py-0.5 rounded-sm">
                      {catProducts.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {catProducts.map((p) => (
                      <Card
                        key={p.id}
                        onClick={() => router.push(`/master/products/${p.id}`)}
                        className="p-4 cursor-pointer hover:border-[#1E3A8A] transition-all hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-semibold text-sm text-[#171717]">{p.name}</span>
                          <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[#171717]/5 text-[#171717]">
                            {p.type}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-[#3D3A36] pt-2 border-t border-[#E2D9CC]">
                          <div className="flex justify-between">
                            <span>Sales:</span>
                            <strong className="text-[#171717]">{formatCurrency(p.salesPrice)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Cost:</span>
                            <span>{formatCurrency(p.cost)}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
