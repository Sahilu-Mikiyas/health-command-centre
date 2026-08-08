import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Lock, RefreshCw, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { LicenseLockScreen } from "@/components/hip/license-gate";
import { isLockedOut } from "@/lib/hip/license";
import { notificationSettingsQuery, thresholdsFrom } from "@/lib/hip/notifications";
import { myProfileQuery } from "@/lib/hip/queries";
import { getDefaultRedirect, hasRouteAccess, ROLE_LABELS, type AppRole } from "@/lib/hip/rbac";

export function RouteGuard({
  route,
  children,
}: {
  route: string;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: me, isLoading } = useQuery(myProfileQuery);
  const { data: notifySettings } = useQuery(notificationSettingsQuery);
  const roles = me?.roles ?? ["super_admin"];
  const primaryRole = (roles[0] ?? "super_admin") as AppRole;
  const isAllowed = hasRouteAccess(roles, route);
  const licenseLocked = isLockedOut(
    me?.baseRoles ?? roles,
    me?.staff?.license_expiry,
    thresholdsFrom(notifySettings),
  );

  const activeOverride = typeof window !== "undefined" ? localStorage.getItem("furii_active_role_override") : null;

  const resetToAdmin = () => {
    localStorage.removeItem("furii_active_role_override");
    toast.success("Exited testing mode. Reset to Super Admin.");
    queryClient.invalidateQueries();
    void router.navigate({ to: "/admin" });
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="text-xs font-bold text-[#86868B] animate-pulse">Checking security permissions…</p>
      </div>
    );
  }

  if (licenseLocked) {
    return (
      <LicenseLockScreen
        role={(me?.baseRoles?.[0] ?? primaryRole) as AppRole}
        expiry={me?.staff?.license_expiry}
        licenseNumber={me?.staff?.license_number}
      />
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
              Your active perspective (<strong className="text-black">{ROLE_LABELS[primaryRole]}</strong>) does not have permission to access the <code className="bg-[#F5F5F7] px-2 py-0.5 rounded text-black font-mono">{route}</code> module.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {activeOverride && (
              <button
                onClick={resetToAdmin}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer scale-105"
              >
                <RefreshCw className="size-3.5" /> Exit Testing Mode & Open Admin
              </button>
            )}

            <Link
              to={defaultPage}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#F5F5F7] border border-black/10 px-6 py-3 text-xs font-bold text-black hover:bg-white transition-all cursor-pointer"
            >
              Go to Authorized Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
