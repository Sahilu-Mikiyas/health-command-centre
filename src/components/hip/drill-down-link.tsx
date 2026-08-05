import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type LinkProps = ComponentProps<typeof Link>;

/** Nothing is a dead end: every entity links into the workspace that owns it. */
export function DrillDownLink({
  children,
  className,
  ...linkProps
}: LinkProps & { children: ReactNode }) {
  return (
    <Link
      {...linkProps}
      className={cn(
        "group inline-flex items-center gap-1 text-accent underline-offset-4 transition-colors hover:text-accent-glow hover:underline",
        className,
      )}
    >
      {children}
      <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}
