-- SECURITY: clinical data is for staff with a granted role, not for any signed-in account.
--
-- Before this migration every clinical table allowed `TO authenticated USING (true)`,
-- and the public sign-up page gave every new account the receptionist role. Together
-- that meant anyone on the internet could create an account and read, change or
-- delete every patient record. This migration:
--   1. adds public.is_staff(uid): true only for an account with a current staff role;
--   2. re-creates every open policy so it requires is_staff (same names, same intent);
--   3. limits deleting a patient (which cascades to the whole chart) to administrators;
--   4. makes emit_event refuse callers without a staff role;
--   5. stops giving self-registered accounts a role: they wait until an administrator
--      or HR adds them to the staff roster (the first account on a fresh install is
--      still the bootstrap super admin, and roster matches still get their role).
-- Reference data with no patient information (hospital, departments, wards, rooms,
-- beds, notification thresholds) stays readable by any signed-in account.

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role <> 'patient'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- ---------------------------------------------------------------- clinical record
DROP POLICY IF EXISTS "staff read patients" ON public.patients;
DROP POLICY IF EXISTS "staff write patients" ON public.patients;
CREATE POLICY "staff read patients" ON public.patients FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert patients" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update patients" ON public.patients FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "admins delete patients" ON public.patients FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "staff read allergies" ON public.allergies;
DROP POLICY IF EXISTS "staff write allergies" ON public.allergies;
CREATE POLICY "staff read allergies" ON public.allergies FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write allergies" ON public.allergies FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff read conditions" ON public.conditions;
DROP POLICY IF EXISTS "staff write conditions" ON public.conditions;
CREATE POLICY "staff read conditions" ON public.conditions FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write conditions" ON public.conditions FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff read vitals" ON public.vitals;
DROP POLICY IF EXISTS "staff write vitals" ON public.vitals;
CREATE POLICY "staff read vitals" ON public.vitals FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write vitals" ON public.vitals FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff read encounters" ON public.encounters;
DROP POLICY IF EXISTS "staff write encounters" ON public.encounters;
CREATE POLICY "staff read encounters" ON public.encounters FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write encounters" ON public.encounters FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff read orders" ON public.orders;
DROP POLICY IF EXISTS "staff write orders" ON public.orders;
CREATE POLICY "staff read orders" ON public.orders FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write orders" ON public.orders FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff read appointments" ON public.appointments;
DROP POLICY IF EXISTS "staff write appointments" ON public.appointments;
CREATE POLICY "staff read appointments" ON public.appointments FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write appointments" ON public.appointments FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff read notes" ON public.clinical_notes;
DROP POLICY IF EXISTS "staff insert notes" ON public.clinical_notes;
DROP POLICY IF EXISTS "staff update unsigned notes" ON public.clinical_notes;
DROP POLICY IF EXISTS "staff delete unsigned notes" ON public.clinical_notes;
CREATE POLICY "staff read notes" ON public.clinical_notes FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert notes" ON public.clinical_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update unsigned notes" ON public.clinical_notes FOR UPDATE TO authenticated
  USING (signed_at IS NULL AND public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff delete unsigned notes" ON public.clinical_notes FOR DELETE TO authenticated
  USING (signed_at IS NULL AND public.is_staff(auth.uid()));

-- ---------------------------------------------------------------- billing
DROP POLICY IF EXISTS "staff read invoices" ON public.invoices;
DROP POLICY IF EXISTS "staff write invoices" ON public.invoices;
CREATE POLICY "staff read invoices" ON public.invoices FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write invoices" ON public.invoices FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff read invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "staff write invoice items" ON public.invoice_items;
CREATE POLICY "staff read invoice items" ON public.invoice_items FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write invoice items" ON public.invoice_items FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------- ledgers
DROP POLICY IF EXISTS "staff read events" ON public.events;
DROP POLICY IF EXISTS "staff append events" ON public.events;
CREATE POLICY "staff read events" ON public.events FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff append events" ON public.events FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "admins read audit" ON public.audit_log;
DROP POLICY IF EXISTS "staff append audit" ON public.audit_log;
CREATE POLICY "staff read audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff append audit" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff read provenance" ON public.data_provenance;
DROP POLICY IF EXISTS "staff write provenance" ON public.data_provenance;
CREATE POLICY "staff read provenance" ON public.data_provenance FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write provenance" ON public.data_provenance FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------- people
-- Your own profile, roles and roster entry stay visible so the app can tell a
-- waiting account what is happening.
DROP POLICY IF EXISTS "staff read profiles" ON public.profiles;
CREATE POLICY "staff read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "read roles" ON public.user_roles;
CREATE POLICY "read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff read staff" ON public.staff;
CREATE POLICY "staff read staff" ON public.staff FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- ---------------------------------------------------------------- beds
DROP POLICY IF EXISTS "staff update beds" ON public.beds;
CREATE POLICY "staff update beds" ON public.beds FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------- functions
CREATE OR REPLACE FUNCTION public.emit_event(
  _event_type text,
  _payload jsonb DEFAULT '{}'::jsonb,
  _department_code text DEFAULT NULL,
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _severity text DEFAULT 'info'
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id bigint;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only staff with an assigned role can record hospital events'
      USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.events (hospital_id, actor_id, actor_label, department_code, entity_type, entity_id, event_type, severity, payload)
  VALUES (
    (SELECT id FROM public.hospitals ORDER BY created_at LIMIT 1),
    auth.uid(),
    (SELECT full_name FROM public.profiles WHERE user_id = auth.uid()),
    _department_code, _entity_type, _entity_id, _event_type, _severity, _payload
  ) RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_event(text, jsonb, text, text, uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.emit_event(text, jsonb, text, text, uuid, text) TO authenticated;

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

  SELECT s.role INTO _role
  FROM public.staff s
  WHERE s.user_id IS NULL AND lower(s.email) = lower(NEW.email)
  LIMIT 1;

  IF _role IS NULL AND _first THEN
    _role := 'super_admin'::app_role;
  END IF;

  -- No roster match and not the bootstrap account: no role until staff add them.
  IF _role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.staff SET user_id = NEW.id
  WHERE user_id IS NULL AND lower(email) = lower(NEW.email);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
