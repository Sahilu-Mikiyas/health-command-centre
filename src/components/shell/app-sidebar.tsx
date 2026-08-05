import { Link, useRouterState } from "@tanstack/react-router";
import { Activity } from "lucide-react";

import { navGroups } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/70 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-sm font-bold text-white shadow-md shadow-indigo-500/20">
          <Activity className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-base font-extrabold tracking-tight text-slate-900">Meridian HIP</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
            Hospital Intelligence
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                        active
                          ? "bg-indigo-50 text-indigo-700 font-semibold shadow-xs border border-indigo-100"
                          : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900",
                      )}
                    >
                      <item.icon className={cn("size-4 shrink-0", active ? "text-indigo-600" : "text-slate-400")} />
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50/80 p-3 border border-indigo-100/80 text-xs">
          <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-1">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Event-Driven OS</span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            All departments synced via real-time append-only event ledger.
          </p>
        </div>
      </div>
    </aside>
  );
}
