import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { BriefInput } from "./brain-schema";
import { runHospitalBrain } from "./brain.server";

type AuthedContext = {
  supabase: {
    from: (table: "user_roles") => {
      select: (cols: "role") => {
        eq: (
          col: "user_id",
          value: string,
        ) => PromiseLike<{
          data: { role: string }[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
  userId: string;
};

/**
 * AI briefing for clinical and executive leads. Requires a signed-in account with
 * a staff role: without this, anyone on the internet could spend the AI credits.
 */
export const hospitalBrain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BriefInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as AuthedContext;
    const roles = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (roles.error) throw new Error(roles.error.message);
    if (!roles.data?.length)
      throw new Error("Only staff with an assigned role can use the Hospital Brain");
    return runHospitalBrain(data);
  });
