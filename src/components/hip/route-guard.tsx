import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Lock, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { myProfileQuery } from "@/lib/hip/queries";
import { getDefaultRedirect, hasRouteAccess, ROLE_LABELS, type AppRole } from "@/lib/hip/rbac";

export function RouteGuard({
  route,
  children,
}: {
  route: string;
  children: ReactNode;
}) {
  const { data: me, isLoading } = useQuery(myProfileQuery);
  const roles = me?.roles ?? ["super_admin"];
  const primaryRole = (roles[0] ?? "super_admin") as AppRole;
  const isAllowed = hasRouteAccess(roles, route);

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="text-xs font-bold text-[#86868B] animate-pulse">Checking security permissions…</p>
      </div>
    );
  }

  if (!isAllowed) {
    const defaultPage = getDefaultRedirect(roles);

    return (
      <div className="mx-auto max-w-xl py-12 px-4 text-center">
        <div className="apple-card p-8 space-y-6">
          <div className="grid size-16 place-items-center rounded-3xl bg-[#FDE8E7] text-[#D70015] border border-[#F9BDBD] mx-auto shadow-md">
            <Lock className="size-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F7] border border-black/10 px-3.5 py-1 text-xs font-extrabold text-black">
              <ShieldAlert className="size-3.5 text-[#FF3B30]" /> Role: {ROLE_LABELS[primaryRole] ?? "Staff"}
            </span>
            <h2 className="text-2xl font-black text-black">Access Restricted</h2>
            <p className="text-xs font-medium text-[#86868B] leading-relaxed max-w-md mx-auto">
              Your assigned staff role (<strong className="text-black">{ROLE_LABELS[primaryRole]}</strong>) does not have authorization to access the <code className="bg-[#F5F5F7] px-2 py-0.5 rounded text-black font-mono">{route}</code> workspace module.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to={defaultPage}
              className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all scale-105"
            >
              Return to Authorized Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
