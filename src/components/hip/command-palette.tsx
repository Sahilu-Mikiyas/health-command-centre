import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Banknote,
  Boxes,
  Building2,
  Cpu,
  FlaskConical,
  LayoutDashboard,
  Radio,
  Search,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { patientsQuery } from "@/lib/hip/queries";

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data: patients } = useQuery(patientsQuery(query));

  // Keydown listener for Escape and ⌘K / Ctrl+K toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) onClose();
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const navigateTo = (to: string) => {
    onClose();
    setQuery("");
    void router.navigate({ to });
  };

  const modules = [
    { label: "Hospital Command Centre", to: "/command-centre", icon: LayoutDashboard, category: "Module" },
    { label: "Digital Twin & Bed Matrix", to: "/digital-twin", icon: Cpu, category: "Module" },
    { label: "Event Ledger", to: "/events", icon: Radio, category: "Module" },
    { label: "Patient Records Index", to: "/patients", icon: Users, category: "Module" },
    { label: "Reception & Triage Desk", to: "/reception", icon: Building2, category: "Clinical" },
    { label: "Doctor Workspace", to: "/doctor", icon: Stethoscope, category: "Clinical" },
    { label: "Laboratory & Diagnostics", to: "/laboratory", icon: FlaskConical, category: "Clinical" },
    { label: "AI Pharmacy & Dispensing", to: "/pharmacy", icon: Boxes, category: "Clinical" },
    { label: "Billing & Financial Ledger", to: "/billing", icon: Banknote, category: "Finance" },
    { label: "Super Admin Staff Management", to: "/admin", icon: ShieldCheck, category: "Admin" },
  ];

  const filteredModules = modules.filter((m) =>
    m.label.toLowerCase().includes(query.toLowerCase()) || m.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Translucent Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Apple Command Modal Container */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-black/10 bg-white p-0 shadow-2xl transition-all animate-in zoom-in-95 duration-150">
        {/* Search Bar Input Header */}
        <div className="flex items-center gap-3 border-b border-black/5 px-5 py-4 bg-[#FAFAFC]">
          <Search className="size-5 text-[#86868B] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, patient MRN, or workspace module..."
            className="w-full bg-transparent text-sm font-bold text-black placeholder:text-[#86868B] focus:outline-none"
          />
          <button
            onClick={onClose}
            className="rounded-full bg-[#E8E8ED] p-1 text-[#86868B] hover:text-black transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-3 space-y-4">
          {/* Workspaces & Modules */}
          {filteredModules.length > 0 ? (
            <div>
              <p className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-wider text-[#86868B]">
                System Workspaces & Modules
              </p>
              <ul className="space-y-1">
                {filteredModules.map((item) => (
                  <li key={item.to}>
                    <button
                      onClick={() => navigateTo(item.to)}
                      className="w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-[#1D1D1F] hover:bg-[#F5F5F7] hover:text-black transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="size-4 text-black shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#E8E8ED] px-2 py-0.5 text-[10px] text-[#86868B] font-semibold">
                          {item.category}
                        </span>
                        <ArrowRight className="size-3.5 text-[#86868B] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Patients Matching Results */}
          {query.trim() && (patients ?? []).length > 0 ? (
            <div className="pt-2 border-t border-black/5">
              <p className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-wider text-[#86868B]">
                Matching Patient Records
              </p>
              <ul className="space-y-1">
                {(patients ?? []).slice(0, 5).map((patient) => (
                  <li key={patient.id}>
                    <button
                      onClick={() => navigateTo(`/patients/${patient.id}`)}
                      className="w-full flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <User className="size-4 text-black shrink-0" />
                        <div>
                          <p className="font-bold text-black">{patient.full_name}</p>
                          <p className="text-[10px] text-[#86868B]">{patient.mrn} · Blood: {patient.blood_group ?? "O+"}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold text-[#0071E3] hover:underline">
                        Open Executive CV →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {filteredModules.length === 0 && (!patients || patients.length === 0) ? (
            <div className="py-8 text-center text-xs font-semibold text-[#86868B]">
              No system results matching "<span className="text-black">{query}</span>"
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-black/5 bg-[#FAFAFC] px-5 py-2.5 text-[11px] font-semibold text-[#86868B]">
          <div className="flex items-center gap-3">
            <span>Navigation: <kbd className="rounded bg-white px-1 py-0.5 border border-black/10 text-black">↑</kbd> <kbd className="rounded bg-white px-1 py-0.5 border border-black/10 text-black">↓</kbd></span>
            <span>Select: <kbd className="rounded bg-white px-1 py-0.5 border border-black/10 text-black">↵</kbd></span>
          </div>
          <span>Close: <kbd className="rounded bg-white px-1 py-0.5 border border-black/10 text-black">Esc</kbd></span>
        </div>
      </div>
    </div>
  );
}
