import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileCheck,
  QrCode,
  ShieldCheck,
} from "lucide-react";

import { AppShell } from "@/components/hip/app-shell";
import { Panel } from "@/components/hip/panel";
import { StatusPill } from "@/components/hip/status-pill";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Event-Driven Ledger | Meridian HIP" },
      {
        name: "description",
        content: "Automated event-driven financial ledger, insurance claims, and split payments.",
      },
    ],
  }),
  component: BillingWorkspace,
});

function BillingWorkspace() {
  return (
    <AppShell
      title="Event-Driven Financial Ledger & Billing"
      subtitle="Automated line-item generation · Insurance claim pre-clearing · QR Receipts"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <ShieldCheck className="size-3.5" /> Event-Driven Ledger Active
          </span>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Invoices List */}
        <div className="space-y-6">
          <Panel title="Active Patient Invoices" subtitle="Generated automatically from operational events">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div>
                    <span className="text-xs font-extrabold text-indigo-600">INV-2026-9041</span>
                    <h3 className="text-lg font-bold text-slate-900">Elena Rostova (MRN-8829)</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold border border-emerald-200">
                      Insurance Claim Approved (80%)
                    </span>
                    <StatusPill status="busy" label="Copay Due" />
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                    <span className="text-slate-700">Emergency Consultation & Triage (Dr. Sarah Hana)</span>
                    <span className="font-bold text-slate-900 numeric">$250.00</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                    <span className="text-slate-700">Head Non-Contrast CT Scan (Radiology)</span>
                    <span className="font-bold text-slate-900 numeric">$650.00</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                    <span className="text-slate-700">Sumatriptan 50mg Oral (Pharmacy Dispense)</span>
                    <span className="font-bold text-slate-900 numeric">$45.00</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 pt-3 gap-3">
                  <div className="text-xs font-medium text-slate-600">
                    Total: <strong className="text-slate-900 numeric text-base">$945.00</strong> · Insurance Pays: <strong className="text-emerald-700 numeric">$756.00</strong> · Patient Copay: <strong className="text-indigo-600 numeric">$189.00</strong>
                  </div>
                  <button className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-md">
                    Process Patient Copay ($189.00)
                  </button>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Sidebar: Ledger Financial Telemetry */}
        <div className="space-y-4">
          <Panel title="Revenue Snapshot" subtitle="Today's financial metrics">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Billed</span>
                <p className="text-3xl font-extrabold text-slate-900 numeric mt-1">$42,850.00</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Auto-Insurance Cleared</span>
                <p className="text-3xl font-extrabold text-emerald-600 numeric mt-1">$34,280.00</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Copays</span>
                <p className="text-3xl font-extrabold text-indigo-600 numeric mt-1">$8,570.00</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
