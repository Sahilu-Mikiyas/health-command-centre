import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/hip/app-shell";
import { Panel } from "@/components/hip/panel";
import { Timeline } from "@/components/hip/timeline";
import { Input } from "@/components/ui/input";
import { recentEventsQuery } from "@/lib/hip/queries";

const severities = ["all", "info", "warning", "critical"] as const;

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({
    meta: [
      { title: "Event Monitor | Meridian HIP" },
      {
        name: "description",
        content:
          "Append-only stream of every clinical and operational event across the hospital, filterable by severity and department.",
      },
      { property: "og:title", content: "Event Monitor | Meridian HIP" },
      {
        property: "og:description",
        content: "Append-only stream of every hospital event, filterable by severity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventMonitor,
});

function EventMonitor() {
  const [severity, setSeverity] = useState<(typeof severities)[number]>("all");
  const [search, setSearch] = useState("");
  const events = useQuery({ ...recentEventsQuery(150), refetchInterval: 15000 });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (events.data ?? []).filter((event) => {
      if (severity !== "all" && event.severity !== severity) return false;
      if (!term) return true;
      return `${event.event_type} ${event.department_code ?? ""} ${event.actor_label ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [events.data, severity, search]);

  return (
    <AppShell title="Event Monitor" subtitle="Every action leaves a trace — nothing is editable">
      <Panel
        title="Hospital ledger"
        subtitle={`${filtered.length} events`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {severities.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSeverity(option)}
                className={
                  option === severity
                    ? "rounded-full border border-accent px-3 py-1 text-[11px] uppercase tracking-widest text-accent"
                    : "rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground"
                }
              >
                {option}
              </button>
            ))}
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter…"
              className="h-8 w-40"
            />
          </div>
        }
      >
        <Timeline
          items={filtered.map((event) => ({
            id: event.id,
            time: new Date(event.occurred_at).toLocaleString([], {
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
            title: event.event_type.replace(/[._]/g, " "),
            detail: [event.department_code, event.actor_label, event.entity_type]
              .filter(Boolean)
              .join(" · "),
            tone:
              event.severity === "critical"
                ? "crit"
                : event.severity === "warning"
                  ? "warn"
                  : "default",
          }))}
        />
      </Panel>
    </AppShell>
  );
}
