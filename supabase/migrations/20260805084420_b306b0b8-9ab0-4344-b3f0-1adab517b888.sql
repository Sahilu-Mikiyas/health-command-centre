CREATE TYPE public.appointment_status AS ENUM ('booked','arrived','in_progress','completed','cancelled','no_show');
CREATE TYPE public.order_category AS ENUM ('laboratory','imaging','medication','procedure');
CREATE TYPE public.order_status AS ENUM ('draft','requested','in_progress','resulted','completed','cancelled');

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  status public.appointment_status NOT NULL DEFAULT 'booked',
  booked_by_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read appointments" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff write appointments" ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid REFERENCES public.encounters(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  author_id uuid,
  author_label text,
  note_type text NOT NULL DEFAULT 'consultation',
  subjective text,
  objective text,
  assessment text,
  plan text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_notes TO authenticated;
GRANT ALL ON public.clinical_notes TO service_role;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read notes" ON public.clinical_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff insert notes" ON public.clinical_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff update unsigned notes" ON public.clinical_notes FOR UPDATE TO authenticated USING (signed_at IS NULL) WITH CHECK (true);
CREATE POLICY "staff delete unsigned notes" ON public.clinical_notes FOR DELETE TO authenticated USING (signed_at IS NULL);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES public.encounters(id) ON DELETE SET NULL,
  category public.order_category NOT NULL,
  code text,
  name text NOT NULL,
  priority text NOT NULL DEFAULT 'routine',
  status public.order_status NOT NULL DEFAULT 'requested',
  instructions text,
  requested_by_id uuid,
  requested_by_label text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff write orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_appointments_sched ON public.appointments(scheduled_at);
CREATE INDEX idx_orders_patient ON public.orders(patient_id);
CREATE INDEX idx_notes_patient ON public.clinical_notes(patient_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, public;

CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON public.clinical_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;