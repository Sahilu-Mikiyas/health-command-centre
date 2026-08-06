import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";

const TABLES = ["encounters", "orders", "vitals", "beds", "invoices", "events"] as const;

/**
 * Keeps every role workspace in sync: when one role changes the shared
 * journey, all other open workspaces refetch immediately.
 */
export function useWorkflowSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel("hip-workflow-sync");
    for (const table of TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        void queryClient.invalidateQueries({ queryKey: ["workflow"] });
        void queryClient.invalidateQueries({ queryKey: ["encounters"] });
        void queryClient.invalidateQueries({ queryKey: ["orders"] });
        void queryClient.invalidateQueries({ queryKey: ["events"] });
        void queryClient.invalidateQueries({ queryKey: ["beds"] });
      });
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
