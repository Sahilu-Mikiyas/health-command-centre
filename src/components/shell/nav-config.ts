import {
  Activity,
  Banknote,
  Boxes,
  Building2,
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
  /** Phase that ships this workspace. Items past phase 1 render as "coming online". */
  phase: number;
};

export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: "Command",
    items: [
      { label: "Command Centre", to: "/command-centre", icon: LayoutDashboard, phase: 1 },
      { label: "Event Monitor", to: "/events", icon: Radio, phase: 1 },
      { label: "Patients", to: "/patients", icon: Users, phase: 1 },
    ],
  },
  {
    label: "Clinical",
    items: [
      { label: "Reception", to: "/reception", icon: Building2, phase: 2 },
      { label: "Doctor", to: "/doctor", icon: Stethoscope, phase: 3 },
      { label: "Nursing", to: "/nursing", icon: HeartPulse, phase: 4 },
      { label: "Laboratory", to: "/laboratory", icon: FlaskConical, phase: 5 },
      { label: "Radiology", to: "/radiology", icon: Scan, phase: 6 },
      { label: "Pharmacy", to: "/pharmacy", icon: Boxes, phase: 7 },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Billing", to: "/billing", icon: Banknote, phase: 8 },
      { label: "Super Admin", to: "/admin", icon: ShieldCheck, phase: 11 },
    ],
  },
];
