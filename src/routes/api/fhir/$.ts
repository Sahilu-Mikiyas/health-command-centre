import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

import type { Database } from "@/integrations/supabase/types";
import { handleFhirRequest, operationOutcome } from "@/lib/hip/fhir-api";

/** Per-request client that carries the caller's token, so row-level security applies. */
function clientFor(token: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
  return createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function handle({ request, params }: { request: Request; params: { _splat?: string } }) {
  try {
    return await handleFhirRequest(request, params._splat ?? "", { clientFor });
  } catch (err) {
    console.error("[fhir-api]", err);
    return operationOutcome(500, "exception", "The FHIR API is not configured on this server.");
  }
}

export const Route = createFileRoute("/api/fhir/$")({
  server: {
    handlers: {
      GET: handle,
      HEAD: handle,
      OPTIONS: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
});
