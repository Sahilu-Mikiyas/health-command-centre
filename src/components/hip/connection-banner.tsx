import { onlineManager, useMutationState } from "@tanstack/react-query";
import { CloudOff, RefreshCw } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}

/**
 * Shown when the internet drops. Screens keep the data they already loaded, and
 * changes made while offline wait in a queue and are sent automatically when the
 * connection returns (React Query pauses mutations while offline). Closing the
 * tab would lose that queue, so the browser asks first.
 */
export function ConnectionBanner() {
  const online = useOnline();
  const paused = useMutationState({
    filters: { predicate: (m) => m.state.isPaused },
    select: (m) => m.mutationId,
  }).length;

  useEffect(() => {
    if (paused === 0) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [paused]);

  if (online && paused === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-2xl border border-[#FFD8A8] bg-[#FFF5E6] px-4 py-2.5 text-xs font-bold text-[#8A4B00]"
    >
      {online ? (
        <RefreshCw className="size-4 shrink-0 animate-spin" />
      ) : (
        <CloudOff className="size-4 shrink-0" />
      )}
      <span>
        {online
          ? `Back online, sending ${paused} saved change${paused === 1 ? "" : "s"}…`
          : `You're offline. You can keep viewing what's on screen${
              paused
                ? `; ${paused} change${paused === 1 ? " is" : "s are"} saved and will be sent when the connection returns. Don't close this tab.`
                : ". New changes will be held and sent when the connection returns."
            }`}
      </span>
    </div>
  );
}
