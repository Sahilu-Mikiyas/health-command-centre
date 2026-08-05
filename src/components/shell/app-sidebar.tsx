import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Shield } from "lucide-react";

import { navGroups } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#0F172A]/70 backdrop-blur-2xl lg:flex">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <span className="relative grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/30">
          <Activity className="size-6 animate-pulse" />
        </span>
        <div className="leading-tight">
          <h2 className="text-base font-black tracking-tight text-white">Meridian HIP</h2>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
            Hospital Command OS
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              {group.label}
            </p>
            <ul className="space-y-1.5">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200",
                        active
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 font-bold"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-white",
                      )}
                    >
                      <item.icon className={cn("size-4 shrink-0", active ? "text-white" : "text-slate-400")} />
                      <span className="flex-1 truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-950/80 to-slate-900/90 p-4 border border-indigo-500/30 text-xs">
          <div className="flex items-center gap-2 text-indigo-300 font-extrabold mb-1">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Event Engine Active</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed font-medium">
            Append-only ledger syncing all care units in real-time.
          </p>
        </div>
      </div>
    </aside>
  );
}
