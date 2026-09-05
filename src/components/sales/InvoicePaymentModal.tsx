// Invoice Payment Modal Component for Urban Furniture Accounting System.
// What: Dialog window for recording incoming customer payments against Customer Invoices (Direction: RECEIVE).
// Why: Enables both internal accountants and self-service customers to register full or partial payments.
//      Submitting automatically posts a balanced double-entry Bank/Cash vs Debtors Journal Entry.
// Why not alternative: Separate payment screens cause discrepancies between invoices and cash ledger balances.
// Where used: CustomerInvoiceForm component (/sales/invoices/[id]) when "Register Payment" or "Pay Now" is clicked.

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { X, Wallet, CheckCircle } from "lucide-react";
import { recordInvoicePayment } from "@/lib/actions/payments";
import { PaymentMethod } from "@prisma/client";

interface InvoicePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerInvoiceId: string;
  customerName: string;
  amountDue: number;
  isCustomerSelfPay?: boolean;
}

export function InvoicePaymentModal({
  isOpen,
  onClose,
  onSuccess,
  customerInvoiceId,
  customerName,
  amountDue,
  isCustomerSelfPay = false,
}: InvoicePaymentModalProps) {
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
      setError("Payment amount must be greater than 0.");
      return;
    }

    if (amount > amountDue + 0.01) {
      setError(`Payment amount cannot exceed remaining due ₹${amountDue.toFixed(2)}.`);
      return;
    }

    setLoading(true);

    const res = await recordInvoicePayment({
      customerInvoiceId,
      amount: Number(amount),
      date,
      paymentVia,
      note: note || (isCustomerSelfPay ? "Online customer self-payment" : undefined),
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
            <h2 className="text-base font-semibold">
              {isCustomerSelfPay ? "Pay Customer Invoice" : "Register Customer Payment"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#A8A29E] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-sm text-xs">
              {error}
            </div>
          )}

          {/* Payment Direction - Fixed to Receive */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#3D3A36] mb-1">
              Payment Direction
            </label>
            <Input
              type="text"
              value="Receive (Inbound Customer Payment)"
              disabled
              className="bg-[#F7F4EE] text-[#3D3A36] font-medium"
            />
          </div>

          {/* Partner - Read Only Customer */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#3D3A36] mb-1">
              Customer
            </label>
            <Input
              type="text"
              value={customerName}
              disabled
              className="bg-[#F7F4EE] text-[#171717] font-semibold"
            />
          </div>

          {/* Payment Amount and Due Reference */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3D3A36]">
                Amount (₹) *
              </label>
              <span className="text-xs text-[#78716C]">
                Total Due: <strong className="text-[#B91C1C]">₹{amountDue.toFixed(2)}</strong>
              </span>
            </div>
            <Input
              type="number"
              min="0.01"
              max={amountDue}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              required
            />
            <p className="text-[11px] text-[#78716C] mt-1">
              Enter full amount or lesser amount for partial payment.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Payment Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3D3A36] mb-1">
                Payment Date *
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3D3A36] mb-1">
                Payment Via *
              </label>
              <Select
                value={paymentVia}
                onChange={(e) => setPaymentVia(e.target.value as PaymentMethod)}
                required
              >
                <option value={PaymentMethod.BANK}>Bank Transfer / Cheque</option>
                <option value={PaymentMethod.CASH}>Cash</option>
              </Select>
            </div>
          </div>

          {/* Note / Memo */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#3D3A36] mb-1">
              Payment Memo / Note
            </label>
            <Textarea
              rows={2}
              placeholder="e.g. UPI Ref #, NEFT Txn ID, or Cheque number"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Accounting Impact Notice */}
          <div className="bg-[#FFFDF8] border border-[#E2D9CC] p-3 rounded text-xs text-[#3D3A36]">
            <p className="font-semibold text-[#171717] mb-0.5">Automated Double-Entry Impact:</p>
            <p className="text-[#78716C]">
              Debit: <strong>{paymentVia === PaymentMethod.BANK ? "Bank Account" : "Cash Account"}</strong> (Asset increases)
              <br />
              Credit: <strong>Debtors Account</strong> (Accounts Receivable decreases)
            </p>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2D9CC]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
            >
              <CheckCircle size={14} className="mr-1" />
              {loading ? "Processing Payment..." : isCustomerSelfPay ? "Confirm & Pay Now" : "Post Payment Receipt"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
