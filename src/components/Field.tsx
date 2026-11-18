import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function NativeSelect({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-md border border-input bg-secondary px-3 py-1 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function StatusPill({ status }: { status: "ok" | "low" | "out" }) {
  const map = {
    ok: { label: "In stock", cls: "bg-success/15 text-success border-success/30" },
    low: { label: "Low stock", cls: "bg-warning/15 text-warning border-warning/30" },
    out: { label: "Out of stock", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  } as const;
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider",
        s.cls,
      )}
    >
      {s.label}
    </span>
  );
}
