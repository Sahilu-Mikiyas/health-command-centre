import { Copy, Globe } from "lucide-react";
import { toast } from "sonner";

import { Panel } from "@/components/hip/panel";

const ENDPOINTS = [
  { path: "metadata", what: "CapabilityStatement: what the server supports (no token needed)" },
  { path: "Patient?identifier=<MRN>", what: "Find a patient by MRN or national ID (Fayda)" },
  { path: "Patient/<id>", what: "Read one Patient resource" },
  { path: "Patient/<id>/$everything", what: "The whole record as a FHIR searchset Bundle" },
];

/** How partner systems connect to the live, read-only FHIR R4 API. */
export function FhirApiPanel() {
  const base = typeof window !== "undefined" ? `${window.location.origin}/api/fhir` : "/api/fhir";
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => toast.success("Copied"),
      () => toast.error("Could not copy"),
    );
  };
  return (
    <Panel
      title="Live FHIR R4 API"
      subtitle="Read-only REST endpoint for partner systems, insurers and national platforms"
      action={<Globe className="size-4 text-[#86868B]" />}
      bodyClassName="space-y-3"
    >
      <div className="flex items-center gap-2 rounded-2xl bg-[#F5F5F7] px-3 py-2">
        <code className="min-w-0 flex-1 truncate font-mono text-xs font-bold text-black">
          {base}
        </code>
        <button
          type="button"
          onClick={() => copy(base)}
          aria-label="Copy API base URL"
          className="grid size-7 cursor-pointer place-items-center rounded-lg hover:bg-white"
        >
          <Copy className="size-3.5" />
        </button>
      </div>
      <ul className="divide-y divide-black/5 text-xs">
        {ENDPOINTS.map((e) => (
          <li key={e.path} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-3">
            <code className="shrink-0 font-mono font-bold text-[#1D1D1F] sm:w-64">
              GET {e.path}
            </code>
            <span className="text-[#86868B]">{e.what}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-relaxed text-[#86868B]">
        Callers send a staff member's access token (<code>Authorization: Bearer …</code>). The
        database's own access rules apply to every read, only roles with HIS access are accepted,
        and each read is logged against the patient in the audit trail.
      </p>
    </Panel>
  );
}
