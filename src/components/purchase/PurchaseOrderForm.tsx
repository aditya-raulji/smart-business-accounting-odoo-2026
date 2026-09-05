// Purchase Order Form Component for Urban Furniture Accounting System.
// Yeh component Purchase Orders create karne, edit karne aur view karne ka interactive UI hai.
// Key Features: Dynamic Line items array (Add/Remove Row), Product selection par Auto Unit Price (product cost) populating, Total calculations, aur Status-driven Action Buttons.
// Validation Rules: Vendor strict type VENDOR/BOTH se filter hota hai aur Budget Analytics EXPENSE type account tak limited rahte hain.
// Used by: /purchase/orders/new page aur /purchase/orders/[id] page.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Plus, Trash2, ArrowLeft, CheckCircle, FileText, XCircle } from "lucide-react";
import {
  createPurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
} from "@/lib/actions/purchase-orders";

interface ContactOption {
  id: string;
  name: string;
  type: string;
}

interface ProductOption {
  id: string;
  name: string;
  cost: number;
}

interface AnalyticOption {
  id: string;
  name: string;
  type: string;
}

interface POLineState {
  productId: string;
  analyticAccountId: string;
  qty: number;
  unitPrice: number;
}

interface PurchaseOrderFormProps {
  initialData?: {
    id: string;
    poNumber: string;
    vendorId: string;
    poDate: Date | string;
    status: "DRAFT" | "CONFIRMED" | "CANCELLED";
    lines: Array<{
      id?: string;
      productId: string;
      analyticAccountId?: string | null;
      qty: number | any;
      unitPrice: number | any;
      product?: { name: string; cost: number | any };
    }>;
    createdBill?: { id: string; billNumber: string; status: string } | null;
  };
  vendors: ContactOption[];
  products: ProductOption[];
  analyticAccounts: AnalyticOption[];
}

export function PurchaseOrderForm({
  initialData,
  vendors,
  products,
  analyticAccounts,
}: PurchaseOrderFormProps) {
  const router = useRouter();
  const isNew = !initialData;
  const isReadonly = !isNew && initialData.status !== "DRAFT";

  // Form State
  const [vendorId, setVendorId] = useState(initialData?.vendorId || (vendors[0]?.id ?? ""));
  const [poDate, setPoDate] = useState(
    initialData
      ? new Date(initialData.poDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const [lines, setLines] = useState<POLineState[]>(
    initialData?.lines?.length
      ? initialData.lines.map((l) => ({
          productId: l.productId,
          analyticAccountId: l.analyticAccountId || "",
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice),
        }))
      : [
          {
            productId: products[0]?.id ?? "",
            analyticAccountId: "",
            qty: 1,
            unitPrice: products[0]?.cost ? Number(products[0].cost) : 0,
          },
        ]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Line calculations
  const lineTotals = lines.map((l) => (Number(l.qty) || 0) * (Number(l.unitPrice) || 0));
  const grandTotal = lineTotals.reduce((sum, val) => sum + val, 0);

  // Handle Product Change — auto fills unit price with product cost
  const handleProductChange = (index: number, newProductId: string) => {
    const selectedProd = products.find((p) => p.id === newProductId);
    setLines((prev) =>
      prev.map((line, idx) => {
        if (idx === index) {
          return {
            ...line,
            productId: newProductId,
            unitPrice: selectedProd ? Number(selectedProd.cost) : line.unitPrice,
          };
        }
        return line;
      })
    );
  };

  const handleLineChange = (
    index: number,
    field: keyof POLineState,
    value: string | number
  ) => {
    setLines((prev) =>
      prev.map((line, idx) => (idx === index ? { ...line, [field]: value } : line))
    );
  };

  const addLine = () => {
    const defaultProd = products[0];
    setLines((prev) => [
      ...prev,
      {
        productId: defaultProd?.id ?? "",
        analyticAccountId: "",
        qty: 1,
        unitPrice: defaultProd ? Number(defaultProd.cost) : 0,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) return;
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadonly) return;

    setError(null);
    setLoading(true);

    const res = await createPurchaseOrder({
      vendorId,
      poDate,
      lines: lines.map((l) => ({
        productId: l.productId,
        analyticAccountId: l.analyticAccountId || undefined,
        qty: Number(l.qty),
        unitPrice: Number(l.unitPrice),
      })),
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.id) {
      router.push(`/purchase/orders/${res.id}`);
      router.refresh();
    }
  };

  // Confirm Purchase Order Action
  const handleConfirm = async () => {
    if (!initialData?.id) return;
    setError(null);
    setLoading(true);

    const res = await confirmPurchaseOrder(initialData.id);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.refresh();
    }
  };

  // Cancel Purchase Order Action
  const handleCancel = async () => {
    if (!initialData?.id) return;
    if (!confirm("Kya aap sach me is Purchase Order ko cancel karna chahte hain?")) return;

    setError(null);
    setLoading(true);

    const res = await cancelPurchaseOrder(initialData.id);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.refresh();
    }
  };

  // Filter EXPENSE analytic accounts only
  const expenseAnalyticAccounts = analyticAccounts.filter((a) => a.type === "EXPENSE");

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? "New Purchase Order" : `Purchase Order ${initialData.poNumber}`}
        subtitle="Specify vendor, items, pricing, and optionally tag budget expense analytics."
        action={
          <Link
            href="/purchase/orders"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold bg-white border border-[#E2D9CC] text-[#171717] hover:bg-[#F7F4EE]"
          >
            <ArrowLeft size={14} />
            Back to PO List
          </Link>
        }
      />

      {error && (
        <div className="p-4 rounded bg-red-50 border border-red-200 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Created Vendor Bill Link Notification */}
      {!isNew && initialData.createdBill && (
        <div className="p-4 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <CheckCircle size={16} />
            <span>A Vendor Bill has been created from this Purchase Order.</span>
          </div>
          <Link
            href={`/purchase/bills/${initialData.createdBill.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#B91C1C] hover:underline"
          >
            View Vendor Bill ({initialData.createdBill.billNumber}) →
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
                PO No. (Auto-generated)
              </label>
              <Input
                type="text"
                disabled
                value={isNew ? "P00001 (Auto on save)" : initialData.poNumber}
                className="bg-[#F7F4EE] text-[#3D3A36]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <Select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                disabled={isReadonly}
                required
              >
                <option value="" disabled>Select Vendor partner</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.type})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
                PO Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                disabled={isReadonly}
                required
              />
            </div>
          </div>

          {!isNew && (
            <div className="flex items-center gap-3 pt-3 border-t border-[#E2D9CC] mb-6">
              <span className="text-xs font-semibold text-[#3D3A36]">Status:</span>
              <Badge
                variant={
                  initialData.status === "CONFIRMED"
                    ? "success"
                    : initialData.status === "DRAFT"
                    ? "warning"
                    : "danger"
                }
              >
                {initialData.status}
              </Badge>
            </div>
          )}

          {/* Line Items Table */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#171717]">Purchase Order Line Items</h3>

            <div className="overflow-x-auto border border-[#E2D9CC] rounded-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFDF8] border-b border-[#E2D9CC] text-[#3D3A36] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 w-12 text-center">Sr.</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Budget Analytics (Expense)</th>
                    <th className="px-3 py-2 w-28 text-right">Qty</th>
                    <th className="px-3 py-2 w-32 text-right">Unit Price (₹)</th>
                    <th className="px-3 py-2 w-36 text-right">Total (₹)</th>
                    {!isReadonly && <th className="px-3 py-2 w-12 text-center"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D9CC]">
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-[#FFFDF8]">
                      <td className="px-3 py-2 text-center text-[#3D3A36]">{idx + 1}</td>
                      <td className="px-3 py-2">
                        {isReadonly ? (
                          <span className="font-medium text-[#171717]">
                            {products.find((p) => p.id === line.productId)?.name || "—"}
                          </span>
                        ) : (
                          <Select
                            value={line.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            required
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Cost: ₹{Number(p.cost).toLocaleString("en-IN")})
                              </option>
                            ))}
                          </Select>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        {isReadonly ? (
                          <span className="text-[#3D3A36]">
                            {expenseAnalyticAccounts.find((a) => a.id === line.analyticAccountId)?.name || "—"}
                          </span>
                        ) : (
                          <Select
                            value={line.analyticAccountId}
                            onChange={(e) => handleLineChange(idx, "analyticAccountId", e.target.value)}
                          >
                            <option value="">(None - No analytic tag)</option>
                            {expenseAnalyticAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </Select>
                        )}
                      </td>

                      <td className="px-3 py-2 text-right">
                        {isReadonly ? (
                          <span>{line.qty}</span>
                        ) : (
                          <Input
                            type="number"
                            min="0.01"
                            step="any"
                            value={line.qty}
                            onChange={(e) => handleLineChange(idx, "qty", parseFloat(e.target.value) || 0)}
                            className="text-right"
                            required
                          />
                        )}
                      </td>

                      <td className="px-3 py-2 text-right">
                        {isReadonly ? (
                          <span>₹{line.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => handleLineChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="text-right"
                            required
                          />
                        )}
                      </td>

                      <td className="px-3 py-2 text-right font-semibold text-[#171717]">
                        ₹{lineTotals[idx].toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {!isReadonly && (
                        <td className="px-3 py-2 text-center">
                          {lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remove Line"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!isReadonly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                className="mt-2"
              >
                <Plus size={14} className="mr-1" />
                Add Product Line
              </Button>
            )}

            {/* Total Footer */}
            <div className="flex justify-end pt-4 border-t border-[#E2D9CC]">
              <div className="w-64 bg-[#FFFDF8] border border-[#E2D9CC] p-4 rounded-sm space-y-2 text-xs">
                <div className="flex justify-between font-bold text-sm text-[#171717] pt-1">
                  <span>Grand Total:</span>
                  <span className="text-[#B91C1C]">
                    ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons Toolbar depending on state and status */}
        <div className="flex items-center justify-between bg-white border border-[#E2D9CC] p-4 rounded-sm">
          <Link
            href="/purchase/orders"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-sm text-xs font-semibold bg-white border border-[#E2D9CC] text-[#171717] hover:bg-[#F7F4EE]"
          >
            <ArrowLeft size={14} />
            Back
          </Link>

          <div className="flex items-center gap-3">
            {isNew && (
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Saving..." : "Save Draft PO"}
              </Button>
            )}

            {!isNew && initialData.status === "DRAFT" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle size={14} className="mr-1" />
                  Cancel
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  <CheckCircle size={14} className="mr-1" />
                  {loading ? "Confirming..." : "Confirm PO"}
                </Button>
              </>
            )}

            {!isNew && initialData.status === "CONFIRMED" && !initialData.createdBill && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle size={14} className="mr-1" />
                  Cancel
                </Button>

                <Link
                  href={`/purchase/bills/new?fromPO=${initialData.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm text-xs font-semibold bg-[#B91C1C] text-white hover:bg-[#991B1B] transition-colors"
                >
                  <FileText size={14} />
                  Create Bill
                </Link>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
