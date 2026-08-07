import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, ShieldCheck } from "lucide-react";

import { navGroupsForRoles } from "@/components/shell/nav-config";
import { classifyLicense, formatExpiry, LICENSE_LABEL } from "@/lib/hip/license";
import { myProfileQuery } from "@/lib/hip/queries";
import { ROLE_LABELS, type AppRole } from "@/lib/hip/rbac";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: me } = useQuery(myProfileQuery);
  const roles = me?.roles ?? ["super_admin"];
  const primaryRole = (roles[0] ?? "super_admin") as AppRole;
  const groups = navGroupsForRoles(roles);
  const license = classifyLicense(me?.staff?.license_expiry);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-black/5 bg-[#F5F5F7] lg:flex">
      {/* Brand Header */}
      <div className="flex items-center gap-3 border-b border-black/5 px-6 py-5">
        <span className="grid size-9 place-items-center rounded-2xl bg-black text-white shadow-md">
          <Activity className="size-5" />
        </span>
        <div className="min-w-0 leading-tight">
          <h2 className="truncate text-base font-black tracking-tight text-black">Furii Hospital</h2>
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-[#86868B]">
            {ROLE_LABELS[primaryRole] ?? "Hospital OS"}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {groups.map((group) => (
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
                        "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-all duration-200",
                        active
                          ? "border border-black/10 bg-white font-extrabold text-black shadow-sm"
                          : "font-semibold text-[#1D1D1F] hover:bg-white/60 hover:text-black",
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
        ))}
      </nav>

      <div className="border-t border-black/5 p-4">
        <div className="shadow-2xs rounded-2xl border border-black/5 bg-white p-4 text-xs">
          <div className="mb-1 flex items-center gap-2 font-extrabold text-black">
            <ShieldCheck
              className={cn(
                "size-4",
                license.state === "locked"
                  ? "text-[#FF3B30]"
                  : license.state === "valid" || license.state === "unknown"
                    ? "text-[#34C759]"
                    : "text-[#FF9500]",
              )}
            />
            <span>{ROLE_LABELS[primaryRole] ?? "Staff"}</span>
          </div>
          {me?.staff?.license_expiry ? (
            <p className="text-[11px] font-medium leading-relaxed text-[#86868B]">
              Licence {LICENSE_LABEL[license.state]} ·{" "}
              <strong className="text-black">{formatExpiry(me.staff.license_expiry)}</strong>
            </p>
          ) : (
            <p className="text-[11px] font-medium leading-relaxed text-[#86868B]">
              Role-based access · only your workspaces are listed
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
