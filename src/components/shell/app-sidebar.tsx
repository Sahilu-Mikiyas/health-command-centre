import { Link, useRouterState } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { navGroups } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="grid size-8 place-items-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
          H
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Meridian</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Intelligence
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-2 pb-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.to);
                const locked = item.phase > 3;
                const content = (
                  <>
                    <item.icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {locked ? <Lock className="size-3 opacity-60" /> : null}
                  </>
                );

                return (
                  <li key={item.to}>
                    {locked ? (
                      <span
                        title={`Ships in phase ${item.phase}`}
                        className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2 py-2 text-sm text-sidebar-foreground/40"
                      >
                        {content}
                      </span>
                    ) : (
                      <Link
                        to={item.to}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
