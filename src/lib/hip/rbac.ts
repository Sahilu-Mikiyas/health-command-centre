export type AppRole =
  | "super_admin"
  | "ceo"
  | "medical_director"
  | "doctor"
  | "nurse"
  | "receptionist"
  | "pharmacist"
  | "lab_tech"
  | "billing_clerk";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  ceo: "Chief Executive Officer",
  medical_director: "Medical Director",
  doctor: "Attending Doctor",
  nurse: "Registered Nurse",
  receptionist: "Receptionist & Triage",
  pharmacist: "Clinical Pharmacist",
  lab_tech: "Lab Technologist",
  billing_clerk: "Billing & Financial Clerk",
};

export const ROUTE_PERMISSIONS: Record<string, AppRole[]> = {
  "/command-centre": [
    "super_admin",
    "ceo",
    "medical_director",
    "doctor",
    "nurse",
    "receptionist",
    "pharmacist",
    "lab_tech",
    "billing_clerk",
  ],
  "/digital-twin": ["super_admin", "ceo", "medical_director", "doctor", "nurse"],
  "/events": [
    "super_admin",
    "ceo",
    "medical_director",
    "doctor",
    "nurse",
    "receptionist",
    "pharmacist",
    "lab_tech",
    "billing_clerk",
  ],
  "/patients": [
    "super_admin",
    "ceo",
    "medical_director",
    "doctor",
    "nurse",
    "receptionist",
    "pharmacist",
    "lab_tech",
    "billing_clerk",
  ],
  "/reception": ["super_admin", "ceo", "medical_director", "nurse", "receptionist"],
  "/doctor": ["super_admin", "ceo", "medical_director", "doctor", "nurse"],
  "/laboratory": ["super_admin", "ceo", "medical_director", "doctor", "lab_tech"],
  "/pharmacy": ["super_admin", "ceo", "medical_director", "doctor", "pharmacist"],
  "/billing": ["super_admin", "ceo", "medical_director", "billing_clerk"],
  "/admin": ["super_admin"],
};

/** Checks if the given roles list grants access to a route path. Default: super_admin. */
export function hasRouteAccess(roles: string[] | undefined, routePath: string): boolean {
  const effectiveRoles = !roles || roles.length === 0 ? ["super_admin"] : roles;

  // Super admin always has access to everything
  if (effectiveRoles.includes("super_admin")) {
    return true;
  }

  // Check path permissions
  const allowed = Object.entries(ROUTE_PERMISSIONS).find(([path]) => routePath.startsWith(path));
  if (!allowed) return true; // Unrestricted path

  return effectiveRoles.some((role) => allowed[1].includes(role as AppRole));
}

/** Determines default landing page based on staff role. */
export function getDefaultRedirect(roles: string[] | undefined): string {
  const effectiveRoles = !roles || roles.length === 0 ? ["super_admin"] : roles;

  if (effectiveRoles.includes("super_admin") || effectiveRoles.includes("ceo") || effectiveRoles.includes("medical_director")) {
    return "/command-centre";
  }
  if (effectiveRoles.includes("doctor")) return "/doctor";
  if (effectiveRoles.includes("pharmacist")) return "/pharmacy";
  if (effectiveRoles.includes("lab_tech")) return "/laboratory";
  if (effectiveRoles.includes("receptionist")) return "/reception";
  if (effectiveRoles.includes("billing_clerk")) return "/billing";
  if (effectiveRoles.includes("nurse")) return "/reception";

  return "/command-centre";
}
