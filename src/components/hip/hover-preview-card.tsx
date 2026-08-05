import type { ReactNode } from "react";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

/** Hover reveals detail without a click. Used by task cards, medicine cards, map zones. */
export function HoverPreviewCard({
  trigger,
  children,
  className,
  align = "start",
  side = "right",
}: {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <HoverCard openDelay={90} closeDelay={60}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        className={cn("w-80 border-border bg-popover p-0 text-popover-foreground", className)}
      >
        {children}
      </HoverCardContent>
    </HoverCard>
  );
}

export function PreviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2 text-sm">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
