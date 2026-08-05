import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TimelineItem = {
  id: string | number;
  time: string;
  title: string;
  detail?: ReactNode;
  tone?: "default" | "ok" | "warn" | "crit" | "accent";
};

const dotTone = {
  default: "bg-border-strong",
  accent: "bg-accent",
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
};

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>;
  }

  return (
    <ol className={cn("relative space-y-4 pl-5", className)}>
      <span className="absolute left-[5px] top-1 bottom-1 w-px bg-border" aria-hidden />
      {items.map((item) => (
        <li key={item.id} className="animate-rise relative">
          <span
            className={cn(
              "absolute -left-5 top-1.5 size-2.5 rounded-full ring-4 ring-surface",
              dotTone[item.tone ?? "default"],
            )}
            aria-hidden
          />
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="numeric text-xs text-muted-foreground">{item.time}</span>
            <span className="text-sm font-medium">{item.title}</span>
          </div>
          {item.detail ? (
            <div className="mt-1 text-xs text-muted-foreground">{item.detail}</div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
