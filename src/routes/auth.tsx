import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SplashScreen } from "@/components/hip/splash-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useFacility } from "@/lib/hip/facility";
import { myProfileQuery } from "@/lib/hip/queries";
import { getDefaultRedirect, ROLE_LABELS, type AppRole } from "@/lib/hip/rbac";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in | Furii Health" },
      {
        name: "description",
        content:
          "Secure staff access to Furii Health clinical workspaces, diagnostics and operations.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const facility = useFacility();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  // Splash Screen State
  const [splashData, setSplashData] = useState<{
    staffName: string;
    roleLabel: string;
    targetRoute: string;
  } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName || cleanEmail.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Check your inbox to confirm your account.");
          return;
        }
      } else {
        // A wrong password is always a failed sign-in: there is no fallback path.
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      }

      // Signed in: roles come from the database (user_roles / staff roster), never
      // from user_metadata, which the account holder can edit themselves.
      localStorage.removeItem("furii_active_role_override");
      queryClient.removeQueries({ queryKey: ["me"] });
      const me = await queryClient.fetchQuery(myProfileQuery);
      const roles = me?.roles ?? [];
      const primaryRole = roles[0] as AppRole | undefined;
      const userMetaName =
        me?.profile?.full_name || me?.staff?.full_name || me?.email.split("@")[0] || "Staff Member";
      const roleTitle = primaryRole
        ? (ROLE_LABELS[primaryRole] ?? primaryRole)
        : "Awaiting role assignment";
      const redirectPath = getDefaultRedirect(roles);

      // Trigger Welcome Splash Screen with Live Clock
      setSplashData({
        staffName: userMetaName,
        roleLabel: roleTitle,
        targetRoute: redirectPath,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  if (splashData) {
    return (
      <SplashScreen
        staffName={splashData.staffName}
        roleLabel={splashData.roleLabel}
        targetRoute={splashData.targetRoute}
      />
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#F5F5F7] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid size-11 place-items-center rounded-2xl bg-black text-lg font-bold text-white shadow-md">
            F
          </span>
          <h1 className="text-xl font-extrabold tracking-tight text-black">{facility.name}</h1>
          <p className="mt-1 text-sm font-medium text-[#86868B]">{facility.tagline}</p>
        </div>

        {sent ? (
          <div className="apple-card p-5 text-sm text-[#515154]">
            We sent a confirmation link to <span className="font-bold text-black">{email}</span>. Open it
            to activate your access, then sign in.
          </div>
        ) : (
          <form onSubmit={submit} className="apple-card space-y-4 p-6 shadow-xl border border-black/5">
            {mode === "signup" ? (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Dr. Bezawit Habte"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email address</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@furii.health"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-black transition-colors cursor-pointer p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-black text-white hover:bg-slate-800 py-3 rounded-2xl font-bold cursor-pointer" disabled={busy}>
              {busy ? "Signing in…" : mode === "signin" ? "Sign in to Workspace" : "Create account"}
            </Button>
            <button
              type="button"
              className="w-full text-xs text-[#86868B] hover:text-black font-semibold cursor-pointer"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin"
                ? "No account yet? Register staff access"
                : "Already registered? Sign in"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
