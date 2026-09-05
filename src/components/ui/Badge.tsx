// Badge UI primitive for Urban Furniture Accounting System.
// What: A status indicator chip with semantic color coding for document/payment statuses.
// Why: Consistent status display across invoice lists, budget views, and order tables requires
//      a shared component. The color rules (PAID=ink/black, PENDING=red, OVERDUE=dark-red) are
//      defined in spec §3.4; centralizing them prevents drift across modules.
// Why not: Inline conditional className in each table cell would require duplicating the color
//          logic in every list component — any change to the PAID color would need to be found
//          and updated in 6+ places.
// Used by: DataTable cells for invoice status, budget status, order status.

export type BadgeVariant =
  | "paid"
  | "pending"
  | "overdue"
  | "draft"
  | "confirmed"
  | "revised"
  | "cancelled"
  | "partially_paid"
  | "posted"
  | "success"
  | "danger"
  | "warning"
  | "primary"
  | "info"
  | "default";

export interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  children?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  paid: "bg-[#171717] text-[#FFFDF8]",
  posted: "bg-[#171717] text-[#FFFDF8]",
  confirmed: "bg-[#171717] text-[#FFFDF8]",
  pending: "bg-[#B91C1C] text-[#FFFDF8]",
  partially_paid: "bg-[#B91C1C] text-[#FFFDF8]",
  overdue: "bg-[#7F1D1D] text-[#FFFDF8]",
  draft: "bg-[#E5DED2] text-[#3D3A36]",
  revised: "bg-[#E5DED2] text-[#3D3A36]",
  cancelled: "bg-[#D4CCC0] text-[#3D3A36] line-through",
  success: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  danger: "bg-red-100 text-red-800 border border-red-300",
  warning: "bg-amber-100 text-amber-800 border border-amber-300",
  primary: "bg-blue-100 text-blue-800 border border-blue-300",
  info: "bg-cyan-100 text-cyan-800 border border-cyan-300",
  default: "bg-[#E5DED2] text-[#3D3A36]",
};

export function Badge({ variant = "default", label, children, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5",
        "text-[11px] font-semibold uppercase tracking-[1.5px]",
        "rounded-sm",
        variantStyles[variant] || variantStyles.default,
        className,
      ].join(" ")}
    >
      {children ?? label}
    </span>
  );
}

// Helper: map a raw status string to the right badge variant.
// This prevents duplicating the mapping in every list page.
export function statusToBadge(status: string): { variant: BadgeVariant; label: string } {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    DRAFT: { variant: "draft", label: "Draft" },
    CONFIRMED: { variant: "confirmed", label: "Confirmed" },
    REVISED: { variant: "revised", label: "Revised" },
    CANCELLED: { variant: "cancelled", label: "Cancelled" },
    PAID: { variant: "paid", label: "Paid" },
    PENDING: { variant: "pending", label: "Pending" },
    OVERDUE: { variant: "overdue", label: "Overdue" },
    PARTIALLY_PAID: { variant: "partially_paid", label: "Partial" },
    POSTED: { variant: "posted", label: "Posted" },
  };
  return map[status] ?? { variant: "default", label: status };
}
