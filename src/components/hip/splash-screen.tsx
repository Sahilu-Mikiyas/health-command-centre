import { useRouter } from "@tanstack/react-router";
import { Activity, Clock, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";

export type SplashScreenProps = {
  staffName: string;
  roleLabel: string;
  targetRoute: string;
  onComplete?: () => void;
};

export function SplashScreen({
  staffName,
  roleLabel,
  targetRoute,
  onComplete,
}: SplashScreenProps) {
  const router = useRouter();
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [progress, setProgress] = useState(0);

  // Live Digital Clock Interval
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
      setDateStr(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Smooth Progress Bar & Transition Timer (~2.5s)
  useEffect(() => {
    const start = Date.now();
    const duration = 2400; // 2.4 seconds

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(Math.round((elapsed / duration) * 100), 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          if (onComplete) onComplete();
          void router.navigate({ to: targetRoute as any });
        }, 200);
      }
    }, 40);

    return () => clearInterval(timer);
  }, [router, targetRoute, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black text-white p-6 sm:p-12 animate-in fade-in duration-300 selection:bg-white selection:text-black">
      {/* Top Header & Live Clock */}
      <div className="w-full max-w-4xl flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-white text-black font-black text-lg shadow-lg">
            F
          </div>
          <div>
            <h2 className="font-extrabold text-sm tracking-wider uppercase text-white">
              Furii Hospital OS
            </h2>
            <p className="text-[10px] font-semibold text-[#86868B] tracking-widest uppercase">
              Clinical Intelligence Suite
            </p>
          </div>
        </div>

        {/* Live Digital Clock */}
        <div className="text-right">
          <div className="flex items-center justify-end gap-2 text-xl font-mono font-bold tracking-tight text-white numeric">
            <Clock className="size-4 text-[#34C759] animate-pulse" />
            <span>{timeStr || "11:10:49 AM"}</span>
          </div>
          <p className="text-[10px] font-medium text-[#86868B] tracking-wide mt-0.5">
            {dateStr}
          </p>
        </div>
      </div>

      {/* Main Center Welcome Card */}
      <div className="w-full max-w-lg text-center space-y-6 my-auto">
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-white/10 blur-xl animate-pulse" />
          <div className="relative grid size-20 place-items-center rounded-full bg-white/10 border border-white/20 text-white shadow-2xl backdrop-blur-2xl">
            <Sparkles className="size-10 text-white animate-spin-slow" />
          </div>
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-slate-300">
            <ShieldCheck className="size-3.5 text-[#34C759]" /> Authentication Verified
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Welcome, {staffName}!
          </h1>
          <p className="text-sm font-semibold text-[#86868B]">
            Initializing authorized perspective for{" "}
            <span className="text-white font-bold underline underline-offset-4 decoration-white/30">
              {roleLabel}
            </span>
          </p>
        </div>

        {/* Progress Bar & Subtext */}
        <div className="space-y-3 pt-4">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10 p-0.5 border border-white/10">
            <div
              className="h-full rounded-full bg-white transition-all duration-75 ease-out shadow-[0_0_12px_rgba(255,255,255,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-[#86868B]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Activity className="size-3.5 text-[#34C759] animate-spin" /> Loading workspace telemetry...
            </span>
            <span className="font-mono font-bold text-white">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Footer Legal & Security */}
      <div className="w-full max-w-4xl text-center border-t border-white/10 pt-4 text-[11px] font-medium text-[#86868B] flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>Furii Hospital Operations System · Protected Health Information (PHI)</p>
        <p className="font-mono text-[10px]">Session Key: 0x8F92...E4A1</p>
      </div>
    </div>
  );
}
