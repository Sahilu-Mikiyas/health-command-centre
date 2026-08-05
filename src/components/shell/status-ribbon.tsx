import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { StatusDot } from "@/components/hip/status-pill";
import { bedSummaryQuery, flowQuery, hospitalQuery } from "@/lib/hip/queries";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function StatusRibbon() {
  const now = useClock();
  const { data: hospital } = useQuery(hospitalQuery);
  const { data: beds } = useQuery(bedSummaryQuery);
  const { data: flow } = useQuery(flowQuery);

  const occupancy = beds && beds.total > 0 ? Math.round((beds.occupied / beds.total) * 100) : 0;

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-surface px-4 py-2.5">
      <h1 className="text-sm font-semibold">{hospital?.name ?? "Meridian General Hospital"}</h1>

      <span className="inline-flex items-center gap-2 text-xs text-ok">
        <StatusDot status="healthy" />
        Live
      </span>

      <span className="numeric text-xs text-muted-foreground">
        Beds {beds?.occupied ?? 0}/{beds?.total ?? 0} &middot; {occupancy}%
      </span>
      <span className="numeric text-xs text-muted-foreground">
        In flow {flow?.total ?? 0} &middot; Critical {flow?.critical ?? 0}
      </span>

      <span className="numeric ml-auto text-xs text-muted-foreground">
        {now
          ? `${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · ${now.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })}`
          : "—"}
      </span>
    </header>
  );
}
