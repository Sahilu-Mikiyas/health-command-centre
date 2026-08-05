# Hospital Intelligence Platform (HIP)

A phased build of an event-driven hospital operating system: every department emits events, one intelligence layer consumes them, and every screen drills into every other screen. Real backend (Lovable Cloud) and real AI from Phase 1 — no mock layers to rip out later.

We execute one phase per approval. Each phase ships working, navigable, data-backed screens.

---

## Design language (applies to every phase)

- **NASA mission control, not Grafana.** Near-black canvas, one cool accent, semantic status colours (green / amber / red) used only for status.
- Everything defined as design tokens in `src/styles.css` (oklch). No hardcoded colours in components, ever.
- Typography: one geometric sans for UI, tabular figures for all numbers. Generous negative space; data breathes.
- Motion is meaning: rings animate to value, dots flow through the patient-flow stream, verification rings replace spinners. No decorative fades.
- Hover reveals detail. Click expands a workspace. Nothing is a dead end — every entity links to its owning workspace.
- `Cmd/Ctrl+K` command palette available from every screen.

---

## Phase 1 — Platform Core (the DNA)

Nothing else works without this. Deliverables:

**Backend foundation (Lovable Cloud)**
- Multi-tenant: `hospitals`, `departments`, `rooms`, `beds`, `wards`.
- Identity: `profiles`, `user_roles` (separate table, enum `app_role`: super_admin, ceo, medical_director, doctor, nurse, receptionist, lab_tech, radiologist, pharmacist, cashier, patient), `has_role()` security-definer function, plus attribute-level field permissions.
- **Event bus**: `events` table (append-only: hospital, actor, entity, type, payload, occurred_at) + `emit_event()` helper. Every later module writes here. Billing, Command Centre and audit all read from here.
- **Audit ledger**: append-only `audit_log`, no updates/deletes, plus `data_provenance` (source, entered_by, verified_by, confidence) for governance.
- Patients: `patients`, `allergies`, `conditions`, `vitals`, `encounters` — the Living Patient Record other modules extend.
- RLS + explicit GRANTs on every table; role-scoped policies.

**Frontend foundation**
- Design system + tokens, dark mission-control theme.
- App shell: role-aware sidebar, top status ribbon, right-hand intelligence rail, `_authenticated` gate, `/auth` with email+password and Google.
- Command palette (Cmd+K) with entity search scaffolding.
- Reusable primitives every module reuses: StatusPill, MetricRing, Timeline, HoverPreviewCard, ExpandableWorkspace, DrillDownLink, ScanVerifyRing, AlertCard.
- **AI layer**: server functions on Lovable AI (`openai/gpt-5.6-sol`), streaming, plus a persistent "Hospital Brain" ribbon component wired to real events.
- Seeded demo hospital (migration INSERTs): departments, wards, 520 beds, ~40 staff, ~120 patients, so every screen is alive on first load.

## Phase 2 — Reception & Patient Journey
Registration, wristbands, queue engine, appointment scheduling, insurance verification at the door, live patient-journey state machine (Registered → Waiting → Nurse → Doctor → Lab → Pharmacy → Billing → Exit). Emits the flow events the Command Centre later animates.

## Phase 3 — Doctor Workspace
Living Patient Record, one-page consultation (history, exam, diagnosis, orders, prescription), AI clinical assistant with summaries and decision support, order entry that emits lab/radiology/pharmacy/billing events, voice notes, live prescription status.

## Phase 4 — Nursing Workspace
Task board, vitals capture with trend sparklines, medication administration records, ward and bed board, handover, escalation rules (e.g. potassium > 6.5 → notify → escalate → log).

## Phase 5 — Laboratory
Sample lifecycle (collect → receive → run → validate → sign), worklists, analyser/machine health, TAT metrics, critical-result escalation with acknowledgement, result trends back into the patient record.

## Phase 6 — Radiology
Modality worklist, study lifecycle, report editor with structured templates, AI imaging assist with confidence thresholds, sign-off, image viewer surface.

## Phase 7 — Pharmacy Workspace (full spec)
Incoming Rx task cards with hover preview (diagnosis, allergies, eGFR, pregnancy, insurance); one-page prescription workspace (patient → medications → safety → inventory → dispense → counselling → complete); smart medication cards with hover expansion; AI medication safety panel with explainable checks and interaction score; visual interaction map; scan-verify dispensing flow with barcode/batch/expiry/strength/patient verification and blocking wrong-medication state; controlled-drugs workspace with step-up auth and reason logging; warehouse visualisation (zones, shelves, cabinets, temperature); expiry heat map; AI stock prediction and purchase recommendations; alternative-medicine engine; multilingual counselling sheets (print / send / read aloud); medication timeline; pharmacy analytics.

## Phase 8 — Billing, Finance & Insurance
Event-driven charging (no manual invoices), live invoice timeline, invoice builder, all payment methods with animated split-payment slider, refund engine with approval and immutable trail, QR receipts and PDF/email/SMS delivery, insurance verification, coverage card, prefilled claim builder, claim timeline, rejection centre with one-click resolve and resubmit, financial timeline.

## Phase 9 — Patient Portal
Zero-clutter home, chronological health timeline, health dashboard (conditions, allergies, medications, vaccinations, lab trends, goals), AI health companion grounded in the patient's own record with the care-team disclaimer, context-attached secure messaging, consented and audited family mode.

## Phase 10 — Hospital Command Centre & Digital Twin
AI status sentence, Global Health Score ring with clickable sub-scores, live hospital map, animated patient-flow stream with visible bottlenecks, capacity rings, queue intelligence with prediction, department cards, OT board, emergency/ambulance board, live staff board, AI operational brain with approve-action suggestions, live alerts, hospital timeline, resource heatmap, bed intelligence, equipment/IoT health, financial snapshot, infection-control surveillance, satisfaction, environmental and security dashboards, AI executive assistant, daily executive brief export, plus the isometric Digital Twin with zoom/pan/infinite drill-down.

## Phase 11 — Super Admin Platform
Hospital builder and visual Workflow Studio (drag-and-drop journeys with branches), department/room/bed builders, role+attribute permission matrix with temporary grants and break-glass access, staff cards, org chart, shift planner with conflict detection, AI configuration (feature toggles, confidence thresholds, prompt management), automation engine, notification builder, form builder, analytics builder, theme builder, multi-hospital switching and cross-hospital referral, API manager and live API monitor, event monitor, queue inspector, security centre and threat map, audit explorer, backup centre, AI audit, data governance.

## Phase 12 — Hardening
Performance, realtime tuning, permission and RLS review, security scan, accessibility, SEO/metadata, executive-display mode for 85-inch screens.

---

## Technical notes

- Stack stays TanStack Start + React 19 + Tailwind v4; data via `createServerFn` (no edge functions), reads via TanStack Query with route loaders.
- Realtime: Supabase Realtime on the `events` table drives every live surface, so departments never call each other directly.
- AI: server-side Lovable AI Gateway only, streaming responses, key never reaches the browser. AI output is always labelled, confidence-scored, and never auto-acts without human approval.
- Roles never live on profile tables; all checks go through `has_role()`.
- Audit and event tables are append-only — nothing is ever deleted.

## Positioning

Product name and language throughout: **Hospital Intelligence Platform (HIP)** — not a management system.

---

Approve to begin **Phase 1 — Platform Core**.
