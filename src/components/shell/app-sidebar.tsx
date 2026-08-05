import { Link, useRouterState } from "@tanstack/react-router";
import { Activity } from "lucide-react";

import { navGroups } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-black/5 bg-[#F5F5F7] lg:flex">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-black/5">
        <span className="grid size-9 place-items-center rounded-2xl bg-[#0071E3] text-white shadow-md shadow-[#0071E3]/20">
          <Activity className="size-5" />
        </span>
        <div className="leading-tight">
          <h2 className="text-base font-black tracking-tight text-[#1D1D1F]">Meridian HIP</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#0071E3]">
            Hospital OS Pro
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#86868B]">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200",
                        active
                          ? "bg-white text-[#0071E3] font-bold shadow-xs border border-black/5"
                          : "text-[#515154] hover:bg-white/60 hover:text-[#1D1D1F]",
                      )}
                    >
                      <item.icon className={cn("size-4 shrink-0", active ? "text-[#0071E3]" : "text-[#86868B]")} />
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-black/5">
        <div className="rounded-2xl bg-white p-4 border border-black/5 shadow-xs text-xs">
          <div className="flex items-center gap-2 text-[#0071E3] font-bold mb-1">
            <span className="size-2 rounded-full bg-[#34C759] animate-pulse" />
            <span>Event-Driven OS</span>
          </div>
          <p className="text-[#86868B] text-[11px] leading-relaxed font-medium">
            Real-time care units synced on append-only ledger.
          </p>
        </div>
      </div>
    </aside>
  );
}
