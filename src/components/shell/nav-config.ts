import {
  Activity,
  Banknote,
  Boxes,
  Building2,
  Cpu,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  Radio,
  Scan,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import type { AppRole } from "@/lib/hip/rbac";

export type NavItem = {
  label: string;
  to: string;
  icon: typeof Activity;
  phase: number;
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV_ITEMS: Record<string, NavItem> = {
  "/executive": { label: "Executive Cockpit", to: "/executive", icon: TrendingUp, phase: 1 },
  "/command-centre": { label: "Command Centre", to: "/command-centre", icon: LayoutDashboard, phase: 1 },
  "/digital-twin": { label: "Digital Twin", to: "/digital-twin", icon: Cpu, phase: 1 },
  "/events": { label: "Event Ledger", to: "/events", icon: Radio, phase: 1 },
  "/patients": { label: "Patient Records", to: "/patients", icon: Users, phase: 1 },
  "/reception": { label: "Reception & Triage", to: "/reception", icon: Building2, phase: 1 },
  "/nurse": { label: "Nurse Workspace", to: "/nurse", icon: HeartPulse, phase: 1 },
  "/doctor": { label: "Doctor Workspace", to: "/doctor", icon: Stethoscope, phase: 1 },
  "/ward": { label: "Ward & Bed Manager", to: "/ward", icon: Building2, phase: 1 },
  "/laboratory": { label: "Laboratory", to: "/laboratory", icon: FlaskConical, phase: 1 },
  "/radiology": { label: "Radiology & Imaging", to: "/radiology", icon: Scan, phase: 1 },
  "/pharmacy": { label: "AI Pharmacy", to: "/pharmacy", icon: Boxes, phase: 1 },
  "/billing": { label: "Billing & Ledger", to: "/billing", icon: Banknote, phase: 1 },
  "/hr": { label: "HR & Staff Operations", to: "/hr", icon: UserCheck, phase: 1 },
  "/admin": { label: "Super Admin", to: "/admin", icon: ShieldCheck, phase: 1 },
};

function group(label: string, paths: string[]): NavGroup {
  return { label, items: paths.map((path) => NAV_ITEMS[path]!).filter(Boolean) };
}

/**
 * Every role gets a purpose-built sidebar: their own workspace first, then the
 * few surfaces they genuinely hand work to or from.
 */
export const ROLE_NAV: Record<AppRole, NavGroup[]> = {
  super_admin: [
    group("Command & Executive", ["/executive", "/command-centre", "/digital-twin", "/events"]),
    group("Clinical Operations", [
      "/reception",
      "/nurse",
      "/doctor",
      "/ward",
      "/laboratory",
      "/radiology",
      "/pharmacy",
    ]),
    group("Finance & Platform", ["/billing", "/hr", "/patients", "/admin"]),
  ],
  ceo: [
    group("Executive Oversight", ["/executive", "/command-centre", "/digital-twin", "/events"]),
    group("Operations Review", ["/billing", "/hr", "/ward", "/patients"]),
  ],
  medical_director: [
    group("Clinical Oversight", ["/executive", "/command-centre", "/digital-twin"]),
    group("Clinical Floor", ["/doctor", "/nurse", "/ward", "/laboratory", "/radiology", "/pharmacy"]),
    group("Records", ["/patients", "/events"]),
  ],
  doctor: [
    group("My Workspace", ["/doctor"]),
    group("Diagnostics & Orders", ["/laboratory", "/radiology", "/pharmacy"]),
    group("Patients & Wards", ["/patients", "/ward", "/command-centre"]),
  ],
  nurse: [
    group("My Workspace", ["/nurse"]),
    group("Patient Flow", ["/reception", "/doctor", "/ward"]),
    group("Records", ["/patients", "/command-centre"]),
  ],
  receptionist: [
    group("My Workspace", ["/reception"]),
    group("Downstream Handoff", ["/nurse", "/billing"]),
    group("Records", ["/patients", "/command-centre"]),
  ],
  pharmacist: [
    group("My Workspace", ["/pharmacy"]),
    group("Prescribers & Wards", ["/doctor", "/ward"]),
    group("Records", ["/patients", "/command-centre"]),
  ],
  lab_tech: [
    group("My Workspace", ["/laboratory"]),
    group("Requesters", ["/doctor", "/radiology"]),
    group("Records", ["/patients", "/command-centre"]),
  ],
  radiologist: [
    group("My Workspace", ["/radiology"]),
    group("Requesters", ["/doctor", "/laboratory"]),
    group("Records", ["/patients", "/command-centre"]),
  ],
  ward_manager: [
    group("My Workspace", ["/ward"]),
    group("Clinical Partners", ["/nurse", "/doctor", "/pharmacy"]),
    group("Records", ["/patients", "/command-centre"]),
  ],
  hr_manager: [
    group("My Workspace", ["/hr"]),
    group("Hospital Overview", ["/command-centre", "/events"]),
  ],
  billing_clerk: [
    group("My Workspace", ["/billing"]),
    group("Upstream Sources", ["/reception", "/pharmacy", "/laboratory"]),
    group("Records", ["/patients", "/command-centre"]),
  ],
};

/** Sidebar groups for the current effective roles. */
export function navGroupsForRoles(roles: string[] | undefined): NavGroup[] {
  const list = (roles && roles.length > 0 ? roles : ["super_admin"]) as AppRole[];
  if (list.includes("super_admin")) return ROLE_NAV.super_admin;
  const primary = list.find((role) => ROLE_NAV[role]);
  return primary ? ROLE_NAV[primary] : ROLE_NAV.receptionist;
}

/** Legacy flat export kept for the command palette / mobile fallbacks. */
export const navGroups: NavGroup[] = ROLE_NAV.super_admin;
