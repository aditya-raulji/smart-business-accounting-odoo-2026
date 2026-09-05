// Bill Payment Modal Component for Urban Furniture Accounting System.
// Yeh modal Vendor Bill par money outgoing payment (Direction: SEND) record karne ka dialog window hai.
// Specification §2.5 Compliance:
// - Payment Type: "Send" (defaulted and disabled as this is vendor bill payment).
// - Partner: Vendor Name (auto-filled & read-only).
// - Amount: Pre-filled with current Amount Due, editable for partial payment.
// - Payment Via: Dropdown "Bank" (default) or "Cash".
// - Note: Optional free-text field.
// Action: Submitting calls recordBillPayment server action, updating bill status and posting automatic double-entry journal items.
// Used by: VendorBillForm component when `Pay` button is clicked.

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { X, Wallet, CheckCircle } from "lucide-react";
import { recordBillPayment } from "@/lib/actions/payments";
import { PaymentMethod } from "@prisma/client";

interface BillPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vendorBillId: string;
  vendorName: string;
  amountDue: number;
}

export function BillPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  vendorBillId,
  vendorName,
  amountDue,
}: BillPaymentModalProps) {
  const [amount, setAmount] = useState<number>(amountDue);
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [paymentVia, setPaymentVia] = useState<PaymentMethod>(PaymentMethod.BANK);
  const [note, setNote] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError("Payment amount 0 se badi honi chahiye.");
      return;
    }

    if (amount > amountDue + 0.01) {
      setError(`Amount due ₹${amountDue.toFixed(2)} se badi payment allow nahi hai.`);
      return;
    }

    setLoading(true);

    const res = await recordBillPayment({
      vendorBillId,
      amount: Number(amount),
      date,
      paymentVia,
      note: note || undefined,
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#FFFDF8] border border-[#E2D9CC] rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2D9CC] flex items-center justify-between bg-[#171717] text-white">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-[#B91C1C]" />
            <h2 className="text-base font-semibold">Record Vendor Bill Payment</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#A8A29E] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Payment Type */}
            <div>
              <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
                Payment Type
              </label>
              <Select value="SEND" disabled className="bg-[#F7F4EE]">
                <option value="SEND">Send (Vendor Outgoing Payment)</option>
                <option value="RECEIVE">Receive (Customer Incoming)</option>
              </Select>
            </div>

            {/* Partner / Vendor Name */}
            <div>
              <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
                Vendor Partner
              </label>
              <Input type="text" value={vendorName} disabled className="bg-[#F7F4EE]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0.01"
                max={amountDue}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
              />
              <p className="text-[11px] text-[#A8A29E] mt-0.5">
                Current Due: ₹{amountDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Payment Via */}
          <div>
            <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
              Payment Via <span className="text-red-500">*</span>
            </label>
            <Select
              value={paymentVia}
              onChange={(e) => setPaymentVia(e.target.value as PaymentMethod)}
              required
            >
              <option value="BANK">Bank Account Transfer</option>
              <option value="CASH">Physical Cash</option>
            </Select>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-semibold text-[#3D3A36] mb-1">
              Internal Note / Reference (Optional)
            </label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. NEFT Reference #987654321"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[#E2D9CC] flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              <CheckCircle size={14} className="mr-1.5" />
              {loading ? "Posting Payment..." : "Confirm Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
