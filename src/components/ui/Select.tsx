// Select UI primitive for Urban Furniture Accounting System.
// What: A styled <select> element with label, error display, and forwardRef for forms.
// Enhanced Support: Supports both `options` prop array (Phase 1) and custom `children` <option> elements (Phase 2).
// Used by: Contact type, product type, account type, journal type, role, PO form, Vendor Bill form, and payment modal.

"use client";

import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  wrapperClassName?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  children?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      wrapperClassName = "",
      className = "",
      options,
      placeholder,
      id,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-[12px] font-medium uppercase tracking-[1.5px] text-[#3D3A36]"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            "w-full px-3 py-2.5 bg-[#FFFDF8] border text-[#171717] text-sm",
            "rounded-sm appearance-none cursor-pointer",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent",
            error
              ? "border-[#B91C1C] bg-red-50"
              : "border-[#D4CCC0] hover:border-[#3D3A36]",
            className,
          ].join(" ")}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {helperText && !error && (
          <p className="text-[11px] text-[#3D3A36]">{helperText}</p>
        )}
        {error && (
          <p className="text-[11px] text-[#B91C1C] font-medium">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
