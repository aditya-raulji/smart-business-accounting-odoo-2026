// Textarea UI primitive for Urban Furniture Accounting System.
// What: A styled multi-line text input with label and error display, forwarding ref for RHF.
// Why: Identical reasoning to Input primitive — centralising label/error/border styles
//      and forwardRef makes every textarea in the app consistent and form-library compatible.
// Why not: A rich text editor (like TipTap/Quill) would be overkill for the short note/reference
//          fields in bills and payments; a plain textarea is the correct tool here.
// Used by: Payment notes, bill/invoice reference fields, and any other free-text areas.

"use client";

import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, wrapperClassName = "", className = "", id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="text-[12px] font-medium uppercase tracking-[1.5px] text-[#3D3A36]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={4}
          className={[
            "w-full px-3 py-2.5 bg-[#FFFDF8] border text-[#171717] text-sm",
            "rounded-sm resize-y placeholder:text-[#D4CCC0]",
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
Textarea.displayName = "Textarea";
