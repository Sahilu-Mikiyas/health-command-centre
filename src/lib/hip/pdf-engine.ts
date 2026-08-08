/**
 * Furii Hospital OS — PDF Document Engine
 *
 * Core utility that programmatically generates beautifully designed
 * PDF documents using jsPDF. Each template follows Ethiopian hospital
 * branding with Furii Hospital letterhead, bilingual support, and
 * role-specific document layouts.
 */
import { jsPDF } from "jspdf";

// ─── Design Tokens ───────────────────────────────────────────────
const COLORS = {
  black: [0, 0, 0] as const,
  darkGray: [29, 29, 31] as const,     // #1D1D1F
  midGray: [81, 81, 84] as const,      // #515154
  lightGray: [134, 134, 139] as const, // #86868B
  border: [220, 220, 224] as const,    // #DCDCE0
  bgLight: [245, 245, 247] as const,   // #F5F5F7
  white: [255, 255, 255] as const,
  green: [29, 138, 57] as const,       // #1D8A39
  red: [215, 0, 21] as const,          // #D70015
  amber: [184, 98, 0] as const,        // #B86200
  blue: [0, 122, 255] as const,        // #007AFF
};

const HOSPITAL_NAME = "Furii Hospital";
const HOSPITAL_SUBTITLE = "ፉሪ ሆስፒታል";
const HOSPITAL_ADDRESS = "Addis Ababa, Ethiopia · +251 11 551 7700";
const HOSPITAL_TIN = "TIN-00982711";

// ─── Helper: Create base PDF with letterhead ─────────────────────
function createBasePDF(options: {
  title: string;
  subtitle?: string;
  orientation?: "portrait" | "landscape";
}): { doc: jsPDF; y: number } {
  const doc = new jsPDF({
    orientation: options.orientation ?? "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();

  // ── Top accent line ──
  doc.setFillColor(...COLORS.black);
  doc.rect(0, 0, pageW, 3, "F");

  // ── Hospital Logo Block ──
  doc.setFillColor(...COLORS.black);
  doc.roundedRect(15, 8, 10, 10, 2, 2, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("F", 20, 15, { align: "center" });

  // ── Hospital Name & Address ──
  doc.setTextColor(...COLORS.black);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(HOSPITAL_NAME, 28, 12);

  doc.setTextColor(...COLORS.lightGray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(HOSPITAL_ADDRESS, 28, 16.5);

  // ── Document Title (right-aligned) ──
  doc.setTextColor(...COLORS.black);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(options.title.toUpperCase(), pageW - 15, 12, { align: "right" });

  if (options.subtitle) {
    doc.setTextColor(...COLORS.midGray);
    doc.setFontSize(7);
    doc.text(options.subtitle, pageW - 15, 16.5, { align: "right" });
  }

  // ── Separator Line ──
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(15, 21, pageW - 15, 21);

  return { doc, y: 26 };
}

// ─── Helper: Section Header ──────────────────────────────────────
function sectionHeader(doc: jsPDF, y: number, label: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLORS.bgLight);
  doc.rect(15, y, pageW - 30, 7, "F");
  doc.setTextColor(...COLORS.midGray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(label.toUpperCase(), 18, y + 4.8);
  return y + 10;
}

// ─── Helper: Key-Value Row ───────────────────────────────────────
function kvRow(doc: jsPDF, y: number, key: string, value: string, options?: { bold?: boolean; color?: readonly [number, number, number] }): number {
  doc.setTextColor(...COLORS.lightGray);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(key, 18, y);

  doc.setTextColor(...(options?.color ?? COLORS.black));
  doc.setFontSize(8);
  doc.setFont("helvetica", options?.bold ? "bold" : "normal");
  doc.text(value, 70, y);
  return y + 5.5;
}

// ─── Helper: Table ───────────────────────────────────────────────
function drawTable(doc: jsPDF, y: number, headers: string[], rows: string[][], colWidths: number[]): number {
  const startX = 15;
  const rowH = 6.5;

  // Header row
  doc.setFillColor(...COLORS.black);
  let totalW = colWidths.reduce((a, b) => a + b, 0);
  doc.rect(startX, y, totalW, rowH, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  let x = startX;
  headers.forEach((h, i) => {
    doc.text(h, x + 2, y + 4.5);
    x += colWidths[i];
  });
  y += rowH;

  // Data rows
  rows.forEach((row, rowIdx) => {
    if (rowIdx % 2 === 0) {
      doc.setFillColor(...COLORS.bgLight);
      doc.rect(startX, y, totalW, rowH, "F");
    }

    doc.setTextColor(...COLORS.black);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    x = startX;
    row.forEach((cell, i) => {
      doc.text(cell.substring(0, Math.floor(colWidths[i] / 1.8)), x + 2, y + 4.5);
      x += colWidths[i];
    });
    y += rowH;
  });

  return y + 3;
}

// ─── Helper: Footer ──────────────────────────────────────────────
function addFooter(doc: jsPDF, options?: { signatureLabel?: string; signatureName?: string }) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Signature block
  if (options?.signatureLabel) {
    const sigY = pageH - 38;
    doc.setDrawColor(...COLORS.border);
    doc.line(pageW - 80, sigY + 10, pageW - 15, sigY + 10);
    doc.setTextColor(...COLORS.lightGray);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(options.signatureLabel, pageW - 80, sigY + 14);
    if (options.signatureName) {
      doc.setTextColor(...COLORS.black);
      doc.setFont("helvetica", "bold");
      doc.text(options.signatureName, pageW - 80, sigY + 8);
    }
  }

  // Bottom footer bar
  doc.setFillColor(...COLORS.bgLight);
  doc.rect(0, pageH - 16, pageW, 16, "F");
  doc.setDrawColor(...COLORS.border);
  doc.line(0, pageH - 16, pageW, pageH - 16);

  doc.setTextColor(...COLORS.lightGray);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text(`${HOSPITAL_NAME} · ${HOSPITAL_SUBTITLE} · ${HOSPITAL_TIN}`, 15, pageH - 10);
  doc.text("This document is system-generated. Unauthorized reproduction is prohibited.", 15, pageH - 6);

  const now = new Date();
  const ts = now.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  doc.text(`Generated: ${ts}`, pageW - 15, pageH - 10, { align: "right" });
  doc.text(`Page 1 of 1`, pageW - 15, pageH - 6, { align: "right" });
}

// ─── Helper: Download PDF ────────────────────────────────────────
function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(`${filename}.pdf`);
}

// ─── Helper: Current timestamp string ────────────────────────────
function nowStr(): string {
  return new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function todayStr(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ═══════════════════════════════════════════════════════════════════
// 1. RECEPTION — Queue Ticket
// ═══════════════════════════════════════════════════════════════════
export function generateQueueTicket(data: {
  ticketNumber: string;
  patientName: string;
  mrn: string;
  department: string;
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 120] });

  doc.setFillColor(...COLORS.black);
  doc.rect(0, 0, 80, 2, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.black);
  doc.text(HOSPITAL_NAME, 40, 10, { align: "center" });

  doc.setFontSize(6);
  doc.setTextColor(...COLORS.lightGray);
  doc.text("Queue Ticket", 40, 15, { align: "center" });

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.black);
  doc.text(data.ticketNumber, 40, 35, { align: "center" });

  doc.setDrawColor(...COLORS.border);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(10, 42, 70, 42);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(data.patientName, 40, 50, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.midGray);
  doc.text(`MRN: ${data.mrn}`, 40, 56, { align: "center" });
  doc.text(`Dept: ${data.department}`, 40, 62, { align: "center" });
  doc.text(nowStr(), 40, 68, { align: "center" });

  doc.setFillColor(...COLORS.bgLight);
  doc.rect(0, 100, 80, 20, "F");
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.lightGray);
  doc.text("Please wait for your number to be called.", 40, 108, { align: "center" });

  downloadPDF(doc, `queue-ticket-${data.ticketNumber}`);
}

// ═══════════════════════════════════════════════════════════════════
// 2. RECEPTION — Appointment Confirmation Slip
// ═══════════════════════════════════════════════════════════════════
export function generateAppointmentSlip(data: {
  patientName: string;
  mrn: string;
  appointmentDate: string;
  appointmentTime: string;
  department: string;
  physician: string;
  room: string;
  notes?: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Appointment Confirmation", subtitle: "የቀጠሮ ማረጋገጫ" });
  let y = startY;

  y = sectionHeader(doc, y, "Patient Information");
  y = kvRow(doc, y, "Patient Name", data.patientName, { bold: true });
  y = kvRow(doc, y, "MRN", data.mrn);

  y = sectionHeader(doc, y, "Appointment Details");
  y = kvRow(doc, y, "Date", data.appointmentDate, { bold: true });
  y = kvRow(doc, y, "Time", data.appointmentTime, { bold: true });
  y = kvRow(doc, y, "Department", data.department);
  y = kvRow(doc, y, "Physician", data.physician);
  y = kvRow(doc, y, "Room / Clinic", data.room);

  if (data.notes) {
    y = sectionHeader(doc, y, "Preparation Notes");
    doc.setTextColor(...COLORS.black);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(data.notes, 18, y, { maxWidth: 160 });
  }

  addFooter(doc);
  downloadPDF(doc, `appointment-${data.mrn}-${data.appointmentDate}`);
}

// ═══════════════════════════════════════════════════════════════════
// 3. NURSE — Triage & Vitals Chart
// ═══════════════════════════════════════════════════════════════════
export function generateTriageChart(data: {
  patientName: string;
  mrn: string;
  age: string;
  gender: string;
  bp: string;
  temp: string;
  hr: string;
  spo2: string;
  rr: string;
  gcs: string;
  news2Score: number;
  news2Risk: string;
  chiefComplaint: string;
  allergies: string;
  nurseName: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Triage & Vitals Chart", subtitle: "የመመርመሪያ ቅጽ" });
  let y = startY;

  y = sectionHeader(doc, y, "Patient Demographics");
  y = kvRow(doc, y, "Patient Name", data.patientName, { bold: true });
  y = kvRow(doc, y, "MRN", data.mrn);
  y = kvRow(doc, y, "Age / Gender", `${data.age} · ${data.gender}`);
  y = kvRow(doc, y, "Known Allergies", data.allergies || "NKDA", { color: data.allergies ? COLORS.red : COLORS.green });

  y = sectionHeader(doc, y, "Vital Signs");
  const vitals = [
    ["Blood Pressure", data.bp, "Heart Rate", data.hr],
    ["Temperature", data.temp, "SpO2", data.spo2],
    ["Respiratory Rate", data.rr, "GCS", data.gcs],
  ];
  vitals.forEach((row) => {
    doc.setTextColor(...COLORS.lightGray);
    doc.setFontSize(8);
    doc.text(row[0], 18, y);
    doc.setTextColor(...COLORS.black);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], 55, y);
    doc.setTextColor(...COLORS.lightGray);
    doc.setFont("helvetica", "normal");
    doc.text(row[2], 100, y);
    doc.setTextColor(...COLORS.black);
    doc.setFont("helvetica", "bold");
    doc.text(row[3], 135, y);
    y += 6;
  });

  y = sectionHeader(doc, y + 2, "NEWS2 Clinical Risk Score");
  const riskColor = data.news2Score >= 7 ? COLORS.red : data.news2Score >= 5 ? COLORS.amber : data.news2Score >= 3 ? COLORS.amber : COLORS.green;
  y = kvRow(doc, y, "NEWS2 Score", `${data.news2Score}`, { bold: true, color: riskColor });
  y = kvRow(doc, y, "Risk Level", data.news2Risk, { bold: true, color: riskColor });

  y = sectionHeader(doc, y, "Chief Complaint");
  doc.setTextColor(...COLORS.black);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(data.chiefComplaint, 18, y, { maxWidth: 160 });

  addFooter(doc, { signatureLabel: "Triage Nurse", signatureName: data.nurseName });
  downloadPDF(doc, `triage-chart-${data.mrn}`);
}

// ═══════════════════════════════════════════════════════════════════
// 4. NURSE — Medication Administration Record (MAR)
// ═══════════════════════════════════════════════════════════════════
export function generateMAR(data: {
  patientName: string;
  mrn: string;
  ward: string;
  bed: string;
  medications: Array<{ drug: string; dose: string; route: string; time: string; status: string }>;
  nurseName: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Medication Administration Record", subtitle: "MAR" });
  let y = startY;

  y = sectionHeader(doc, y, "Patient");
  y = kvRow(doc, y, "Name", data.patientName, { bold: true });
  y = kvRow(doc, y, "MRN", data.mrn);
  y = kvRow(doc, y, "Ward / Bed", `${data.ward} · ${data.bed}`);

  y = sectionHeader(doc, y, "Administered Medications");
  y = drawTable(doc, y, ["Medication", "Dose", "Route", "Time", "Status"],
    data.medications.map((m) => [m.drug, m.dose, m.route, m.time, m.status]),
    [55, 25, 22, 30, 28],
  );

  addFooter(doc, { signatureLabel: "Administering Nurse", signatureName: data.nurseName });
  downloadPDF(doc, `mar-${data.mrn}`);
}

// ═══════════════════════════════════════════════════════════════════
// 5. DOCTOR — Medical Sick Leave Certificate
// ═══════════════════════════════════════════════════════════════════
export function generateSickLeaveCert(data: {
  patientName: string;
  mrn: string;
  age: string;
  gender: string;
  diagnosis: string;
  icdCode: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  doctorName: string;
  licenseId: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Medical Sick Leave Certificate", subtitle: "ለህክምና እረፍት ማረጋገጫ" });
  let y = startY;

  y = sectionHeader(doc, y, "Patient Information");
  y = kvRow(doc, y, "Full Name", data.patientName, { bold: true });
  y = kvRow(doc, y, "MRN", data.mrn);
  y = kvRow(doc, y, "Age / Gender", `${data.age} · ${data.gender}`);

  y = sectionHeader(doc, y, "Medical Certification");
  y = kvRow(doc, y, "Diagnosis", data.diagnosis, { bold: true });
  y = kvRow(doc, y, "ICD-11 Code", data.icdCode);
  y = kvRow(doc, y, "Leave Period", `${data.startDate} — ${data.endDate}`, { bold: true });
  y = kvRow(doc, y, "Total Days", `${data.totalDays} calendar days`, { bold: true });

  y += 5;
  doc.setTextColor(...COLORS.black);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    `I hereby certify that the above-named patient has been examined and is medically unfit for work for the period stated above. This certificate is issued upon the patient's request for submission to their employer.`,
    18, y, { maxWidth: 160 },
  );

  addFooter(doc, { signatureLabel: `Attending Physician (${data.licenseId})`, signatureName: data.doctorName });
  downloadPDF(doc, `sick-leave-${data.mrn}`);
}

// ═══════════════════════════════════════════════════════════════════
// 6. DOCTOR — SOAP Clinical Summary
// ═══════════════════════════════════════════════════════════════════
export function generateSOAPSummary(data: {
  patientName: string;
  mrn: string;
  age: string;
  gender: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  doctorName: string;
  licenseId: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Clinical Consultation Report", subtitle: "SOAP Notes" });
  let y = startY;

  y = sectionHeader(doc, y, "Patient");
  y = kvRow(doc, y, "Name", data.patientName, { bold: true });
  y = kvRow(doc, y, "MRN", data.mrn);
  y = kvRow(doc, y, "Age / Gender", `${data.age} · ${data.gender}`);
  y = kvRow(doc, y, "Date", todayStr());

  const sections = [
    { label: "Subjective", text: data.subjective },
    { label: "Objective", text: data.objective },
    { label: "Assessment", text: data.assessment },
    { label: "Plan", text: data.plan },
  ];

  sections.forEach(({ label, text }) => {
    y = sectionHeader(doc, y, label);
    doc.setTextColor(...COLORS.black);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, 160);
    doc.text(lines, 18, y);
    y += lines.length * 4 + 3;
  });

  addFooter(doc, { signatureLabel: `Attending Physician (${data.licenseId})`, signatureName: data.doctorName });
  downloadPDF(doc, `soap-${data.mrn}`);
}

// ═══════════════════════════════════════════════════════════════════
// 7. DOCTOR — Referral Letter
// ═══════════════════════════════════════════════════════════════════
export function generateReferralLetter(data: {
  patientName: string;
  mrn: string;
  age: string;
  gender: string;
  referTo: string;
  referDepartment: string;
  clinicalFindings: string;
  currentMedications: string;
  urgency: string;
  doctorName: string;
  licenseId: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Specialist Referral Letter", subtitle: "የሐኪም ማስተላለፊያ ደብዳቤ" });
  let y = startY;

  y = sectionHeader(doc, y, "Patient");
  y = kvRow(doc, y, "Name", data.patientName, { bold: true });
  y = kvRow(doc, y, "MRN", data.mrn);
  y = kvRow(doc, y, "Age / Gender", `${data.age} · ${data.gender}`);

  y = sectionHeader(doc, y, "Referral Details");
  y = kvRow(doc, y, "Refer To", data.referTo, { bold: true });
  y = kvRow(doc, y, "Department", data.referDepartment);
  y = kvRow(doc, y, "Urgency", data.urgency, { bold: true, color: data.urgency === "URGENT" ? COLORS.red : COLORS.black });
  y = kvRow(doc, y, "Date", todayStr());

  y = sectionHeader(doc, y, "Clinical Findings");
  doc.setTextColor(...COLORS.black);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const findingsLines = doc.splitTextToSize(data.clinicalFindings, 160);
  doc.text(findingsLines, 18, y);
  y += findingsLines.length * 4 + 3;

  y = sectionHeader(doc, y, "Current Medications");
  doc.setTextColor(...COLORS.black);
  doc.setFontSize(8);
  doc.text(data.currentMedications, 18, y, { maxWidth: 160 });

  addFooter(doc, { signatureLabel: `Referring Physician (${data.licenseId})`, signatureName: data.doctorName });
  downloadPDF(doc, `referral-${data.mrn}`);
}

// ═══════════════════════════════════════════════════════════════════
// 8. DOCTOR — Discharge Summary
// ═══════════════════════════════════════════════════════════════════
export function generateDischargeSummary(data: {
  patientName: string;
  mrn: string;
  age: string;
  gender: string;
  admissionDate: string;
  dischargeDate: string;
  admittingDiagnosis: string;
  dischargeDiagnosis: string;
  treatmentSummary: string;
  dischargeMedications: string;
  followUpInstructions: string;
  doctorName: string;
  licenseId: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Hospital Discharge Summary", subtitle: "ከሆስፒታል የተሰናበቱበት ማጠቃለያ" });
  let y = startY;

  y = sectionHeader(doc, y, "Patient");
  y = kvRow(doc, y, "Name", data.patientName, { bold: true });
  y = kvRow(doc, y, "MRN", data.mrn);
  y = kvRow(doc, y, "Age / Gender", `${data.age} · ${data.gender}`);

  y = sectionHeader(doc, y, "Admission & Discharge");
  y = kvRow(doc, y, "Admitted", data.admissionDate);
  y = kvRow(doc, y, "Discharged", data.dischargeDate, { bold: true });
  y = kvRow(doc, y, "Admitting Dx", data.admittingDiagnosis);
  y = kvRow(doc, y, "Discharge Dx", data.dischargeDiagnosis, { bold: true });

  const textSections = [
    { label: "Treatment Summary", text: data.treatmentSummary },
    { label: "Discharge Medications", text: data.dischargeMedications },
    { label: "Follow-Up Instructions", text: data.followUpInstructions },
  ];
  textSections.forEach(({ label, text }) => {
    y = sectionHeader(doc, y, label);
    doc.setTextColor(...COLORS.black);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, 160);
    doc.text(lines, 18, y);
    y += lines.length * 4 + 3;
  });

  addFooter(doc, { signatureLabel: `Discharging Physician (${data.licenseId})`, signatureName: data.doctorName });
  downloadPDF(doc, `discharge-${data.mrn}`);
}

// ═══════════════════════════════════════════════════════════════════
// 9. LABORATORY — Diagnostic Report
// ═══════════════════════════════════════════════════════════════════
export function generateLabReport(data: {
  patientName: string;
  mrn: string;
  age: string;
  gender: string;
  orderingPhysician: string;
  specimenType: string;
  collectedAt: string;
  results: Array<{ test: string; result: string; unit: string; refRange: string; flag: string }>;
  techName: string;
  techId: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Laboratory Diagnostic Report", subtitle: "የላብራቶሪ ውጤት ሪፖርት" });
  let y = startY;

  y = sectionHeader(doc, y, "Patient & Specimen");
  y = kvRow(doc, y, "Patient Name", data.patientName, { bold: true });
  y = kvRow(doc, y, "MRN", data.mrn);
  y = kvRow(doc, y, "Age / Gender", `${data.age} · ${data.gender}`);
  y = kvRow(doc, y, "Ordering Physician", data.orderingPhysician);
  y = kvRow(doc, y, "Specimen Type", data.specimenType);
  y = kvRow(doc, y, "Collected At", data.collectedAt);

  y = sectionHeader(doc, y, "Test Results");
  y = drawTable(doc, y, ["Test", "Result", "Unit", "Reference", "Flag"],
    data.results.map((r) => [r.test, r.result, r.unit, r.refRange, r.flag]),
    [50, 25, 20, 40, 25],
  );

  addFooter(doc, { signatureLabel: `Lab Technologist (${data.techId})`, signatureName: data.techName });
  downloadPDF(doc, `lab-report-${data.mrn}`);
}

// ═══════════════════════════════════════════════════════════════════
// 10. RADIOLOGY — Imaging Report
// ═══════════════════════════════════════════════════════════════════
export function generateRadiologyReport(data: {
  patientName: string;
  mrn: string;
  age: string;
  gender: string;
  modality: string;
  bodyPart: string;
  contrastUsed: string;
  clinicalIndication: string;
  findings: string;
  impression: string;
  radiologistName: string;
  radiologistId: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Diagnostic Imaging Report", subtitle: "የምስል ምርመራ ሪፖርት" });
  let y = startY;

  y = sectionHeader(doc, y, "Patient");
  y = kvRow(doc, y, "Name", data.patientName, { bold: true });
  y = kvRow(doc, y, "MRN", data.mrn);
  y = kvRow(doc, y, "Age / Gender", `${data.age} · ${data.gender}`);

  y = sectionHeader(doc, y, "Examination");
  y = kvRow(doc, y, "Modality", data.modality, { bold: true });
  y = kvRow(doc, y, "Body Part", data.bodyPart);
  y = kvRow(doc, y, "Contrast", data.contrastUsed);
  y = kvRow(doc, y, "Clinical Indication", data.clinicalIndication);
  y = kvRow(doc, y, "Date", todayStr());

  y = sectionHeader(doc, y, "Findings");
  doc.setTextColor(...COLORS.black);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const findLines = doc.splitTextToSize(data.findings, 160);
  doc.text(findLines, 18, y);
  y += findLines.length * 4 + 3;

  y = sectionHeader(doc, y, "Impression");
  doc.setTextColor(...COLORS.black);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const impLines = doc.splitTextToSize(data.impression, 160);
  doc.text(impLines, 18, y);

  addFooter(doc, { signatureLabel: `Radiologist (${data.radiologistId})`, signatureName: data.radiologistName });
  downloadPDF(doc, `radiology-${data.mrn}`);
}

// ═══════════════════════════════════════════════════════════════════
// 11. WARD — Admission Slip
// ═══════════════════════════════════════════════════════════════════
export function generateAdmissionSlip(data: {
  patientName: string;
  mrn: string;
  age: string;
  gender: string;
  ward: string;
  bed: string;
  admittingDoctor: string;
  primaryNurse: string;
  admissionDate: string;
  diagnosis: string;
  isolation: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Inpatient Admission Slip", subtitle: "የህክምና ክፍል ቅበላ" });
  let y = startY;

  y = sectionHeader(doc, y, "Patient");
  y = kvRow(doc, y, "Name", data.patientName, { bold: true });
  y = kvRow(doc, y, "MRN", data.mrn);
  y = kvRow(doc, y, "Age / Gender", `${data.age} · ${data.gender}`);

  y = sectionHeader(doc, y, "Admission Details");
  y = kvRow(doc, y, "Ward", data.ward, { bold: true });
  y = kvRow(doc, y, "Bed", data.bed, { bold: true });
  y = kvRow(doc, y, "Admission Date", data.admissionDate);
  y = kvRow(doc, y, "Admitting Doctor", data.admittingDoctor);
  y = kvRow(doc, y, "Primary Nurse", data.primaryNurse);
  y = kvRow(doc, y, "Diagnosis", data.diagnosis);
  y = kvRow(doc, y, "Isolation Status", data.isolation, { color: data.isolation !== "None" ? COLORS.red : COLORS.green });

  addFooter(doc);
  downloadPDF(doc, `admission-${data.mrn}`);
}

// ═══════════════════════════════════════════════════════════════════
// 12. PHARMACY — e-Prescription
// ═══════════════════════════════════════════════════════════════════
export function generatePrescription(data: {
  patientName: string;
  mrn: string;
  age: string;
  gender: string;
  weight: string;
  egfr: string;
  prescriber: string;
  prescriberId: string;
  medications: Array<{ drug: string; dose: string; frequency: string; duration: string; instructions: string }>;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Electronic Prescription", subtitle: "የመድኃኒት ማዘዣ" });
  let y = startY;

  y = sectionHeader(doc, y, "Patient");
  y = kvRow(doc, y, "Name", data.patientName, { bold: true });
  y = kvRow(doc, y, "MRN", data.mrn);
  y = kvRow(doc, y, "Age / Gender", `${data.age} · ${data.gender}`);
  y = kvRow(doc, y, "Weight", data.weight);
  y = kvRow(doc, y, "eGFR", data.egfr);

  y = sectionHeader(doc, y, "Prescribed Medications");
  y = drawTable(doc, y, ["Medication", "Dose", "Frequency", "Duration", "Instructions"],
    data.medications.map((m) => [m.drug, m.dose, m.frequency, m.duration, m.instructions]),
    [45, 22, 25, 25, 43],
  );

  addFooter(doc, { signatureLabel: `Prescribing Physician (${data.prescriberId})`, signatureName: data.prescriber });
  downloadPDF(doc, `prescription-${data.mrn}`);
}

// ═══════════════════════════════════════════════════════════════════
// 13. BILLING — Tax Invoice & Receipt
// ═══════════════════════════════════════════════════════════════════
export function generateTaxInvoice(data: {
  patientName: string;
  mrn: string;
  invoiceNumber: string;
  items: Array<{ description: string; qty: number; unitPrice: number; total: number }>;
  subtotal: number;
  insuranceCoverage: number;
  copay: number;
  paymentMethod: string;
  transactionId: string;
  cashierName: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Official Tax Invoice", subtitle: `Invoice #${data.invoiceNumber} · ${HOSPITAL_TIN}` });
  let y = startY;

  y = sectionHeader(doc, y, "Patient & Invoice");
  y = kvRow(doc, y, "Patient", data.patientName, { bold: true });
  y = kvRow(doc, y, "MRN", data.mrn);
  y = kvRow(doc, y, "Invoice #", data.invoiceNumber, { bold: true });
  y = kvRow(doc, y, "Date", todayStr());

  y = sectionHeader(doc, y, "Itemized Charges");
  y = drawTable(doc, y, ["Description", "Qty", "Unit Price (ETB)", "Total (ETB)"],
    data.items.map((i) => [i.description, `${i.qty}`, `${i.unitPrice.toLocaleString()}`, `${i.total.toLocaleString()}`]),
    [70, 20, 35, 35],
  );

  y = sectionHeader(doc, y, "Payment Summary");
  y = kvRow(doc, y, "Subtotal", `${data.subtotal.toLocaleString()} ETB`);
  y = kvRow(doc, y, "Insurance Coverage", `-${data.insuranceCoverage.toLocaleString()} ETB`, { color: COLORS.green });
  y = kvRow(doc, y, "Patient Co-pay", `${data.copay.toLocaleString()} ETB`, { bold: true });
  y = kvRow(doc, y, "Payment Method", data.paymentMethod);
  y = kvRow(doc, y, "Transaction ID", data.transactionId);

  addFooter(doc, { signatureLabel: "Cashier", signatureName: data.cashierName });
  downloadPDF(doc, `invoice-${data.invoiceNumber}`);
}

// ═══════════════════════════════════════════════════════════════════
// 14. BILLING — Discharge Financial Clearance
// ═══════════════════════════════════════════════════════════════════
export function generateFinancialClearance(data: {
  patientName: string;
  mrn: string;
  invoiceNumber: string;
  totalCharged: number;
  totalPaid: number;
  outstandingBalance: number;
  cashierName: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Discharge Financial Clearance", subtitle: "የክፍያ ማጠናቀቂያ ምስክር ወረቀት" });
  let y = startY;

  y = sectionHeader(doc, y, "Patient");
  y = kvRow(doc, y, "Name", data.patientName, { bold: true });
  y = kvRow(doc, y, "MRN", data.mrn);
  y = kvRow(doc, y, "Invoice #", data.invoiceNumber);

  y = sectionHeader(doc, y, "Financial Summary");
  y = kvRow(doc, y, "Total Charged", `${data.totalCharged.toLocaleString()} ETB`);
  y = kvRow(doc, y, "Total Paid", `${data.totalPaid.toLocaleString()} ETB`, { color: COLORS.green });
  y = kvRow(doc, y, "Outstanding", `${data.outstandingBalance.toLocaleString()} ETB`, { bold: true, color: data.outstandingBalance > 0 ? COLORS.red : COLORS.green });

  y += 5;
  doc.setTextColor(...COLORS.black);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    "This is to certify that all financial obligations for the above-named patient have been settled. The patient is hereby cleared for discharge from a financial standpoint.",
    18, y, { maxWidth: 160 },
  );

  addFooter(doc, { signatureLabel: "Billing Clerk", signatureName: data.cashierName });
  downloadPDF(doc, `clearance-${data.mrn}`);
}

// ═══════════════════════════════════════════════════════════════════
// 15. HR — Staff Credential Audit
// ═══════════════════════════════════════════════════════════════════
export function generateStaffAudit(data: {
  staff: Array<{ name: string; role: string; licenseId: string; status: string; cmePoints: string }>;
  department: string;
  generatedBy: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Staff Credential Audit Report", subtitle: `${data.department} Department` });
  let y = startY;

  y = sectionHeader(doc, y, "Audit Details");
  y = kvRow(doc, y, "Department", data.department, { bold: true });
  y = kvRow(doc, y, "Audit Date", todayStr());
  y = kvRow(doc, y, "Total Staff", `${data.staff.length}`);

  y = sectionHeader(doc, y, "Staff Credentials");
  y = drawTable(doc, y, ["Staff Name", "Role", "License ID", "Status", "CME"],
    data.staff.map((s) => [s.name, s.role, s.licenseId, s.status, s.cmePoints]),
    [45, 35, 30, 25, 25],
  );

  addFooter(doc, { signatureLabel: "HR Manager", signatureName: data.generatedBy });
  downloadPDF(doc, `staff-audit-${data.department}`);
}

// ═══════════════════════════════════════════════════════════════════
// 16. EXECUTIVE — Performance Report
// ═══════════════════════════════════════════════════════════════════
export function generateExecutiveReport(data: {
  period: string;
  totalRevenue: string;
  totalPatients: string;
  avgLOS: string;
  bedOccupancy: string;
  infectionRate: string;
  metrics: Array<{ kpi: string; value: string; change: string }>;
  generatedBy: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Executive Performance Report", subtitle: data.period, orientation: "landscape" });
  let y = startY;

  y = sectionHeader(doc, y, "Key Performance Indicators");
  y = kvRow(doc, y, "Reporting Period", data.period, { bold: true });
  y = kvRow(doc, y, "Total Revenue", data.totalRevenue, { bold: true });
  y = kvRow(doc, y, "Total Patients Served", data.totalPatients);
  y = kvRow(doc, y, "Average Length of Stay", data.avgLOS);
  y = kvRow(doc, y, "Bed Occupancy Rate", data.bedOccupancy);
  y = kvRow(doc, y, "Hospital Infection Rate", data.infectionRate, { color: COLORS.green });

  y = sectionHeader(doc, y, "Detailed Metrics");
  y = drawTable(doc, y, ["KPI", "Value", "Change vs Prior"],
    data.metrics.map((m) => [m.kpi, m.value, m.change]),
    [100, 60, 60],
  );

  addFooter(doc, { signatureLabel: "CEO / Medical Director", signatureName: data.generatedBy });
  downloadPDF(doc, `executive-report-${data.period}`);
}

// ═══════════════════════════════════════════════════════════════════
// 17. WARD — Occupancy Census Report
// ═══════════════════════════════════════════════════════════════════
export function generateWardCensus(data: {
  wards: Array<{ name: string; totalBeds: number; occupied: number; available: number; occupancyPct: string }>;
  generatedBy: string;
}) {
  const { doc, y: startY } = createBasePDF({ title: "Ward Occupancy Census", subtitle: todayStr() });
  let y = startY;

  y = sectionHeader(doc, y, "Bed Occupancy Matrix");
  y = drawTable(doc, y, ["Ward", "Total Beds", "Occupied", "Available", "Occupancy %"],
    data.wards.map((w) => [w.name, `${w.totalBeds}`, `${w.occupied}`, `${w.available}`, w.occupancyPct]),
    [45, 25, 25, 25, 30],
  );

  addFooter(doc, { signatureLabel: "Ward Manager", signatureName: data.generatedBy });
  downloadPDF(doc, `ward-census-${new Date().toISOString().slice(0, 10)}`);
}
