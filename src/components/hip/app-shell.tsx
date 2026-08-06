import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Lock, LogOut, Menu, RefreshCw, Search, ShieldAlert, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { CommandPalette } from "@/components/hip/command-palette";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { navGroups } from "@/components/shell/nav-config";
import { supabase } from "@/integrations/supabase/client";
import { myProfileQuery } from "@/lib/hip/queries";
import { ROLE_LABELS, type AppRole } from "@/lib/hip/rbac";

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: me } = useQuery(myProfileQuery);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPass, setUpdatingPass] = useState(false);

  const primaryRole = (me?.roles?.[0] ?? "super_admin") as AppRole;
  const roleDisplay = ROLE_LABELS[primaryRole] ?? "Super Admin";

  const activeOverride = typeof window !== "undefined" ? localStorage.getItem("furii_active_role_override") : null;

  const resetTestingRole = () => {
    localStorage.removeItem("furii_active_role_override");
    toast.success("Exited testing perspective. Reset to Super Admin.");
    queryClient.invalidateQueries();
    void router.navigate({ to: "/admin" });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await router.navigate({ to: "/auth" });
  };

  const handleFirstTimePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match. Please re-enter.");
      return;
    }

    setUpdatingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });
      if (error) throw error;

      toast.success("Password updated successfully! Welcome to your private workspace.");
      setNewPassword("");
      setConfirmPassword("");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setUpdatingPass(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F5F5F7] text-black selection:bg-black selection:text-white">
      <AppSidebar />

      {/* Real Apple Command Palette (⌘K) Modal */}
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* First-Time Login Password Change Security Modal */}
      {me?.mustChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="apple-card max-w-md w-full p-6 text-left space-y-4 animate-in zoom-in-95 shadow-2xl border-2 border-black/10">
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <div className="grid size-10 place-items-center rounded-2xl bg-black text-white shadow-md">
                <Lock className="size-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-black text-base">First-Time Login Security Setup</h3>
                <p className="text-xs text-[#86868B]">Create your private password to protect your account</p>
              </div>
            </div>

            <p className="text-xs text-[#515154] leading-relaxed">
              Your account was provisioned with a temporary password. Please set a new private password known only to you before proceeding into your workspace.
            </p>

            <form onSubmit={handleFirstTimePasswordChange} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">New Private Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={updatingPass}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer mt-2"
              >
                {updatingPass ? "Updating Password…" : "Set New Private Password & Enter Workspace"}
              </button>
            </form>
          </div>
        </div>
      )}

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="relative flex w-72 flex-col gap-6 overflow-y-auto border-r border-black/5 bg-[#F5F5F7] p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="self-end text-[#86868B] hover:text-black"
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="pb-2 text-[10px] uppercase font-bold tracking-widest text-[#86868B]">
                  {group.label}
                </p>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-black hover:bg-white transition-all"
                      >
                        <item.icon className="size-4 text-black" />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Active Role Testing Banner (if override active) */}
        {activeOverride && (
          <div className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-[#FFE0B2] bg-[#FFF4E5] px-6 py-2 text-xs font-bold text-[#B86200]">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#FFE0B2] px-2 py-0.5 text-[10px] font-black uppercase">
                Testing Role Perspective: {ROLE_LABELS[activeOverride as AppRole] ?? activeOverride}
              </span>
            </div>
            <button
              onClick={resetTestingRole}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#B86200] px-3 py-1 text-xs font-bold text-white hover:bg-black transition-colors cursor-pointer"
            >
              <RefreshCw className="size-3" /> Exit & Return to Admin
            </button>
          </div>
        )}

        {/* Global Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-black/5 bg-white/80 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="grid size-9 place-items-center rounded-xl border border-black/5 lg:hidden text-black hover:bg-[#F5F5F7]"
              onClick={() => setMobileOpen(true)}
              aria-label="Open mobile menu"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <h1 className="font-extrabold text-black text-base">{title}</h1>
              {subtitle ? <p className="text-xs text-[#86868B] font-medium">{subtitle}</p> : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-2xl border border-black/5 bg-[#F5F5F7] px-3.5 py-2 text-xs font-bold text-[#86868B] hover:bg-white hover:text-black transition-all cursor-pointer shadow-2xs"
            >
              <Search className="size-3.5 text-black" />
              <span>Search system...</span>
              <kbd className="rounded-md bg-white border border-black/10 px-1.5 py-0.5 text-[10px] font-mono text-black">
                ⌘K
              </kbd>
            </button>

            {actions}

            {me ? (
              <div className="flex items-center gap-2 border-l border-black/10 pl-3">
                <div className="grid size-8 place-items-center rounded-full bg-black text-white text-xs font-bold shadow-2xs">
                  {me.email.charAt(0).toUpperCase() || "S"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="font-bold text-black text-xs leading-none">
                    {me.email.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-[#86868B] font-semibold">{roleDisplay}</p>
                </div>
                <button
                  onClick={signOut}
                  className="rounded-xl border border-black/10 bg-[#F5F5F7] p-2 text-black hover:bg-black hover:text-white transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="size-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
