// Vendor Bill Form & Detail Component for Urban Furniture Accounting System.
// Yeh component Vendor Bills create karne, edit karne aur view karne ka master UI container hai.
// Specification §2.4 Features:
// - Vendor Bill No: Auto-generated format `Bill/2026/0001` (Yearly resetting).
// - Source PO Link: Agar PO se bill derived hai to "Created from PO {poNumber} →" banner display hota hai.
// - Line Items Table: Product, Chart of Accounts (defaults to seeded "Purchase Expense" account), Budget Analytics (EXPENSE type), Qty, Unit Price, Line Total.
// - Totals Summary: Grand Total, Paid Via Cash, Paid Via Bank, Amount Due (Total - paidAmount).
// - Interactive Payment Modal: `Pay` button par BillPaymentModal open hota hai.
// - Secondary Actions: `Paid` status par `Print` (window.print()) aur `Send` (email toast simulation) options.
// RBAC Scoping: `isVendorPortal` prop true hone par tamam mutation buttons (Confirm/Pay/Cancel) hidden rahte hain.
// Used by: /purchase/bills/new page aur /purchase/bills/[id] page.

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
import { Plus, Trash2, ArrowLeft, CheckCircle, Wallet, Printer, Mail, XCircle, ExternalLink } from "lucide-react";
import { BillPaymentModal } from "@/components/purchase/BillPaymentModal";
import {
  createVendorBill,
  confirmVendorBill,
  cancelVendorBill,
} from "@/lib/actions/vendor-bills";

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

interface CoaOption {
  id: string;
  name: string;
  type: string;
}

interface AnalyticOption {
  id: string;
  name: string;
  type: string;
}

interface BillLineState {
  productId: string;
  chartOfAccountId: string;
  analyticAccountId: string;
  qty: number;
  unitPrice: number;
}

interface VendorBillFormProps {
  initialData?: {
    id: string;
    billNumber: string;
    vendorId: string;
    billReference?: string | null;
    billDate: Date | string;
    dueDate: Date | string;
    status: "DRAFT" | "CONFIRMED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
    sourcePOId?: string | null;
    sourcePONumber?: string | null;
    total: number;
    paidAmount: number;
    amountDue: number;
    paidViaCash: number;
    paidViaBank: number;
    lines: Array<{
      id?: string;
      productId: string;
      chartOfAccountId: string;
      analyticAccountId?: string | null;
      qty: number | any;
      unitPrice: number | any;
    }>;
    vendor?: { name: string };
  };
  vendors: ContactOption[];
  products: ProductOption[];
  accounts: CoaOption[];
  analyticAccounts: AnalyticOption[];
  defaultCoaId: string;
  fromPOData?: {
    poId: string;
    poNumber: string;
    vendorId: string;
    lines: Array<{
      productId: string;
      analyticAccountId?: string | null;
      qty: number;
      unitPrice: number;
    }>;
  };
  isVendorPortal?: boolean;
}

export function VendorBillForm({
  initialData,
  vendors,
  products,
  accounts,
  analyticAccounts,
  defaultCoaId,
  fromPOData,
  isVendorPortal = false,
}: VendorBillFormProps) {
  const router = useRouter();
  const isNew = !initialData;
  const isReadonly = isVendorPortal || (!isNew && initialData.status !== "DRAFT");

  // Determine initial vendor & lines
  const initialVendorId = fromPOData
    ? fromPOData.vendorId
    : initialData?.vendorId || (vendors[0]?.id ?? "");

  const initialLines: BillLineState[] = fromPOData
    ? fromPOData.lines.map((l) => ({
        productId: l.productId,
        chartOfAccountId: defaultCoaId,
        analyticAccountId: l.analyticAccountId || "",
        qty: Number(l.qty),
        unitPrice: Number(l.unitPrice),
      }))
    : initialData?.lines?.length
    ? initialData.lines.map((l) => ({
        productId: l.productId,
        chartOfAccountId: l.chartOfAccountId || defaultCoaId,
        analyticAccountId: l.analyticAccountId || "",
        qty: Number(l.qty),
        unitPrice: Number(l.unitPrice),
      }))
    : [
        {
          productId: products[0]?.id ?? "",
          chartOfAccountId: defaultCoaId,
          analyticAccountId: "",
          qty: 1,
          unitPrice: products[0]?.cost ? Number(products[0].cost) : 0,
        },
      ];

  // Form State
  const [vendorId, setVendorId] = useState(initialVendorId);
  const [billReference, setBillReference] = useState(initialData?.billReference || "");
  const [billDate, setBillDate] = useState(
    initialData
      ? new Date(initialData.billDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(
    initialData
      ? new Date(initialData.dueDate).toISOString().split("T")[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  const [lines, setLines] = useState<BillLineState[]>(initialLines);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Line calculations
  const lineTotals = lines.map((l) => (Number(l.qty) || 0) * (Number(l.unitPrice) || 0));
  const grandTotal = isNew
    ? lineTotals.reduce((sum, val) => sum + val, 0)
    : initialData.total;

  const amountDue = isNew ? grandTotal : initialData.amountDue;
  const paidViaCash = initialData?.paidViaCash || 0;
  const paidViaBank = initialData?.paidViaBank || 0;

  // Handle product change
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
    field: keyof BillLineState,
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
        chartOfAccountId: defaultCoaId,
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

  // Form Submit (Create Draft Bill)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadonly) return;

    setError(null);
    setLoading(true);

    const res = await createVendorBill({
      vendorId,
      billReference: billReference || undefined,
      billDate,
      dueDate,
      sourcePOId: fromPOData?.poId || initialData?.sourcePOId || undefined,
      lines: lines.map((l) => ({
        productId: l.productId,
        chartOfAccountId: l.chartOfAccountId,
        analyticAccountId: l.analyticAccountId || undefined,
        qty: Number(l.qty),
        unitPrice: Number(l.unitPrice),
      })),
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.id) {
      router.push(`/purchase/bills/${res.id}`);
      router.refresh();
    }
  };

  // Confirm Vendor Bill Action (triggers §4.1 Auto Journal Entry)
  const handleConfirm = async () => {
    if (!initialData?.id) return;
    setError(null);
    setLoading(true);

    const res = await confirmVendorBill(initialData.id);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.refresh();
    }
  };

  // Cancel Vendor Bill Action
  const handleCancel = async () => {
    if (!initialData?.id) return;
    if (!confirm("Kya aap sach me is Vendor Bill ko cancel karna chahte hain?")) return;

    setError(null);
    setLoading(true);

    const res = await cancelVendorBill(initialData.id);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.refresh();
    }
  };

  // Secondary Action: Print Bill
  const handlePrint = () => {
    window.print();
  };

  // Secondary Action: Send Email
  const handleSendEmail = () => {
    setToastMessage(`Vendor Bill ${initialData?.billNumber} PDF summary dispatched to vendor email.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const expenseAnalyticAccounts = analyticAccounts.filter((a) => a.type === "EXPENSE");
  const linkedPOId = fromPOData?.poId || initialData?.sourcePOId;
  const linkedPONumber = fromPOData?.poNumber || initialData?.sourcePONumber;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? "New Vendor Bill" : `Vendor Bill ${initialData.billNumber}`}
        subtitle="Manage supplier bills, general ledger account assignments, and record outgoing payments."
        action={
          <Link
            href="/purchase/bills"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold bg-white border border-[#E2D9CC] text-[#171717] hover:bg-[#F7F4EE]"
          >
            <ArrowLeft size={14} />
            Back to Bills List
          </Link>
        }
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded bg-[#171717] text-white text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded bg-red-50 border border-red-200 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Created from PO Banner */}
      {linkedPOId && linkedPONumber && (
        <div className="p-4 rounded bg-blue-50 border border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
            <ExternalLink size={16} />
            <span>This Vendor Bill was created from Purchase Order <strong>{linkedPONumber}</strong>.</span>
          </div>
          <Link
            href={`/purchase/orders/${linkedPOId}`}
            className="text-xs font-bold text-[#B91C1C] hover:underline"
          >
            Created from PO {linkedPONumber} →
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
                Vendor Bill No. (Auto)
              </label>
              <Input
                type="text"
                disabled
                value={isNew ? "Bill/2026/0001 (Auto on save)" : initialData.billNumber}
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
                disabled={isReadonly || Boolean(fromPOData)}
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
                Bill Reference (Vendor Inv #)
              </label>
              <Input
                type="text"
                value={billReference}
                onChange={(e) => setBillReference(e.target.value)}
                placeholder="e.g. ABC-26-001"
                disabled={isReadonly}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
                Bill Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                disabled={isReadonly}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isReadonly}
                required
              />
            </div>

            {!isNew && (
              <div>
                <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
                  Lifecycle Status
                </label>
                <div className="pt-1.5">
                  <Badge
                    variant={
                      initialData.status === "PAID"
                        ? "success"
                        : initialData.status === "PARTIALLY_PAID"
                        ? "warning"
                        : initialData.status === "CONFIRMED"
                        ? "primary"
                        : initialData.status === "DRAFT"
                        ? "warning"
                        : "danger"
                    }
                  >
                    {initialData.status}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#171717]">Bill Product & Account Lines</h3>

            <div className="overflow-x-auto border border-[#E2D9CC] rounded-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFDF8] border-b border-[#E2D9CC] text-[#3D3A36] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 w-12 text-center">Sr.</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Chart of Account (Expense)</th>
                    <th className="px-3 py-2">Budget Analytics</th>
                    <th className="px-3 py-2 w-24 text-right">Qty</th>
                    <th className="px-3 py-2 w-28 text-right">Unit Price (₹)</th>
                    <th className="px-3 py-2 w-32 text-right">Total (₹)</th>
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
                                {p.name}
                              </option>
                            ))}
                          </Select>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        {isReadonly ? (
                          <span className="font-medium text-[#171717]">
                            {accounts.find((a) => a.id === line.chartOfAccountId)?.name || "Purchase Expense"}
                          </span>
                        ) : (
                          <Select
                            value={line.chartOfAccountId}
                            onChange={(e) => handleLineChange(idx, "chartOfAccountId", e.target.value)}
                            required
                          >
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name} ({acc.type})
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
                            <option value="">(None)</option>
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
                Add Bill Line
              </Button>
            )}

            {/* Financial Totals & Payment Summary Block */}
            <div className="flex justify-end pt-4 border-t border-[#E2D9CC]">
              <div className="w-80 bg-[#FFFDF8] border border-[#E2D9CC] p-4 rounded-sm space-y-2 text-xs">
                <div className="flex justify-between font-medium text-[#3D3A36]">
                  <span>Total Amount:</span>
                  <span className="font-semibold text-[#171717]">
                    ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-[#3D3A36]">
                  <span>Paid Via Cash:</span>
                  <span>₹{paidViaCash.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[#3D3A36]">
                  <span>Paid Via Bank:</span>
                  <span>₹{paidViaBank.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#171717] pt-2 border-t border-[#E2D9CC]">
                  <span>Amount Due:</span>
                  <span className="text-[#B91C1C]">
                    ₹{amountDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between bg-white border border-[#E2D9CC] p-4 rounded-sm">
          <Link
            href="/purchase/bills"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-sm text-xs font-semibold bg-white border border-[#E2D9CC] text-[#171717] hover:bg-[#F7F4EE]"
          >
            <ArrowLeft size={14} />
            Back
          </Link>

          <div className="flex items-center gap-3">
            {/* Secondary Actions for Paid status */}
            {!isNew && (initialData.status === "PAID" || initialData.status === "CONFIRMED" || initialData.status === "PARTIALLY_PAID") && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-1.5"
                >
                  <Printer size={14} />
                  Print
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendEmail}
                  className="gap-1.5"
                >
                  <Mail size={14} />
                  Send
                </Button>
              </>
            )}

            {/* Mutation Actions for Admin / Accountant */}
            {!isVendorPortal && isNew && (
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Saving..." : "Save Draft Bill"}
              </Button>
            )}

            {!isVendorPortal && !isNew && initialData.status === "DRAFT" && (
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
                  {loading ? "Confirming & Posting Journal..." : "Confirm Bill"}
                </Button>
              </>
            )}

            {!isVendorPortal && !isNew && (initialData.status === "CONFIRMED" || initialData.status === "PARTIALLY_PAID") && amountDue > 0 && (
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
                  onClick={() => setPaymentModalOpen(true)}
                  disabled={loading}
                  className="bg-[#B91C1C] hover:bg-[#991B1B]"
                >
                  <Wallet size={14} className="mr-1.5" />
                  Pay
                </Button>
              </>
            )}
          </div>
        </div>
      </form>

      {/* Bill Payment Modal */}
      {!isNew && initialData && (
        <BillPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={() => {
            router.refresh();
          }}
          vendorBillId={initialData.id}
          vendorName={vendors.find((v) => v.id === vendorId)?.name || initialData.vendor?.name || "Vendor"}
          amountDue={amountDue}
        />
      )}
    </div>
  );
}
