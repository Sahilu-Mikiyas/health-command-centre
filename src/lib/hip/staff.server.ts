import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type StaffRole =
  | "super_admin"
  | "ceo"
  | "medical_director"
  | "doctor"
  | "nurse"
  | "receptionist"
  | "pharmacist"
  | "lab_tech"
  | "radiologist"
  | "ward_manager"
  | "hr_manager"
  | "billing_clerk";

export type ProvisionInput = {
  fullName: string;
  email: string;
  password: string;
  role: StaffRole;
  phone?: string;
  jobTitle?: string;
  departmentName?: string;
  licenseNumber?: string;
  shiftPattern?: string;
  availability?: string;
  notes?: string;
};

async function findUserIdByEmail(email: string) {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const match = data?.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

async function assignRole(userId: string, role: StaffRole) {
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
  if (error) throw new Error(`Role assignment failed: ${error.message}`);
}

/** Creates a real login account, grants the role and files the staff record. */
export async function provisionStaffMember(input: ProvisionInput) {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const license = input.licenseNumber?.trim() || `LIC-${Math.floor(10000 + Math.random() * 90000)}`;
  const jobTitle = input.jobTitle?.trim() || input.role.replace(/_/g, " ");

  const { data: hospital } = await supabaseAdmin
    .from("hospitals")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!hospital) throw new Error("No hospital configured");

  let userId: string | null = null;
  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: input.role,
      job_title: jobTitle,
      must_change_password: true,
    },
  });

  if (created.error) {
    userId = await findUserIdByEmail(email);
    if (!userId) throw new Error(created.error.message);
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: input.password,
      user_metadata: { full_name: fullName, role: input.role, job_title: jobTitle, must_change_password: true },
    });
  } else {
    userId = created.data.user.id;
  }

  await assignRole(userId, input.role);

  await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        full_name: fullName,
        email,
        job_title: jobTitle,
        hospital_id: hospital.id,
      },
      { onConflict: "user_id" },
    );

  const { data: existingStaff } = await supabaseAdmin
    .from("staff")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  const staffRow = {
    hospital_id: hospital.id,
    user_id: userId,
    full_name: fullName,
    email,
    phone: input.phone?.trim() || null,
    role: input.role,
    job_title: jobTitle,
    license_number: license,
    shift_pattern: input.shiftPattern ?? null,
    availability: input.availability ?? "active",
    notes: input.notes?.trim() || null,
  };

  if (existingStaff) {
    const { error } = await supabaseAdmin.from("staff").update(staffRow).eq("id", existingStaff.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin.from("staff").insert(staffRow);
    if (error) throw new Error(error.message);
  }

  return { userId, email, license, role: input.role };
}

export type StaffUpdateInput = {
  id: string;
  fullName?: string;
  role?: StaffRole;
  availability?: string;
  licenseNumber?: string;
  phone?: string;
  shiftPattern?: string;
  newPassword?: string;
};

export async function updateStaffMember(input: StaffUpdateInput) {
  const patch: Record<string, unknown> = {};
  if (input.fullName !== undefined) patch["full_name"] = input.fullName;
  if (input.role !== undefined) patch["role"] = input.role;
  if (input.availability !== undefined) patch["availability"] = input.availability;
  if (input.licenseNumber !== undefined) patch["license_number"] = input.licenseNumber;
  if (input.phone !== undefined) patch["phone"] = input.phone;
  if (input.shiftPattern !== undefined) patch["shift_pattern"] = input.shiftPattern;

  const { data: staff, error } = await supabaseAdmin
    .from("staff")
    .update(patch as never)
    .eq("id", input.id)
    .select("id,user_id,email,full_name,role")
    .single();
  if (error) throw new Error(error.message);

  let userId = staff.user_id;
  if (!userId && staff.email) userId = await findUserIdByEmail(staff.email);

  if (userId) {
    if (input.role) {
      await assignRole(userId, input.role);
      await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: { role: input.role, full_name: staff.full_name } });
    }
    if (input.newPassword) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: input.newPassword,
        user_metadata: { must_change_password: true },
      });
    }
    if (!staff.user_id) await supabaseAdmin.from("staff").update({ user_id: userId }).eq("id", staff.id);
  }

  return { id: staff.id, hadLogin: Boolean(userId) };
}

export async function removeStaffMember(id: string) {
  const { data: staff } = await supabaseAdmin
    .from("staff")
    .select("id,user_id,email")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseAdmin.from("staff").delete().eq("id", id);
  if (error) throw new Error(error.message);

  let userId = staff?.user_id ?? null;
  if (!userId && staff?.email) userId = await findUserIdByEmail(staff.email);
  if (userId) {
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
  }
  return { removedLogin: Boolean(userId) };
}
