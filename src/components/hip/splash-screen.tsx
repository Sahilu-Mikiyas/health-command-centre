import { useRouter } from "@tanstack/react-router";
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
          hour12: true,
        }),
      );
      setDateStr(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Smooth Progress Bar (~1.8s)
  useEffect(() => {
    const start = Date.now();
    const duration = 1800;

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(Math.round((elapsed / duration) * 100), 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          if (onComplete) onComplete();
          void router.navigate({ to: targetRoute as any });
        }, 150);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [router, targetRoute, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#F5F5F7] text-black p-6 sm:p-10 animate-in fade-in duration-200">
      {/* Top Header & Minimal Live Clock */}
      <div className="w-full max-w-2xl flex items-center justify-between border-b border-black/5 pb-4">
        <span className="text-xs font-bold tracking-wider text-[#86868B] uppercase">
          Furii Hospital
        </span>

        {/* Minimalist Live Clock */}
        <div className="text-right font-medium">
          <span className="text-sm font-bold text-black font-mono tracking-tight">{timeStr}</span>
          <span className="text-xs text-[#86868B] ml-2 font-medium">{dateStr}</span>
        </div>
      </div>

      {/* Main Minimalist Welcome Card */}
      <div className="w-full max-w-md text-center space-y-4 my-auto">
        <div className="space-y-1">
          <p className="text-xs font-bold tracking-widest text-[#86868B] uppercase">
            {roleLabel}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
            Welcome, {staffName}
          </h1>
        </div>

        {/* Minimalist Progress Line */}
        <div className="w-full max-w-xs mx-auto pt-3">
          <div className="h-1 w-full overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-black transition-all duration-75 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Minimal Footer */}
      <div className="w-full max-w-2xl text-center border-t border-black/5 pt-4">
        <p className="text-[11px] text-[#86868B] font-medium">
          Entering workspace...
        </p>
      </div>
    </div>
  );
}
