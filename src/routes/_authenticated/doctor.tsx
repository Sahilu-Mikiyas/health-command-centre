import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { Panel, Stat } from "@/components/hip/panel";
import { StatusPill } from "@/components/hip/status-pill";
import { Timeline } from "@/components/hip/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { activeEncountersQuery, notesQuery, ordersQuery } from "@/lib/hip/clinical-queries";
import { patientRecordQuery } from "@/lib/hip/queries";
import { cancelOrder, createOrder, saveNote, setEncounterPriority, setEncounterStage } from "@/lib/hip/mutations";

export const Route = createFileRoute("/_authenticated/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor Workspace | Meridian HIP" },
      {
        name: "description",
        content:
          "Consultation cockpit: live patient queue, safety context, SOAP notes and lab, imaging and medication ordering in one screen.",
      },
      { property: "og:title", content: "Doctor Workspace | Meridian HIP" },
      {
        property: "og:description",
        content: "Live queue, safety context, SOAP notes and clinical ordering in one screen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DoctorWorkspace;
});

function DoctorWorkspace() {
  return null;
}
