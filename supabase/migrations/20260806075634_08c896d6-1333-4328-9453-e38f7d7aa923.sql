-- STAFF: real user fields
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS shift_pattern text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS staff_email_key ON public.staff (lower(email)) WHERE email IS NOT NULL;

DROP TRIGGER IF EXISTS staff_updated_at ON public.staff;
CREATE TRIGGER staff_updated_at BEFORE UPDATE ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ROLE ASSIGNMENT: honour the role chosen at provisioning time
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role app_role;
  _first boolean;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, hospital_id, job_title)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    (SELECT id FROM public.hospitals ORDER BY created_at LIMIT 1),
    NEW.raw_user_meta_data->>'job_title'
  )
  ON CONFLICT (user_id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO _first;

  BEGIN
    _role := (NEW.raw_user_meta_data->>'role')::app_role;
  EXCEPTION WHEN others THEN
    _role := NULL;
  END;

  IF _role IS NULL THEN
    _role := CASE WHEN _first THEN 'super_admin'::app_role ELSE 'receptionist'::app_role END;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  UPDATE public.staff SET user_id = NEW.id
  WHERE user_id IS NULL AND lower(email) = lower(NEW.email);

  RETURN NEW;
END;
$$;

-- ENCOUNTERS: journey handoff fields
ALTER TABLE public.encounters
  ADD COLUMN IF NOT EXISTS queue_ticket text,
  ADD COLUMN IF NOT EXISTS wristband_code text,
  ADD COLUMN IF NOT EXISTS bed_id uuid REFERENCES public.beds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discharge_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS disposition text,
  ADD COLUMN IF NOT EXISTS cleared_at timestamptz;

-- ORDERS: results flowing back to the ordering doctor
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS result_summary text,
  ADD COLUMN IF NOT EXISTS result_values jsonb,
  ADD COLUMN IF NOT EXISTS is_critical boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_by_label text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS specimen_barcode text,
  ADD COLUMN IF NOT EXISTS analyzer text,
  ADD COLUMN IF NOT EXISTS unit_price numeric(12,2);

-- BILLING
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES public.encounters(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'ETB',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  insurance_pct integer NOT NULL DEFAULT 0,
  insurance_covered numeric(12,2) NOT NULL DEFAULT 0,
  patient_due numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text,
  receipt_no text,
  tin_number text NOT NULL DEFAULT '0012345678',
  paid_at timestamptz,
  cleared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff write invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  source_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read invoice items" ON public.invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff write invoice items" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_encounter_key ON public.invoices (encounter_id) WHERE encounter_id IS NOT NULL;

-- REALTIME for cross-role sync
ALTER TABLE public.encounters REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.vitals REPLICA IDENTITY FULL;
ALTER TABLE public.beds REPLICA IDENTITY FULL;
ALTER TABLE public.invoices REPLICA IDENTITY FULL;
