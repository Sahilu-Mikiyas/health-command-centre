import { Check, ScanLine, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export type VerifyState = "idle" | "scanning" | "verified" | "blocked";

/** Verification ring replaces loading spinners across dispensing and check-in flows. */
export function ScanVerifyRing({
  state,
  label,
  size = 88,
}: {
  state: VerifyState;
  label?: string;
  size?: number;
}) {
  const tone =
    state === "verified"
      ? "border-ok text-ok"
      : state === "blocked"
        ? "border-crit text-crit"
        : state === "scanning"
          ? "border-accent text-accent"
          : "border-border text-muted-foreground";

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        style={{ width: size, height: size }}
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-full border-2 transition-colors duration-300",
          tone,
          state === "verified" && "bg-ok/10",
          state === "blocked" && "bg-crit/10",
        )}
      >
        {state === "scanning" ? (
          <span className="animate-sweep absolute h-full w-1/3 bg-accent/25" aria-hidden />
        ) : null}
        {state === "verified" ? (
          <Check className="size-8" />
        ) : state === "blocked" ? (
          <ShieldAlert className="size-8" />
        ) : (
          <ScanLine className={cn("size-7", state === "scanning" && "animate-status-pulse")} />
        )}
      </div>
      {label ? (
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
      ) : null}
    </div>
  );
}
