import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SplashScreen } from "@/components/hip/splash-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getDefaultRedirect, ROLE_LABELS, type AppRole } from "@/lib/hip/rbac";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Furii Hospital Prototype" },
      {
        name: "description",
        content:
          "Secure staff access to the Furii Hospital Prototype command centre and clinical workspaces.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
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
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

        if (error) {
          // Check if this email is a provisioned staff member in public.staff
          const { data: staffList } = await supabase
            .from("staff")
            .select("*")
            .ilike("job_title", `%${cleanEmail}%`);

          const staffMember = staffList && staffList.length > 0 ? staffList[0] : null;

          if (staffMember) {
            localStorage.setItem("furii_logged_in_staff_email", cleanEmail);
            localStorage.setItem("furii_active_role_override", staffMember.role);

            const roleTitle = ROLE_LABELS[staffMember.role as AppRole] ?? staffMember.role;
            const redirectPath = getDefaultRedirect([staffMember.role]);

            toast.success(`Welcome ${staffMember.full_name}! Signed in as ${roleTitle}`);

            // Trigger Welcome Splash Screen with Live Clock
            setSplashData({
              staffName: staffMember.full_name,
              roleLabel: roleTitle,
              targetRoute: redirectPath,
            });
            return;
          }

          throw error;
        }
      }

      // Successful auth sign-in
      const { data: auth } = await supabase.auth.getUser();
      const meta = (auth.user?.user_metadata ?? {}) as Record<string, unknown>;
      const roles = meta['role'] ? [String(meta['role'])] : [];
      const userMetaName = (meta['full_name'] as string) || auth.user?.email?.split("@")[0] || "Staff Member";
      const primaryRole = (roles[0] ?? "super_admin") as AppRole;
      const roleTitle = ROLE_LABELS[primaryRole] ?? "Super Admin";
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
          <h1 className="text-xl font-extrabold tracking-tight text-black">
            Furii Hospital Prototype
          </h1>
          <p className="mt-1 text-sm font-medium text-[#86868B]">
            Staff access to live hospital operations
          </p>
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
                placeholder="bezawithabte9@gmail.com"
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
