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
    label: "Command",
    items: [
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
      { label: "Doctor Workspace", to: "/doctor", icon: Stethoscope, phase: 1 },
      { label: "Laboratory", to: "/laboratory", icon: FlaskConical, phase: 1 },
      { label: "AI Pharmacy", to: "/pharmacy", icon: Boxes, phase: 1 },
    ],
  },
  {
    label: "Finance & Admin",
    items: [
      { label: "Billing & Ledger", to: "/billing", icon: Banknote, phase: 1 },
      { label: "Super Admin", to: "/admin", icon: ShieldCheck, phase: 1 },
    ],
  },
];
