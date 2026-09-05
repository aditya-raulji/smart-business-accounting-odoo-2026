// Customer Invoice Form Component for Urban Furniture Accounting System.
// What: Interactive form for creating, viewing, confirming, and paying Customer Invoices.
// Why: Provides line items management with Income Account mapping, Tax % breakdown, Grand Total calculation,
//      auto Journal Entry link upon confirmation, and triggers the InvoicePaymentModal (or self-pay).
// Why not alternative: Manual accounting journal creation is error-prone; this ensures automatic double-entry integrity.
// Where used: /sales/invoices/new and /sales/invoices/[id].

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
import {
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle,
  FileText,
  XCircle,
  CreditCard,
  BookOpen,
} from "lucide-react";
import {
  createCustomerInvoice,
  confirmCustomerInvoice,
  cancelCustomerInvoice,
} from "@/lib/actions/customer-invoices";
import { InvoicePaymentModal } from "@/components/sales/InvoicePaymentModal";

interface ContactOption {
  id: string;
  name: string;
  type: string;
}

interface ProductOption {
  id: string;
  name: string;
  salesPrice: number;
}

interface AccountOption {
  id: string;
  name: string;
  type: string;
}

interface AnalyticOption {
  id: string;
  name: string;
  type: string;
}

interface InvoiceLineState {
  productId: string;
  chartOfAccountId: string;
  analyticAccountId: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
}

interface CustomerInvoiceFormProps {
  initialData?: {
    id: string;
    invoiceNumber: string;
    customerId: string;
    invoiceReference?: string | null;
    invoiceDate: Date | string;
    dueDate: Date | string;
    status: "DRAFT" | "CONFIRMED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
    paidAmount: number;
    amountDue: number;
    sourceSOId?: string | null;
    sourceSO?: { id: string; soNumber: string } | null;
    journalEntryId?: string | null;
    lines: Array<{
      id?: string;
      productId: string;
      chartOfAccountId: string;
      analyticAccountId?: string | null;
      qty: number;
      unitPrice: number;
      taxRate: number;
      lineSubtotal?: number;
      lineTax?: number;
      lineTotal?: number;
      product?: { name: string };
      chartOfAccount?: { id: string; name: string };
      analyticAccount?: { id: string; name: string };
    }>;
    payments?: Array<{
      id: string;
      date: Date | string;
      amount: number;
      method: string;
      note?: string | null;
    }>;
  };
  customers: ContactOption[];
  products: ProductOption[];
  accounts: AccountOption[];
  analyticAccounts: AnalyticOption[];
  isCustomerUser?: boolean;
  prefillFromSO?: {
    soId: string;
    soNumber: string;
    customerId: string;
    lines: Array<{
      productId: string;
      analyticAccountId?: string | null;
      qty: number;
      unitPrice: number;
      taxRate: number;
    }>;
  } | null;
}

export function CustomerInvoiceForm({
  initialData,
  customers,
  products,
  accounts,
  analyticAccounts,
  isCustomerUser = false,
  prefillFromSO,
}: CustomerInvoiceFormProps) {
  const router = useRouter();
  const isNew = !initialData;
  const isReadonly = !isNew && initialData.status !== "DRAFT";

  // Form state
  const [customerId, setCustomerId] = useState(
    initialData?.customerId || prefillFromSO?.customerId || (customers[0]?.id ?? "")
  );
  const [invoiceReference, setInvoiceReference] = useState(
    initialData?.invoiceReference || (prefillFromSO ? `SO: ${prefillFromSO.soNumber}` : "")
  );
  const [invoiceDate, setInvoiceDate] = useState(
    initialData
      ? new Date(initialData.invoiceDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(
    initialData
      ? new Date(initialData.dueDate).toISOString().split("T")[0]
      : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  // Default income account
  const defaultIncomeAccount =
    accounts.find((a) => a.type === "INCOME")?.id || accounts[0]?.id || "";

  const [lines, setLines] = useState<InvoiceLineState[]>(
    initialData?.lines?.length
      ? initialData.lines.map((l) => ({
          productId: l.productId,
          chartOfAccountId: l.chartOfAccountId || defaultIncomeAccount,
          analyticAccountId: l.analyticAccountId || "",
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice),
          taxRate: Number(l.taxRate ?? 18),
        }))
      : prefillFromSO?.lines?.length
      ? prefillFromSO.lines.map((l) => ({
          productId: l.productId,
          chartOfAccountId: defaultIncomeAccount,
          analyticAccountId: l.analyticAccountId || "",
          qty: Number(l.qty),
          unitPrice: Number(l.unitPrice),
          taxRate: Number(l.taxRate ?? 18),
        }))
      : [
          {
            productId: products[0]?.id ?? "",
            chartOfAccountId: defaultIncomeAccount,
            analyticAccountId: "",
            qty: 1,
            unitPrice: products[0]?.salesPrice ? Number(products[0].salesPrice) : 0,
            taxRate: 18,
          },
        ]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Line handlers
  const handleProductChange = (index: number, productId: string) => {
    const selectedProd = products.find((p) => p.id === productId);
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      productId,
      unitPrice: selectedProd?.salesPrice ? Number(selectedProd.salesPrice) : updated[index].unitPrice,
    };
    setLines(updated);
  };

  const handleLineChange = (
    index: number,
    field: keyof InvoiceLineState,
    value: any
  ) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const addLine = () => {
    const firstProd = products[0];
    setLines([
      ...lines,
      {
        productId: firstProd?.id ?? "",
        chartOfAccountId: defaultIncomeAccount,
        analyticAccountId: "",
        qty: 1,
        unitPrice: firstProd?.salesPrice ? Number(firstProd.salesPrice) : 0,
        taxRate: 18,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  // Calculations
  const lineCalculations = lines.map((l) => {
    const subtotal = (Number(l.qty) || 0) * (Number(l.unitPrice) || 0);
    const tax = subtotal * ((Number(l.taxRate) || 0) / 100);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  });

  const untaxedTotal = lineCalculations.reduce((sum, item) => sum + item.subtotal, 0);
  const taxTotal = lineCalculations.reduce((sum, item) => sum + item.tax, 0);
  const grandTotal = untaxedTotal + taxTotal;
  const paidAmount = initialData ? Number(initialData.paidAmount) : 0;
  const amountDue = initialData ? Number(initialData.amountDue) : grandTotal;

  // Actions
  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    if (lines.length === 0) {
      setError("At least 1 invoice line item is required.");
      return;
    }

    for (const [i, l] of lines.entries()) {
      if (!l.productId) {
        setError(`Line ${i + 1}: Please select a product.`);
        return;
      }
      if (!l.chartOfAccountId) {
        setError(`Line ${i + 1}: Please select an Income Account.`);
        return;
      }
      if (l.qty <= 0) {
        setError(`Line ${i + 1}: Quantity must be greater than 0.`);
        return;
      }
      if (l.unitPrice < 0) {
        setError(`Line ${i + 1}: Unit price cannot be negative.`);
        return;
      }
    }

    setLoading(true);

    const res = await createCustomerInvoice({
      customerId,
      invoiceReference: invoiceReference || null,
      invoiceDate,
      dueDate,
      sourceSOId: prefillFromSO?.soId || null,
      lines: lines.map((l) => ({
        productId: l.productId,
        chartOfAccountId: l.chartOfAccountId,
        analyticAccountId: l.analyticAccountId || null,
        qty: Number(l.qty),
        unitPrice: Number(l.unitPrice),
        taxRate: Number(l.taxRate),
      })),
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.id) {
      router.push(`/sales/invoices/${res.id}`);
      router.refresh();
    }
  };

  const handleConfirm = async () => {
    if (!initialData) return;
    setError(null);
    setLoading(true);

    const res = await confirmCustomerInvoice(initialData.id);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.refresh();
    }
  };

  const handleCancel = async () => {
    if (!initialData) return;
    if (!confirm("Are you sure you want to cancel this Customer Invoice?")) return;

    setError(null);
    setLoading(true);

    const res = await cancelCustomerInvoice(initialData.id);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      router.refresh();
    }
  };

  const currentCustomerName =
    customers.find((c) => c.id === customerId)?.name || "Customer";

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          isNew
            ? prefillFromSO
              ? `New Invoice from ${prefillFromSO.soNumber}`
              : "New Customer Invoice"
            : `Invoice: ${initialData.invoiceNumber}`
        }
        subtitle={
          isNew
            ? "Create and dispatch customer tax invoice with double-entry journal posting."
            : `Invoice Date: ${new Date(initialData.invoiceDate).toLocaleDateString("en-IN")}`
        }
        action={
          <div className="flex items-center gap-2">
            {!isNew &&
              (initialData.status === "CONFIRMED" ||
                initialData.status === "PARTIALLY_PAID") &&
              amountDue > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsPaymentModalOpen(true)}
                >
                  <CreditCard size={14} className="mr-1" />
                  {isCustomerUser ? "Pay Now" : "Register Payment"}
                </Button>
              )}
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-sm">
          {error}
        </div>
      )}

      {/* Linked Sales Order Notice */}
      {!isNew && initialData.sourceSO && (
        <div className="bg-[#FFFDF8] border border-[#E2D9CC] p-4 rounded-sm flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[#171717]">
            <CheckCircle size={16} className="text-green-600" />
            <span>
              This invoice originated from Sales Order:{" "}
              <strong>{initialData.sourceSO.soNumber}</strong>
            </span>
          </div>
          <Link
            href={`/sales/orders/${initialData.sourceSO.id}`}
            className="text-xs font-semibold text-[#B91C1C] hover:underline"
          >
            View Sales Order →
          </Link>
        </div>
      )}

      {/* Auto Journal Entry Banner */}
      {!isNew && initialData.journalEntryId && (
        <div className="bg-[#FFFDF8] border border-[#E2D9CC] p-4 rounded-sm flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[#171717]">
            <BookOpen size={16} className="text-[#B91C1C]" />
            <span>
              Double-Entry Auto Journal Entry posted under <strong>Sales Journal</strong> (Debtors Dr = Sales Income Cr + Tax Payable Cr).
            </span>
          </div>
          <Link
            href="/accounting/journal-entries"
            className="text-xs font-semibold text-[#B91C1C] hover:underline"
          >
            View in Journal Entries →
          </Link>
        </div>
      )}

      <form onSubmit={handleSaveDraft} className="space-y-6">
        <Card>
          {/* Header Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-6 border-b border-[#E2D9CC]">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3D3A36] mb-1">
                Customer *
              </label>
              {isReadonly || isCustomerUser ? (
                <div className="text-sm font-semibold text-[#171717]">
                  {currentCustomerName}
                </div>
              ) : (
                <Select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3D3A36] mb-1">
                Reference / Memo
              </label>
              {isReadonly ? (
                <div className="text-sm text-[#171717]">
                  {invoiceReference || "—"}
                </div>
              ) : (
                <Input
                  type="text"
                  placeholder="e.g. Cust PO #1042"
                  value={invoiceReference}
                  onChange={(e) => setInvoiceReference(e.target.value)}
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3D3A36] mb-1">
                Invoice Date *
              </label>
              {isReadonly ? (
                <div className="text-sm text-[#171717]">
                  {new Date(invoiceDate).toLocaleDateString("en-IN")}
                </div>
              ) : (
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3D3A36] mb-1">
                Due Date *
              </label>
              {isReadonly ? (
                <div className="text-sm text-[#171717]">
                  {new Date(dueDate).toLocaleDateString("en-IN")}
                </div>
              ) : (
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              )}
            </div>

            {!isNew && (
              <div className="col-span-full pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#3D3A36] mb-1">
                  Status
                </label>
                <div>
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
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-bold text-[#171717]">Invoice Product & Account Lines</h3>

            <div className="overflow-x-auto border border-[#E2D9CC] rounded-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFDF8] border-b border-[#E2D9CC] text-[#3D3A36] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 w-12 text-center">Sr.</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Income Account (Cr)</th>
                    <th className="px-3 py-2">Budget Analytics</th>
                    <th className="px-3 py-2 w-20 text-right">Qty</th>
                    <th className="px-3 py-2 w-24 text-right">Price (₹)</th>
                    <th className="px-3 py-2 w-20 text-right">Tax %</th>
                    <th className="px-3 py-2 w-24 text-right">Tax (₹)</th>
                    <th className="px-3 py-2 w-28 text-right">Total (₹)</th>
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
                          <span className="text-[#171717]">
                            {accounts.find((a) => a.id === line.chartOfAccountId)?.name || "Sales Income"}
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
                            {analyticAccounts.find((a) => a.id === line.analyticAccountId)?.name || "—"}
                          </span>
                        ) : (
                          <Select
                            value={line.analyticAccountId}
                            onChange={(e) => handleLineChange(idx, "analyticAccountId", e.target.value)}
                          >
                            <option value="">None</option>
                            {analyticAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.type})
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
                            min="1"
                            step="1"
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

                      <td className="px-3 py-2 text-right">
                        {isReadonly ? (
                          <span>{line.taxRate}%</span>
                        ) : (
                          <Select
                            value={line.taxRate}
                            onChange={(e) => handleLineChange(idx, "taxRate", parseFloat(e.target.value) || 0)}
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </Select>
                        )}
                      </td>

                      <td className="px-3 py-2 text-right text-[#78716C]">
                        ₹{lineCalculations[idx].tax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="px-3 py-2 text-right font-semibold text-[#171717]">
                        ₹{lineCalculations[idx].total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

            {/* Total Summary Footer */}
            <div className="flex justify-end pt-4 border-t border-[#E2D9CC]">
              <div className="w-80 bg-[#FFFDF8] border border-[#E2D9CC] p-4 rounded-sm space-y-2 text-xs">
                <div className="flex justify-between text-[#3D3A36]">
                  <span>Untaxed Amount:</span>
                  <span>
                    ₹{untaxedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-[#78716C]">
                  <span>Tax Amount (18% / Itemized):</span>
                  <span>
                    ₹{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#171717] pt-2 border-t border-[#E2D9CC]">
                  <span>Grand Total:</span>
                  <span className="text-[#B91C1C]">
                    ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {!isNew && (
                  <>
                    <div className="flex justify-between text-green-700 pt-1">
                      <span>Paid to Date:</span>
                      <span>
                        - ₹{paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-[#171717] pt-2 border-t border-[#E2D9CC]">
                      <span>Amount Due:</span>
                      <span className={amountDue > 0 ? "text-[#B91C1C]" : "text-green-700"}>
                        ₹{amountDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between bg-white border border-[#E2D9CC] p-4 rounded-sm">
          <Link
            href="/sales/invoices"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-sm text-xs font-semibold bg-white border border-[#E2D9CC] text-[#171717] hover:bg-[#F7F4EE]"
          >
            <ArrowLeft size={14} />
            Back to Customer Invoices
          </Link>

          <div className="flex items-center gap-3">
            {isNew && (
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Saving..." : "Save Draft Invoice"}
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
                  {loading ? "Posting Journal..." : "Confirm Invoice"}
                </Button>
              </>
            )}

            {!isNew &&
              (initialData.status === "CONFIRMED" ||
                initialData.status === "PARTIALLY_PAID") &&
              amountDue > 0 && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setIsPaymentModalOpen(true)}
                >
                  <CreditCard size={14} className="mr-1" />
                  {isCustomerUser ? "Pay Now" : "Register Payment"}
                </Button>
              )}
          </div>
        </div>
      </form>

      {/* Payment Modal */}
      {!isNew && (
        <InvoicePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => router.refresh()}
          customerInvoiceId={initialData.id}
          customerName={currentCustomerName}
          amountDue={amountDue}
          isCustomerSelfPay={isCustomerUser}
        />
      )}
    </div>
  );
}
