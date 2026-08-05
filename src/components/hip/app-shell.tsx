import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { AppSidebar } from "@/components/shell/app-sidebar";
import { navGroups } from "@/components/shell/nav-config";
import { StatusRibbon } from "@/components/shell/status-ribbon";
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
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/80"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="animate-rise relative flex w-64 flex-col gap-6 overflow-y-auto border-r border-sidebar-border bg-sidebar p-4">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="self-end text-muted-foreground"
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {group.label}
                </p>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      {item.phase > 3 ? (
                        <span className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-sidebar-foreground/40">
                          <item.icon className="size-4" />
                          {item.label}
                        </span>
                      ) : (
                        <Link
                          to={item.to}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-sidebar-foreground/80"
                        >
                          <item.icon className="size-4" />
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <StatusRibbon />

        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {actions}
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium">{me?.profile?.full_name ?? me?.email ?? "—"}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {me?.roles?.[0]?.replace(/_/g, " ") ?? "staff"}
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>

        <main className="min-w-0 flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
