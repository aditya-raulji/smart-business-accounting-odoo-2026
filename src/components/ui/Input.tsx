// Input UI primitive for Urban Furniture Accounting System.
// What: A styled text/email/password input with label, helper text, and error state display.
//       Designed for use with react-hook-form via the ref forwarding pattern.
// Why: react-hook-form's register() returns { ref, onChange, onBlur, name } — forwardRef allows
//      this to work seamlessly without manual ref wiring in every form component. Centralizing
//      the error display here means we never forget to show field errors.
// Why not: Uncontrolled inputs without register() would lose RHF's dirty tracking and
//          validation integration. A plain wrapper without forwardRef can't be used with register().
// Used by: All form pages — login, signup, create user, contacts, products, journals, etc.

"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, wrapperClassName = "", className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[12px] font-medium uppercase tracking-[1.5px] text-[#3D3A36]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "w-full px-3 py-2.5 bg-[#FFFDF8] border text-[#171717] text-sm",
            "rounded-sm placeholder:text-[#D4CCC0]",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent",
            error
              ? "border-[#B91C1C] bg-red-50"
              : "border-[#D4CCC0] hover:border-[#3D3A36]",
            className,
          ].join(" ")}
          {...props}
        />
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
Input.displayName = "Input";
