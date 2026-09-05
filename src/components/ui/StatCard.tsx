// StatCard UI primitive for Urban Furniture Accounting System.
// What: A dashboard stat card showing an icon, an eyebrow label (uppercase small text),
//       and a large animated number. Used in the role-aware dashboard stat row.
// Why: Dashboard numbers must count up on load (spec §3.5) and maintain a consistent visual
//      structure — icon top-right, label top-left, big number filling the card. Centralizing
//      this in one component means all dashboard stats update together when the spec changes.
// Why not: Individual stat divs with inline styles would scatter the count-up animation and
//          make adding a new stat card a copy-paste exercise with drift risk.
// Used by: /dashboard — Sales, Purchase, Budget stat rows.

"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
  subStats?: { label: string; value: number }[];
  accentColor?: string;
}

// useCountUp: Animates a number from 0 to `target` over `duration` ms using requestAnimationFrame.
// Why: CSS transitions can't directly animate number content; rAF gives smooth 60fps counting.
// Why not: A third-party counter library adds bundle weight for a simple linear animation.
function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const raf = useRef<number>(0);

  useEffect(() => {
    startTime.current = null;

    function step(timestamp: number) {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) {
        raf.current = requestAnimationFrame(step);
      }
    }

    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return count;
}

export function StatCard({
  label,
  value,
  icon,
  subStats,
  accentColor = "#B91C1C",
}: StatCardProps) {
  const count = useCountUp(value);

  return (
    <div className="bg-[#FFFDF8] border border-[#D4CCC0] rounded-[4px] p-6 flex flex-col gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] animate-fade-up">
      {/* Header row: label + icon */}
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#3D3A36]">
          {label}
        </span>
        {icon && (
          <div
            className="w-9 h-9 rounded-sm flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Big animated number */}
      <div
        className="text-4xl font-semibold animate-count-up"
        style={{ color: "#171717", fontFamily: "var(--font-inter)" }}
      >
        {count.toLocaleString("en-IN")}
      </div>

      {/* Sub-stats (e.g., Confirmed: 3 / Draft: 2) */}
      {subStats && subStats.length > 0 && (
        <div className="flex gap-4 pt-2 border-t border-[#E5DED2]">
          {subStats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[1.5px] text-[#3D3A36]">
                {s.label}
              </span>
              <span className="text-base font-semibold text-[#171717]">
                {s.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
