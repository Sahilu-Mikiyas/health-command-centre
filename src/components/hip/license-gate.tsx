import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, LogOut, ShieldAlert } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { classifyLicense, formatExpiry, LICENSE_LABEL } from "@/lib/hip/license";
import { myProfileQuery } from "@/lib/hip/queries";
import { ROLE_LABELS, type AppRole } from "@/lib/hip/rbac";

/** Full-page block shown when a professional licence has lapsed or is within 15 days. */
export function LicenseLockScreen({
  role,
  expiry,
  licenseNumber,
}: {
  role: AppRole;
  expiry: string | null | undefined;
  licenseNumber: string | null | undefined;
}) {
  const { days } = classifyLicense(expiry);
  const expired = (days ?? 0) < 0;

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#F5F5F7] px-4 py-12">
      <div className="apple-card w-full max-w-lg space-y-6 p-8 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-3xl border border-[#F9BDBD] bg-[#FDE8E7] text-[#D70015] shadow-md">
          <ShieldAlert className="size-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[#F5F5F7] px-3.5 py-1 text-xs font-extrabold text-black">
            <BadgeCheck className="size-3.5 text-[#FF3B30]" /> {ROLE_LABELS[role] ?? "Clinical Staff"}
          </span>
          <h1 className="text-2xl font-black text-black">
            {expired ? "Your practising licence has expired" : "Your licence expires in days"}
          </h1>
          <p className="mx-auto max-w-md text-xs font-medium leading-relaxed text-[#86868B]">
            Clinical access is suspended until your professional licence is renewed. Regulation requires a
            valid licence on file before you can document care, place orders or dispense medication.
          </p>
        </div>

        <div className="space-y-2 rounded-2xl border border-black/10 bg-[#FAFAFC] p-4 text-left text-xs font-semibold">
          <div className="flex items-center justify-between">
            <span className="text-[#86868B]">Licence number</span>
            <span className="font-mono font-bold text-black">{licenseNumber ?? "Not on file"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#86868B]">Expiry date</span>
            <span className="font-mono font-bold text-black">{formatExpiry(expiry)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#86868B]">Status</span>
            <span className="font-bold text-[#D70015]">
              {expired ? `Expired ${Math.abs(days ?? 0)} days ago` : `${days} days remaining`}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#FFE0B2] bg-[#FFF4E5] p-4 text-left text-xs font-semibold leading-relaxed text-[#B86200]">
          <p className="mb-1 flex items-center gap-1.5 font-extrabold">
            <AlertTriangle className="size-3.5" /> To continue working here
          </p>
          Submit your renewed licence certificate to HR &amp; Staff Operations. Once HR records the new expiry
          date, your workspace unlocks instantly — no re-registration needed.
        </div>

        <button
          onClick={signOut}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md transition-all hover:bg-slate-800"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

/** Amber pre-expiry warning shown from 3 months out on every workspace. */
export function LicenseWarningBanner() {
  const { data: me } = useQuery(myProfileQuery);
  const expiry = me?.staff?.license_expiry ?? null;
  const { state, days } = classifyLicense(expiry);

  if (state !== "expiring" && state !== "critical") return null;

  const urgent = state === "critical";

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
        urgent ? "border-[#F9BDBD] bg-[#FDE8E7]" : "border-[#FFE0B2] bg-[#FFF4E5]"
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${urgent ? "text-[#D70015]" : "text-[#B86200]"}`} />
        <div className="text-xs font-semibold leading-relaxed">
          <p className={`font-extrabold ${urgent ? "text-[#D70015]" : "text-[#B86200]"}`}>
            Medical licence {LICENSE_LABEL[state]} — {days} days remaining
          </p>
          <p className={urgent ? "text-[#D70015]/80" : "text-[#B86200]/80"}>
            Licence {me?.staff?.license_number ?? "on file"} expires {formatExpiry(expiry)}. Access is
            suspended automatically at 15 days remaining — submit your renewal to HR now.
          </p>
        </div>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
          urgent ? "bg-[#D70015] text-white" : "bg-[#FFE0B2] text-[#B86200]"
        }`}
      >
        {urgent ? "Action required" : "Renewal window open"}
      </span>
    </div>
  );
}
