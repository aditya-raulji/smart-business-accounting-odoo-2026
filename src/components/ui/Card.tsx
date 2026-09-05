// Card UI primitive for Urban Furniture Accounting System.
// What: A container component with paper background, 1px line border, 4px radius, and 24px padding
//       as specified in §3.4. Optionally supports a very light drop shadow.
// Why: All content panels (form views, stat panels, list sections) use the same visual container.
//      A single Card primitive ensures consistency — changing one className here updates every card.
// Why not: Applying these styles inline on every div would scatter the design rules and make
//          future theming changes require a global find-and-replace.
// Used by: Dashboard stat cards, form views, kanban cards, and all content panels.

import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  shadow?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  shadow = false,
  padding = "md",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "bg-[#FFFDF8] border border-[#D4CCC0] rounded-[4px]",
        paddingStyles[padding],
        shadow ? "shadow-[0_4px_20px_rgba(0,0,0,0.04)]" : "",
        "transition-transform duration-200 hover:-translate-y-0.5",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
