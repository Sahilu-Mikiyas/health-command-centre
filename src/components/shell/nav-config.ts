import {
  Activity,
  Banknote,
  Boxes,
  Building2,
  Cpu,
  FileSpreadsheet,
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

export type NavItem = {
  label: string;
  to: string;
  icon: typeof Activity;
  phase: number;
};

export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: "Command & Executive",
    items: [
      { label: "Executive Cockpit", to: "/executive", icon: TrendingUp, phase: 1 },
      { label: "Command Centre", to: "/command-centre", icon: LayoutDashboard, phase: 1 },
      { label: "Digital Twin", to: "/digital-twin", icon: Cpu, phase: 1 },
      { label: "Event Ledger", to: "/events", icon: Radio, phase: 1 },
      { label: "Patient Records", to: "/patients", icon: Users, phase: 1 },
    ],
  },
  {
    label: "Clinical Operations",
    items: [
      { label: "Reception & Triage", to: "/reception", icon: Building2, phase: 1 },
      { label: "Nurse Workspace", to: "/nurse", icon: HeartPulse, phase: 1 },
      { label: "Doctor Workspace", to: "/doctor", icon: Stethoscope, phase: 1 },
      { label: "Ward & Bed Manager", to: "/ward", icon: Building2, phase: 1 },
      { label: "Laboratory", to: "/laboratory", icon: FlaskConical, phase: 1 },
      { label: "Radiology & Imaging", to: "/radiology", icon: Scan, phase: 1 },
      { label: "AI Pharmacy", to: "/pharmacy", icon: Boxes, phase: 1 },
    ],
  },
  {
    label: "Finance & Operations",
    items: [
      { label: "Billing & Ledger", to: "/billing", icon: Banknote, phase: 1 },
      { label: "HR & Staff Operations", to: "/hr", icon: UserCheck, phase: 1 },
      { label: "Super Admin", to: "/admin", icon: ShieldCheck, phase: 1 },
    ],
  },
];
