// Select UI primitive for Urban Furniture Accounting System.
// What: A styled <select> element with label, error display, and forwardRef for react-hook-form.
// Why: Native <select> elements are used instead of a custom dropdown to avoid keyboard-trap
//      focus management complexity and accessibility work that a custom dropdown requires.
//      The styled wrapper matches the Input primitive visually.
// Why not: A custom popover-based dropdown (like Radix Select) would offer more styling control
//          but adds significant complexity and bundle size for a form that works fine with native
//          semantics in this context.
// Used by: Contact type, product type, account type, journal type, role, and budget status forms.

"use client";

import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  wrapperClassName?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
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
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
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
