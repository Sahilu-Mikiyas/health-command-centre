import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Activity, Bell, Command, LogOut, Menu, Search, Sparkles, User, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { AppSidebar } from "@/components/shell/app-sidebar";
import { navGroups } from "@/components/shell/nav-config";
import { supabase } from "@/integrations/supabase/client";
import { myProfileQuery } from "@/lib/hip/queries";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: me } = useQuery(myProfileQuery);

  const signOut = async () => {
    await supabase.auth.signOut();
    await router.navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-slate-100 selection:bg-indigo-500 selection:text-white">
      <AppSidebar />

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="relative flex w-72 flex-col gap-6 overflow-y-auto border-r border-white/10 bg-[#0F172A] p-5">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="self-end text-slate-400 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="pb-2 text-[10px] uppercase font-bold tracking-widest text-indigo-400">
                  {group.label}
                </p>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-indigo-600/20 hover:text-white transition-all"
                      >
                        <item.icon className="size-4 text-indigo-400" />
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
        {/* Top Floating Glass Header */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-2xl px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="text-slate-400 hover:text-white lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h1 className="truncate text-2xl font-black tracking-tight text-white">{title}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 border border-indigo-500/20">
                    <Sparkles className="size-3" /> OS v4.2 Pro
                  </span>
                </div>
                {subtitle ? (
                  <p className="truncate text-xs font-semibold text-slate-400 mt-0.5">{subtitle}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick Command Palette Button */}
              <button
                onClick={() => alert("Command Palette (Cmd+K) ready: Search patients, beds, doctors & active Rx.")}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:border-indigo-500/40 hover:text-white transition-all"
              >
                <Search className="size-3.5" />
                <span>Search system...</span>
                <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">
                  ⌘K
                </kbd>
              </button>

              {actions}

              {/* User Profile Badge */}
              <div className="hidden sm:flex items-center gap-3 border-l border-white/10 pl-3">
                <div className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-md shadow-indigo-500/30">
                  {me?.profile?.full_name?.charAt(0) ?? "D"}
                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-400 border-2 border-[#0B0F19]" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-white">{me?.profile?.full_name ?? "Dr. Sarah Hana"}</p>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
                    {me?.roles?.[0]?.replace(/_/g, " ") ?? "Medical Director"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                className="rounded-xl border border-white/10 bg-slate-900/60 p-2 text-slate-400 transition-colors hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-400"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-6 space-y-6">{children}</main>
      </div>
    </div>
  );
}
