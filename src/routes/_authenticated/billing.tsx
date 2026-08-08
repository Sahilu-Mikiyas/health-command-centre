import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  PieChart,
  Printer,
  QrCode,
  Receipt,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { generateFinancialClearance, generateTaxInvoice } from "@/lib/hip/pdf-engine";

import { AppShell } from "@/components/hip/app-shell";
import { HandoffBoard } from "@/components/hip/handoff-board";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Financial Ledger | Furii Hospital Prototype" },
      {
        name: "description",
        content:
          "Commercial billing clerk workspace: itemized charge capture, Telebirr & CBE payment processing, insurance claims, financial clearance & thermal receipt printing.",
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

type BillingTab =
  | "overview"
  | "invoicing"
  | "cashier"
  | "insurance"
  | "clearance"
  | "ledger";

function BillingContent() {
  const [activeTab, setActiveTab] = useState<BillingTab>("overview");
  const [printedReceipt, setPrintedReceipt] = useState<{
    invoiceId: string;
    patientName: string;
    mrn: string;
    amount: string;
    paymentMethod: string;
    tin: string;
  } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState("Telebirr / Mobile Money");
  const [paidStatus, setPaidStatus] = useState(false);

  const lineItems = [
    { code: "CHG-001", description: "Outpatient Medical Consultation (Dr. Bethlehem Tadesse)", qty: 1, rate: "350.00 ETB", total: 350 },
    { code: "CHG-002", description: "Comprehensive Metabolic Panel + Renal Function (Lab)", qty: 1, rate: "450.00 ETB", total: 450 },
    { code: "CHG-003", description: "CT Head Non-Contrast Scan (Radiology)", qty: 1, rate: "1,800.00 ETB", total: 1800 },
    { code: "CHG-004", description: "Sumatriptan 50mg Oral Tablets (Pharmacy)", qty: 6, rate: "40.00 ETB", total: 240 },
  ];

  const grandTotal = lineItems.reduce((acc, item) => acc + item.total, 0);

  const handleProcessPayment = () => {
    setPaidStatus(true);
    toast.success(`Payment of ${grandTotal.toLocaleString()} ETB processed via ${paymentMethod}. Financial clearance granted.`);
    setPrintedReceipt({
      invoiceId: "INV-88291",
      patientName: "Abebech Tadesse",
      mrn: "MRN-8829",
      amount: `${grandTotal.toLocaleString()} ETB`,
      paymentMethod,
      tin: "TIN-00982711",
    });
  };

  return (
    <AppShell
      title="Billing Ledger & Financial Operations Mission Control"
      subtitle="Charge capture · Cashier processing · Telebirr & CBE Birr · Third-party insurance claims · Financial clearance"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              generateTaxInvoice({
                patientName: "Abebech Tadesse",
                mrn: "MRN-8829",
                invoiceNumber: "INV-88291",
                items: lineItems.map((i) => ({
                  description: i.description || (i as any).name,
                  qty: i.qty || 1,
                  unitPrice: typeof i.rate === "number" ? i.rate : parseFloat(i.rate) || (i as any).unitPrice || 0,
                  total: i.total || 0,
                })),
                subtotal: grandTotal || 2840,
                insuranceCoverage: Math.round((grandTotal || 2840) * 0.8),
                copay: Math.round((grandTotal || 2840) * 0.2),
                paymentMethod: "Telebirr",
                transactionId: `TBR-${Date.now().toString().slice(-8)}`,
                cashierName: "Cashier Selamawit",
              })
            }
            className="inline-flex items-center gap-1.5 rounded-2xl bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Download className="size-4" /> Download Tax Invoice PDF
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EC] border border-[#B6ECC3] px-3.5 py-1 text-xs font-bold text-[#1D8A39]">
            <ShieldCheck className="size-3.5" /> Cashier Desk Online
          </span>
        </div>
      }
    >
      <HandoffBoard role="billing" />
      {/* Thermal Receipt Print Modal */}
      {printedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="apple-card max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <span className="text-xs font-black uppercase text-black">Official Thermal Payment Receipt</span>
              <button onClick={() => setPrintedReceipt(null)} className="text-[#86868B] hover:text-black">
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-black/20 bg-[#FAFAFC] p-5 space-y-3 font-mono text-xs">
              <h3 className="text-sm font-black text-black uppercase tracking-wider">FURII HOSPITAL PROTOTYPE</h3>
              <p className="text-[10px] text-[#86868B]">{printedReceipt.tin} · Addis Ababa</p>

              <div className="border-t border-b border-black/10 py-2 space-y-1 text-left">
                <p><strong>Receipt #:</strong> {printedReceipt.invoiceId}</p>
                <p><strong>Patient:</strong> {printedReceipt.patientName}</p>
                <p><strong>MRN:</strong> {printedReceipt.mrn}</p>
                <p><strong>Method:</strong> {printedReceipt.paymentMethod}</p>
                <p className="text-base font-black text-black pt-1"><strong>Total Paid:</strong> {printedReceipt.amount}</p>
              </div>

              <div className="grid size-16 place-items-center rounded-xl bg-black text-white mx-auto shadow-2xs">
                <QrCode className="size-10" />
              </div>
              <p className="text-[9px] text-[#86868B]">Official Tax Invoice · Thank you!</p>
            </div>

            <button
              onClick={() => {
                toast.success("Printed official payment receipt.");
                setPrintedReceipt(null);
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer"
            >
              <Printer className="size-4" /> Print Thermal Receipt
            </button>
          </div>
        </div>
      )}

      {/* Commercial Sub-Tab Rail */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/5 pb-4 overflow-x-auto">
        {[
          { id: "overview", label: "Financial Dashboard", icon: Banknote },
          { id: "invoicing", label: "Charge Capture & Invoicing", icon: Receipt },
          { id: "cashier", label: "Cashier Desk & Payments", icon: Wallet },
          { id: "insurance", label: "Insurance & Claims Desk", icon: ShieldCheck },
          { id: "clearance", label: "Financial Discharge Clearance", icon: FileCheck },
          { id: "ledger", label: "Hospital Financial Ledger", icon: FileSpreadsheet },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as BillingTab)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? "bg-black text-white shadow-md scale-105"
                : "bg-white text-[#1D1D1F] border border-black/5 hover:bg-[#F5F5F7]"
            }`}
          >
            <tab.icon className="size-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: FINANCIAL DASHBOARD */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel className="min-w-0">
              <Stat label="Today's Collections" value="48,250 ETB" hint="Cash & Telebirr" tone="ok" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Pending Invoices" value="4" hint="Awaiting payment" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Unpaid Claims" value="12,400 ETB" hint="Private Insurance" tone="warn" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Discharge Clearance" value="98.5%" hint="Zero-debt policy" tone="ok" />
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            {/* Active Invoices List */}
            <Panel title="Itemized Patient Billing Accounts" subtitle="Active encounters awaiting billing clearance">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-black text-sm">Abebech Tadesse</span>
                      <span className="rounded-full bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2] px-2.5 py-0.5 text-[10px] font-bold">
                        Pending Payment
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#86868B] mt-0.5">MRN-8829 · Consultation + Lab + CT Scan + Pharmacy</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-black numeric">{grandTotal.toLocaleString()} ETB</span>
                    <button
                      onClick={() => setActiveTab("cashier")}
                      className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                    >
                      Process Payment →
                    </button>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Payment Method Distribution */}
            <Panel title="Payment Channel Distribution" subtitle="Today's payment channels">
              <div className="space-y-3 text-xs font-semibold">
                <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#FAFAFC] p-3.5">
                  <div className="flex items-center gap-2">
                    <Smartphone className="size-4 text-[#0066CC]" />
                    <span className="font-bold text-black">Telebirr / Mobile Money</span>
                  </div>
                  <span className="font-bold text-black numeric">28,400 ETB (58%)</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#FAFAFC] p-3.5">
                  <div className="flex items-center gap-2">
                    <Wallet className="size-4 text-[#1D8A39]" />
                    <span className="font-bold text-black">CBE Birr / Bank Transfer</span>
                  </div>
                  <span className="font-bold text-black numeric">14,250 ETB (30%)</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#FAFAFC] p-3.5">
                  <div className="flex items-center gap-2">
                    <Banknote className="size-4 text-[#B86200]" />
                    <span className="font-bold text-black">Cash Collections</span>
                  </div>
                  <span className="font-bold text-black numeric">5,600 ETB (12%)</span>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CHARGE CAPTURE & INVOICING */}
      {activeTab === "invoicing" && (
        <div className="mx-auto max-w-4xl space-y-6">
          <Panel
            title="Itemized Patient Invoice & Charge Capture"
            subtitle="Patient: Abebech Tadesse (MRN-8829)"
            action={
              <button
                onClick={() =>
                  generateTaxInvoice({
                    patientName: 'Abebech Tadesse', mrn: 'MRN-8829',
                    invoiceNumber: 'INV-88291',
                    items: lineItems.map(i => ({ description: i.description || (i as any).name, qty: i.qty || 1, unitPrice: typeof i.rate === 'number' ? i.rate : parseFloat(i.rate) || (i as any).unitPrice || 0, total: i.total || 0 })),
                    subtotal: grandTotal || 2840,
                    insuranceCoverage: Math.round((grandTotal || 2840) * 0.8),
                    copay: Math.round((grandTotal || 2840) * 0.2),
                    paymentMethod: 'Telebirr',
                    transactionId: 'TBR-' + Date.now().toString().slice(-8),
                    cashierName: 'Cashier Selamawit',
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-[10px] font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer"
                title="Download PDF"
              >
                <Download className="size-3" /> Download PDF
              </button>
            }
          >
            <div className="space-y-4 text-xs font-semibold text-black">
              <div className="overflow-x-auto rounded-2xl border border-black/5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFC] text-[#86868B] font-extrabold uppercase tracking-wider border-b border-black/5">
                    <tr>
                      <th className="p-3">Code</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 font-semibold text-[#1D1D1F]">
                    {lineItems.map((item) => (
                      <tr key={item.code}>
                        <td className="p-3 font-mono text-[#86868B]">{item.code}</td>
                        <td className="p-3 font-bold text-black">{item.description}</td>
                        <td className="p-3 text-center">{item.qty}</td>
                        <td className="p-3 text-right text-[#86868B]">{item.rate}</td>
                        <td className="p-3 text-right font-bold text-black">{item.total.toLocaleString()} ETB</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-black/10 bg-[#FAFAFC] font-black text-black">
                    <tr>
                      <td colSpan={4} className="p-3 text-right text-sm">Grand Total Amount Due:</td>
                      <td className="p-3 text-right text-base text-black">{grandTotal.toLocaleString()} ETB</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <button
                onClick={() => setActiveTab("cashier")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                Proceed to Cashier Payment →
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 3: CASHIER DESK & PAYMENTS */}
      {activeTab === "cashier" && (
        <div className="mx-auto max-w-2xl space-y-6">
          <Panel title="Cashier Terminal & Payment Collection" subtitle="Abebech Tadesse · Total: 2,840.00 ETB">
            <div className="space-y-5 text-xs font-semibold text-black">
              <div className="rounded-2xl border border-black/10 bg-[#F5F5F7] p-5 text-center space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-[#86868B]">Amount to Collect</span>
                <h3 className="text-3xl font-black text-black numeric">{grandTotal.toLocaleString()} ETB</h3>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase text-[#86868B]">Select Payment Channel</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    "Telebirr / Mobile Money",
                    "CBE Birr / Bank Transfer",
                    "Cash Collection",
                    "Visa / Mastercard",
                  ].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-3.5 rounded-2xl border text-xs font-bold transition-all text-left cursor-pointer ${
                        paymentMethod === method
                          ? "border-black bg-black text-white shadow-md scale-105"
                          : "border-black/10 bg-[#FAFAFC] text-black hover:bg-white"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleProcessPayment}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-4 text-sm font-bold text-white shadow-xl hover:bg-slate-800 transition-all cursor-pointer scale-105"
              >
                <Receipt className="size-4" /> Collect {grandTotal.toLocaleString()} ETB & Issue Receipt
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 4: INSURANCE & CLAIMS */}
      {activeTab === "insurance" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel title="Third-Party Insurance & Claims Desk" subtitle="Verify coverage & submit claims">
            <div className="space-y-3 text-xs font-semibold text-[#1D1D1F]">
              <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#FAFAFC] p-4">
                <div>
                  <p className="font-bold text-black text-sm">Ethiopian Health Insurance Agency (EHIA)</p>
                  <p className="text-[#86868B]">Policy #EHIA-99201 · 80% Coverage · Copay: 568 ETB</p>
                </div>
                <button
                  onClick={() => toast.success("Insurance claim pre-authorized for Abebech Tadesse.")}
                  className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                >
                  Verify Coverage & Pre-Authorize
                </button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 5: FINANCIAL CLEARANCE */}
      {activeTab === "clearance" && (
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <Panel
            title="Inpatient Financial Discharge Clearance"
            subtitle="Verify zero-balance prior to exit"
            action={
              <button
                onClick={() =>
                  generateFinancialClearance({
                    patientName: 'Abebech Tadesse', mrn: 'MRN-8829',
                    invoiceNumber: 'INV-88291',
                    totalCharged: grandTotal || 2840,
                    totalPaid: grandTotal || 2840,
                    outstandingBalance: 0,
                    cashierName: 'Cashier Selamawit',
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-[10px] font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer"
                title="Download PDF"
              >
                <Download className="size-3" /> Download PDF
              </button>
            }
          >
            <div className="p-6 space-y-4">
              <div className="grid size-16 place-items-center rounded-full bg-[#E8F8EC] border-2 border-[#B6ECC3] text-[#1D8A39] mx-auto shadow-md">
                <CheckCircle2 className="size-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-black">Abebech Tadesse — Zero Balance Confirmed</h3>
                <p className="text-xs text-[#86868B] mt-1">All charges (Consultation, Lab, CT Scan, Pharmacy) fully settled.</p>
              </div>
              <button
                onClick={() => toast.success("Official Financial Clearance Certificate issued.")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer"
              >
                <FileCheck className="size-4" /> Issue Financial Clearance Certificate
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 6: FINANCIAL LEDGER */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          <Panel title="Hospital Revenue & Financial Ledger Analytics" subtitle="Daily financial summary">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Total Revenue Today</span>
                <p className="text-2xl font-black text-black numeric">48,250 ETB</p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Outstanding Insurance Debt</span>
                <p className="text-2xl font-black text-[#B86200] numeric">12,400 ETB</p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Clearance Rate</span>
                <p className="text-2xl font-black text-[#1D8A39] numeric">98.5%</p>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
