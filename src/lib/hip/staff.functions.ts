import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  provisionStaffMember,
  removeStaffMember,
  updateStaffMember,
  type ProvisionInput,
  type StaffUpdateInput,
} from "@/lib/hip/staff.server";

type AuthedContext = { supabase: { rpc: Function }; userId: string };

/** Super admin / CEO / medical director, or an HR manager — the people who own the roster. */
async function assertStaffManager(context: AuthedContext) {
  const admin = await (context.supabase.rpc as any)("is_admin", { _user_id: context.userId });
  if (admin.error) throw new Error(admin.error.message);
  if (admin.data) return;

  const hr = await (context.supabase.rpc as any)("has_role", {
    _user_id: context.userId,
    _role: "hr_manager",
  });
  if (hr.error) throw new Error(hr.error.message);
  if (!hr.data) throw new Error("Only administrators or HR managers can manage staff accounts");
}

export const provisionStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ProvisionInput) => input)
  .handler(async ({ data, context }) => {
    await assertStaffManager(context as never);
    return provisionStaffMember(data);
  });

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: StaffUpdateInput) => input)
  .handler(async ({ data, context }) => {
    await assertStaffManager(context as never);
    return updateStaffMember(data);
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertStaffManager(context as never);
    return removeStaffMember(data.id);
  });
