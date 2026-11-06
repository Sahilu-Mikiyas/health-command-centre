import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  dhis2ConfigFromEnv,
  pushDataValueSet,
  validatePayload,
  type Dhis2Payload,
} from "@/lib/hip/dhis2.server";

/** Only leadership may submit the facility's official national report. */
const SUBMIT_ROLES = new Set(["super_admin", "ceo", "medical_director"]);

type RolesClient = {
  from: (table: "user_roles") => {
    select: (cols: "role") => {
      eq: (
        col: "user_id",
        v: string,
      ) => PromiseLike<{ data: { role: string }[] | null; error: { message: string } | null }>;
    };
  };
};

async function assertSubmitter(context: unknown) {
  const { supabase, userId } = context as { supabase: RolesClient; userId: string };
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (!(data ?? []).some((r) => SUBMIT_ROLES.has(r.role))) {
    throw new Error("Only the Super Admin, CEO or Medical Director can submit to DHIS2");
  }
}

/** Whether a DHIS2 server is configured, and which host (never the credentials). */
export const dhis2Status = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const config = dhis2ConfigFromEnv(process.env);
    return config
      ? { configured: true, host: new URL(config.baseUrl).host }
      : { configured: false, host: null };
  });

export const pushDhis2Report = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { payload: Dhis2Payload; dryRun: boolean }) => ({
    payload: validatePayload(input?.payload),
    dryRun: input?.dryRun !== false,
  }))
  .handler(async ({ data, context }) => {
    await assertSubmitter(context);
    const config = dhis2ConfigFromEnv(process.env);
    if (!config) {
      return {
        ok: false,
        dryRun: data.dryRun,
        status: "NOT_CONFIGURED",
        imported: 0,
        updated: 0,
        ignored: 0,
        conflicts: [],
        message: "No DHIS2 server is configured. Set DHIS2_BASE_URL and DHIS2_TOKEN on the server.",
      };
    }
    return pushDataValueSet(config, data.payload, { dryRun: data.dryRun });
  });
