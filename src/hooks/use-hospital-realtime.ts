import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { isForRoles, titleForEvent, type HospitalEvent } from "@/lib/hip/alerts";
import { myProfileQuery } from "@/lib/hip/queries";

/** Every table that carries a piece of the patient journey. */
const TABLES = [
  "encounters",
  "orders",
  "vitals",
  "beds",
  "invoices",
  "invoice_items",
  "clinical_notes",
  "appointments",
  "patients",
  "staff",
  "events",
] as const;

const KEYS = [
  ["workflow"],
  ["encounters"],
  ["orders"],
  ["notes"],
  ["events"],
  ["beds"],
  ["invoices"],
  ["appointments"],
  ["patients"],
  ["patient"],
  ["staff"],
  ["command-centre"],
  ["executive"],
] as const;

/**
 * Single hospital-wide realtime bridge: any change made by any role
 * (reception → nurse → doctor → lab → ward → pharmacy → billing)
 * refreshes every other open workspace instantly and raises a toast
 * for the roles that own the next step.
 */
export function useHospitalRealtime() {
  const queryClient = useQueryClient();
  const { data: me } = useQuery(myProfileQuery);
  const rolesRef = useRef<string[] | undefined>(undefined);
  rolesRef.current = me?.roles;

  useEffect(() => {
    const channel = supabase.channel("hip-hospital-realtime");

    for (const table of TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        for (const key of KEYS) void queryClient.invalidateQueries({ queryKey: key as unknown as string[] });

        if (table === "events" && payload.eventType === "INSERT") {
          const event = payload.new as unknown as HospitalEvent;
          if (!isForRoles(event.event_type, rolesRef.current)) return;
          const title = titleForEvent(event);
          if (event.severity === "critical") toast.error(title, { duration: 8000 });
          else if (event.severity === "warning") toast.warning(title);
          else toast.info(title);
        }
      });
    }

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
