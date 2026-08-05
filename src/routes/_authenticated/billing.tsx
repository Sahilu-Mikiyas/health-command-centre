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
import { RouteGuard } from "@/components/hip/route-guard";
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
    <RouteGuard route="/billing">
      <BillingContent />
    </RouteGuard>
  );
}

function BillingContent() {
  return (
    <AppShell
      title="Event-Driven Financial Ledger & Billing"
      subtitle="Automated line-item generation · Insurance claim pre-clearing · QR Receipts"
      actions={
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F8EC] px-3 py-1 text-xs font-bold text-[#1D8A39] border border-[#B6ECC3] truncate">
            <ShieldCheck className="size-3.5 shrink-0" /> Event-Driven Ledger Active
          </span>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_360px] min-w-0">
        {/* Invoices List */}
        <div className="space-y-6 min-w-0">
          <Panel title="Active Patient Invoices" subtitle="Generated automatically from operational events">
            <div className="space-y-4 min-w-0">
              <div className="apple-card p-5 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/5 pb-3 gap-2 min-w-0">
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-black block truncate">INV-2026-9041</span>
                    <h3 className="text-lg font-bold text-black truncate">Elena Rostova (MRN-8829)</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] px-3 py-1 text-xs font-bold border border-[#B6ECC3] truncate">
                      Insurance Claim Approved (80%)
                    </span>
                    <StatusPill status="busy" label="Copay Due" />
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs min-w-0">
                  <div className="flex justify-between py-1.5 border-b border-black/5 font-medium gap-2 min-w-0">
                    <span className="text-[#515154] truncate">Emergency Consultation & Triage (Dr. Sarah Hana)</span>
                    <span className="font-bold text-black numeric shrink-0">$250.00</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-black/5 font-medium gap-2 min-w-0">
                    <span className="text-[#515154] truncate">Head Non-Contrast CT Scan (Radiology)</span>
                    <span className="font-bold text-black numeric shrink-0">$650.00</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-black/5 font-medium gap-2 min-w-0">
                    <span className="text-[#515154] truncate">Sumatriptan 50mg Oral (Pharmacy Dispense)</span>
                    <span className="font-bold text-black numeric shrink-0">$45.00</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between border-t border-black/5 pt-3 gap-3 min-w-0">
                  <div className="text-xs font-medium text-[#86868B] truncate">
                    Total: <strong className="text-black numeric text-base">$945.00</strong> · Insurance Pays: <strong className="text-[#1D8A39] numeric">$756.00</strong> · Patient Copay: <strong className="text-black numeric">$189.00</strong>
                  </div>
                  <button className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-[#1D1D1F] transition-colors shadow-md shrink-0 cursor-pointer">
                    Process Patient Copay ($189.00)
                  </button>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Sidebar: Ledger Financial Telemetry */}
        <div className="space-y-4 min-w-0">
          <Panel title="Revenue Snapshot" subtitle="Today's financial metrics">
            <div className="space-y-4 min-w-0">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider block truncate">Gross Billed</span>
                <p className="text-3xl font-extrabold text-black numeric mt-1 truncate">$42,850.00</p>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider block truncate">Auto-Insurance Cleared</span>
                <p className="text-3xl font-extrabold text-[#1D8A39] numeric mt-1 truncate">$34,280.00</p>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider block truncate">Patient Copays</span>
                <p className="text-3xl font-extrabold text-black numeric mt-1 truncate">$8,570.00</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
