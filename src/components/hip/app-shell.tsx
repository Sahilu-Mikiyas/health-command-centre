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
    <div className="flex min-h-screen bg-[#F5F5F7] text-black selection:bg-black selection:text-white">
      <AppSidebar />

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
        {/* Apple Translucent Glass Header */}
        <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="text-[#86868B] hover:text-black lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h1 className="truncate text-2xl font-black tracking-tight text-black">{title}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E8E8ED] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black border border-black/10">
                    <Sparkles className="size-3" /> Apple OS Pro
                  </span>
                </div>
                {subtitle ? (
                  <p className="truncate text-xs font-medium text-[#86868B] mt-0.5">{subtitle}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick Command Search Pill */}
              <button
                onClick={() => alert("Apple System Command (⌘K) ready: Search patients, beds, doctors & active Rx.")}
                className="hidden sm:inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#F5F5F7] px-3.5 py-1.5 text-xs font-semibold text-[#1D1D1F] hover:border-black hover:bg-white transition-all shadow-2xs"
              >
                <Search className="size-3.5 text-[#515154]" />
                <span>Search system...</span>
                <kbd className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-mono text-black border border-black/10 shadow-2xs">
                  ⌘K
                </kbd>
              </button>

              {actions}

              {/* User Profile Pill */}
              <div className="hidden sm:flex items-center gap-3 border-l border-black/5 pl-3">
                <div className="relative grid size-9 place-items-center rounded-full bg-black text-sm font-bold text-white shadow-2xs">
                  {me?.profile?.full_name?.charAt(0) ?? "D"}
                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-[#34C759] border-2 border-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-black">{me?.profile?.full_name ?? "Dr. Sarah Hana"}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">
                    {me?.roles?.[0]?.replace(/_/g, " ") ?? "Medical Director"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                className="rounded-full border border-black/10 bg-[#F5F5F7] p-2 text-[#86868B] transition-colors hover:bg-[#FDE8E7] hover:border-[#F9BDBD] hover:text-[#D70015]"
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
