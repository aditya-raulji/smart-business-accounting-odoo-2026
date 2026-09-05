// Button UI primitive for Urban Furniture Accounting System.
// What: A typed React button component supporting primary (brand-red) and secondary (ink outline)
//       variants, a loading state, and optional icon, matching §3.3 of the design spec exactly.
// Why: Centralising the button in one component means every CTA in the app shares the same
//      hover animation, focus ring, and disabled state — a single CSS change here updates all
//      buttons simultaneously. Without this primitive, colour/radius drift is inevitable.
// Why not: Using a UI kit (shadcn Button) would be faster but its default rounding (6-8px)
//          conflicts with the brand's 2px border-radius rule; overriding it everywhere is more
//          work than building one small primitive.
// Used by: Every form, list page header, modal, and card action throughout the app.

"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-[#B91C1C] text-[#FFFDF8]",
    "hover:bg-[#991818] active:bg-[#7F1D1D]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" "),
  secondary: [
    "bg-transparent text-[#171717] border border-[#171717]",
    "hover:bg-[#171717] hover:text-[#FFFDF8]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" "),
  outline: [
    "bg-transparent text-[#171717] border border-[#D4CCC0]",
    "hover:bg-[#F7F4EE] hover:border-[#171717]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" "),
  ghost: [
    "bg-transparent text-[#3D3A36]",
    "hover:bg-[#E5DED2]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" "),
  danger: [
    "bg-[#7F1D1D] text-[#FFFDF8]",
    "hover:bg-[#991818]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ].join(" "),
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-6 py-3.5 text-sm",
  lg: "px-8 py-4 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", isLoading, size = "md", className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={[
          "inline-flex items-center justify-center gap-2",
          "font-semibold tracking-wide transition-all duration-200",
          "rounded-sm", // 2px border-radius per spec §3.3
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C] focus-visible:ring-offset-2",
          variantStyles[variant],
          sizeStyles[size],
          className,
        ].join(" ")}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Processing…
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";
