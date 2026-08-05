import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, ShieldCheck } from "lucide-react";

import { navGroups } from "@/components/shell/nav-config";
import { myProfileQuery } from "@/lib/hip/queries";
import { hasRouteAccess, ROLE_LABELS, type AppRole } from "@/lib/hip/rbac";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: me } = useQuery(myProfileQuery);
  const roles = me?.roles ?? ["super_admin"];
  const primaryRole = (roles[0] ?? "super_admin") as AppRole;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-black/5 bg-[#F5F5F7] lg:flex">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-black/5">
        <span className="grid size-9 place-items-center rounded-2xl bg-black text-white shadow-md">
          <Activity className="size-5" />
        </span>
        <div className="leading-tight min-w-0">
          <h2 className="text-base font-black tracking-tight text-black truncate">Furii Hospital</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#86868B] truncate">
            PROTOTYPE OS
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => hasRouteAccess(roles, item.to));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#86868B]">
                {group.label}
              </p>
              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const active = pathname.startsWith(item.to);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-all duration-200",
                          active
                            ? "bg-white text-black font-extrabold shadow-sm border border-black/10"
                            : "text-[#1D1D1F] font-semibold hover:bg-white/60 hover:text-black",
                        )}
                      >
                        <item.icon className={cn("size-4 shrink-0", active ? "text-black" : "text-[#515154]")} />
                        <span className="flex-1 truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-black/5">
        <div className="rounded-2xl bg-white p-4 border border-black/5 shadow-2xs text-xs">
          <div className="flex items-center gap-2 text-black font-extrabold mb-1">
            <ShieldCheck className="size-4 text-[#34C759]" />
            <span>Role-Based OS</span>
          </div>
          <p className="text-[#86868B] text-[11px] leading-relaxed font-medium">
            Active permissions: <strong className="text-black">{ROLE_LABELS[primaryRole] ?? "Super Admin"}</strong>
          </p>
        </div>
      </div>
    </aside>
  );
}
