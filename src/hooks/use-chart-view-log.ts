import { useEffect } from "react";

import { emitEvent } from "@/lib/hip/mutations";

const STORAGE_KEY = "furii_chart_views";
/** One view per patient per user session every 10 minutes keeps the ledger meaningful. */
const THROTTLE_MS = 10 * 60_000;

function recentlyLogged(patientId: string, now: number): boolean {
  try {
    const map = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, number>;
    return typeof map[patientId] === "number" && now - map[patientId]! < THROTTLE_MS;
  } catch {
    return false;
  }
}

function remember(patientId: string, now: number) {
  try {
    const map = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, number>;
    map[patientId] = now;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable: the next open logs again, which is the safe direction */
  }
}

/**
 * Records that the signed-in user opened a patient's chart (read access), so the
 * HIS audit trail can answer "who looked at this record?", not only "who changed it?".
 */
export function useChartViewLog(patientId: string | null | undefined, context: string) {
  useEffect(() => {
    if (!patientId) return;
    const now = Date.now();
    if (recentlyLogged(patientId, now)) return;
    remember(patientId, now);
    void emitEvent({
      eventType: "patient.chart_viewed",
      entityType: "patient",
      entityId: patientId,
      payload: { context },
    }).catch(() => {
      // Do not block the chart; allow a retry on the next open.
      try {
        const map = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Record<
          string,
          number
        >;
        delete map[patientId];
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
      } catch {
        /* ignore */
      }
    });
  }, [patientId, context]);
}
