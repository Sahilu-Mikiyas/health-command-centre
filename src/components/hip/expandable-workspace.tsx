import { ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Click expands a full workspace in place — no modal, no page swap. */
export function ExpandableWorkspace({
  header,
  children,
  defaultOpen = false,
  className,
}: {
  header: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "panel overflow-hidden transition-colors",
        open && "border-accent/40 bg-surface-raised",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-raised"
      >
        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-90 text-accent",
          )}
        />
        <div className="min-w-0 flex-1">{header}</div>
      </button>
      {open ? (
        <div className="animate-rise border-t border-border px-4 py-4">{children}</div>
      ) : null}
    </div>
  );
}
