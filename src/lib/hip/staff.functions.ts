import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  provisionStaffMember,
  removeStaffMember,
  updateStaffMember,
  type ProvisionInput,
  type StaffUpdateInput,
} from "@/lib/hip/staff.server";

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data, error } = await (context.supabase.rpc as any)("is_admin", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only administrators can manage staff accounts");
}

export const provisionStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ProvisionInput) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    return provisionStaffMember(data);
  });

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: StaffUpdateInput) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    return updateStaffMember(data);
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    return removeStaffMember(data.id);
  });
