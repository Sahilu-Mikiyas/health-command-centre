-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM (
  'super_admin','ceo','medical_director','doctor','nurse','receptionist',
  'lab_tech','radiologist','pharmacist','cashier','patient'
);
CREATE TYPE public.op_status AS ENUM ('healthy','busy','critical','offline');
CREATE TYPE public.bed_status AS ENUM ('available','occupied','cleaning','reserved','maintenance');

-- ============ STRUCTURE ============
CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  timezone text NOT NULL DEFAULT 'UTC',
  currency text NOT NULL DEFAULT 'GBP',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitals TO authenticated;
GRANT ALL ON public.hospitals TO service_role;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  colour text NOT NULL DEFAULT 'accent',
  location text,
  status public.op_status NOT NULL DEFAULT 'healthy',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.wards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  floor int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wards TO authenticated;
GRANT ALL ON public.wards TO service_role;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id uuid NOT NULL REFERENCES public.wards(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.beds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  label text NOT NULL,
  status public.bed_status NOT NULL DEFAULT 'available',
  patient_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beds TO authenticated;
GRANT ALL ON public.beds TO service_role;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;

-- ============ IDENTITY ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL,
  full_name text NOT NULL DEFAULT 'New user',
  email text,
  job_title text,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','ceo','medical_director')
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, hospital_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    (SELECT id FROM public.hospitals ORDER BY created_at LIMIT 1)
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'super_admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Staff directory (not tied to sign-in accounts)
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  job_title text NOT NULL,
  role public.app_role NOT NULL,
  availability text NOT NULL DEFAULT 'active',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- ============ EVENT BUS + AUDIT ============
CREATE TABLE public.events (
  id bigserial PRIMARY KEY,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_label text,
  department_code text,
  entity_type text,
  entity_id uuid,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_occurred_at_idx ON public.events (occurred_at DESC);
CREATE INDEX events_type_idx ON public.events (event_type);
GRANT SELECT, INSERT ON public.events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.events_id_seq TO authenticated;
GRANT ALL ON public.events TO service_role;
GRANT ALL ON SEQUENCE public.events_id_seq TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_log (
  id bigserial PRIMARY KEY,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_label text,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  reason text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.audit_log_id_seq TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
GRANT ALL ON SEQUENCE public.audit_log_id_seq TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.data_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  field_name text NOT NULL,
  source text NOT NULL,
  entered_by text,
  verified_by text,
  verified_at timestamptz,
  confidence text NOT NULL DEFAULT 'provisional',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.data_provenance TO authenticated;
GRANT ALL ON public.data_provenance TO service_role;
ALTER TABLE public.data_provenance ENABLE ROW LEVEL SECURITY;

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

-- ============ PATIENTS ============
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  mrn text NOT NULL UNIQUE,
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  sex text NOT NULL DEFAULT 'unknown',
  phone text,
  blood_group text,
  insurance_provider text,
  insurance_number text,
  insurance_coverage_pct int,
  pregnancy_status text,
  egfr numeric,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  substance text NOT NULL,
  reaction text,
  severity text NOT NULL DEFAULT 'moderate',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allergies TO authenticated;
GRANT ALL ON public.allergies TO service_role;
ALTER TABLE public.allergies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  icd10 text,
  status text NOT NULL DEFAULT 'active',
  onset_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conditions TO authenticated;
GRANT ALL ON public.conditions TO service_role;
ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  temperature_c numeric,
  heart_rate int,
  systolic int,
  diastolic int,
  respiratory_rate int,
  spo2 int,
  news2 int
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vitals TO authenticated;
GRANT ALL ON public.vitals TO service_role;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'registered',
  priority text NOT NULL DEFAULT 'routine',
  chief_complaint text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX encounters_stage_idx ON public.encounters (stage);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.encounters TO authenticated;
GRANT ALL ON public.encounters TO service_role;
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============
CREATE POLICY "staff read hospitals" ON public.hospitals FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins write hospitals" ON public.hospitals FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "staff read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins write departments" ON public.departments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "staff read wards" ON public.wards FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins write wards" ON public.wards FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "staff read rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins write rooms" ON public.rooms FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "staff read beds" ON public.beds FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff update beds" ON public.beds FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admins write beds" ON public.beds FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "staff read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff read staff" ON public.staff FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins write staff" ON public.staff FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "staff read events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff append events" ON public.events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "admins read audit" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff append audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "staff read provenance" ON public.data_provenance FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff write provenance" ON public.data_provenance FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "staff read patients" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff write patients" ON public.patients FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "staff read allergies" ON public.allergies FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff write allergies" ON public.allergies FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "staff read conditions" ON public.conditions FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff write conditions" ON public.conditions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "staff read vitals" ON public.vitals FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff write vitals" ON public.vitals FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "staff read encounters" ON public.encounters FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff write encounters" ON public.encounters FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Append-only enforcement
CREATE OR REPLACE FUNCTION public.block_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'This record is append-only and cannot be changed or removed';
END;
$$;
CREATE TRIGGER events_append_only BEFORE UPDATE OR DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.block_mutation();
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.block_mutation();

ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.beds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.encounters;

-- ============ SEED ============
INSERT INTO public.hospitals (id, name, code, currency)
VALUES ('11111111-1111-1111-1111-111111111111','Meridian General Hospital','MGH','GBP');

INSERT INTO public.departments (hospital_id, name, code, colour, location, status, sort_order) VALUES
('11111111-1111-1111-1111-111111111111','Emergency','ED','critical','Ground Floor, East','busy',1),
('11111111-1111-1111-1111-111111111111','Outpatient','OPD','accent','Ground Floor, West','healthy',2),
('11111111-1111-1111-1111-111111111111','Ward A','WDA','accent','Floor 1','healthy',3),
('11111111-1111-1111-1111-111111111111','Ward B','WDB','accent','Floor 2','busy',4),
('11111111-1111-1111-1111-111111111111','Intensive Care','ICU','critical','Floor 3','critical',5),
('11111111-1111-1111-1111-111111111111','Operating Theatres','OT','accent','Floor 3, North','healthy',6),
('11111111-1111-1111-1111-111111111111','Radiology','RAD','accent','Basement','busy',7),
('11111111-1111-1111-1111-111111111111','Laboratory','LAB','accent','Basement, East','healthy',8),
('11111111-1111-1111-1111-111111111111','Pharmacy','PHA','accent','Ground Floor, Centre','healthy',9),
('11111111-1111-1111-1111-111111111111','Administration','ADM','accent','Floor 4','healthy',10);

INSERT INTO public.wards (hospital_id, department_id, name, floor)
SELECT '11111111-1111-1111-1111-111111111111', d.id, d.name, 1 + (d.sort_order % 4)
FROM public.departments d WHERE d.code IN ('WDA','WDB','ICU','ED');

INSERT INTO public.rooms (ward_id, name)
SELECT w.id, w.name || ' Room ' || lpad(g::text,3,'0')
FROM public.wards w, generate_series(1,33) g;

INSERT INTO public.beds (room_id, label, status)
SELECT r.id, r.name || ' / Bed ' || b,
  (CASE WHEN random() < 0.88 THEN 'occupied'
        WHEN random() < 0.5 THEN 'cleaning'
        WHEN random() < 0.6 THEN 'reserved'
        ELSE 'available' END)::public.bed_status
FROM public.rooms r, generate_series(1,4) b
LIMIT 520;

INSERT INTO public.staff (hospital_id, department_id, full_name, job_title, role, availability)
SELECT '11111111-1111-1111-1111-111111111111',
  (SELECT id FROM public.departments ORDER BY random() LIMIT 1),
  (ARRAY['Dr Hana Bekele','Dr Daniel Okoro','Dr Sarah Lin','Dr Marcus Reid','Dr Amira Haddad','Dr Tom Fielding','Nurse Grace Wanjiru','Nurse Peter Salaam','Nurse Ivy Chen','Nurse Omar Farah'])[1 + (g % 10)] || ' ' || g,
  (ARRAY['Consultant Cardiologist','Emergency Physician','Registrar','Senior Nurse','Charge Nurse','Biomedical Scientist','Radiographer','Clinical Pharmacist'])[1 + (g % 8)],
  (ARRAY['doctor','doctor','nurse','nurse','lab_tech','radiologist','pharmacist','receptionist']::public.app_role[])[1 + (g % 8)],
  (ARRAY['active','active','active','busy','in_surgery','offline'])[1 + (g % 6)]
FROM generate_series(1,42) g;

INSERT INTO public.patients (hospital_id, mrn, full_name, date_of_birth, sex, phone, blood_group, insurance_provider, insurance_coverage_pct, egfr)
SELECT '11111111-1111-1111-1111-111111111111',
  'MGH-' || lpad(g::text,6,'0'),
  (ARRAY['John','Maria','Ahmed','Grace','Liam','Sofia','Noah','Amara','Ethan','Zara','Daniel','Fatima'])[1 + (g % 12)] || ' ' ||
  (ARRAY['Doe','Alvarez','Hassan','Mwangi','Novak','Rossi','Adeyemi','Kaur','Sato','Petrov'])[1 + (g % 10)],
  (date '1940-01-01' + (g * 211 % 26000)),
  (ARRAY['male','female'])[1 + (g % 2)],
  '+44 7' || lpad((g * 137 % 100000000)::text, 9, '0'),
  (ARRAY['O+','A+','B+','AB+','O-','A-'])[1 + (g % 6)],
  (ARRAY['Britannia Health','Meridian Care','Aurora Insure',NULL])[1 + (g % 4)],
  (ARRAY[90,80,70,100])[1 + (g % 4)],
  round((35 + (g * 7 % 65))::numeric, 0)
FROM generate_series(1,120) g;

INSERT INTO public.allergies (patient_id, substance, reaction, severity)
SELECT p.id,
  (ARRAY['Penicillin','Sulfa drugs','Peanuts','Latex','Aspirin'])[1 + (abs(hashtext(p.mrn)) % 5)],
  (ARRAY['Rash','Anaphylaxis','Swelling','Bronchospasm'])[1 + (abs(hashtext(p.mrn)) % 4)],
  (ARRAY['mild','moderate','severe'])[1 + (abs(hashtext(p.mrn)) % 3)]
FROM public.patients p WHERE abs(hashtext(p.mrn)) % 3 = 0;

INSERT INTO public.conditions (patient_id, name, icd10, status, onset_date)
SELECT p.id,
  (ARRAY['Type 2 Diabetes','Hypertension','Asthma','Chronic Kidney Disease','Atrial Fibrillation','Osteoarthritis'])[1 + (abs(hashtext(p.mrn || 'c')) % 6)],
  (ARRAY['E11','I10','J45','N18','I48','M19'])[1 + (abs(hashtext(p.mrn || 'c')) % 6)],
  'active',
  (date '2015-01-01' + (abs(hashtext(p.mrn)) % 3000))
FROM public.patients p;

INSERT INTO public.vitals (patient_id, recorded_at, temperature_c, heart_rate, systolic, diastolic, respiratory_rate, spo2, news2)
SELECT p.id,
  now() - (g || ' hours')::interval,
  round((36.2 + (abs(hashtext(p.mrn || g::text)) % 20) / 10.0)::numeric, 1),
  60 + (abs(hashtext(p.mrn || g::text)) % 45),
  100 + (abs(hashtext(p.mrn || g::text)) % 50),
  60 + (abs(hashtext(p.mrn || g::text)) % 30),
  12 + (abs(hashtext(p.mrn || g::text)) % 10),
  92 + (abs(hashtext(p.mrn || g::text)) % 8),
  (abs(hashtext(p.mrn || g::text)) % 8)
FROM public.patients p, generate_series(1,6) g;

INSERT INTO public.encounters (hospital_id, patient_id, department_id, stage, priority, chief_complaint, started_at)
SELECT '11111111-1111-1111-1111-111111111111', p.id,
  (SELECT id FROM public.departments d WHERE d.code = (ARRAY['ED','OPD','WDA','WDB','ICU','LAB','RAD','PHA'])[1 + (abs(hashtext(p.mrn)) % 8)] LIMIT 1),
  (ARRAY['registered','waiting','nurse','doctor','laboratory','pharmacy','billing','complete'])[1 + (abs(hashtext(p.mrn)) % 8)],
  (ARRAY['routine','routine','urgent','critical'])[1 + (abs(hashtext(p.mrn)) % 4)],
  (ARRAY['Chest pain','Shortness of breath','Abdominal pain','Fever','Follow-up review','Headache'])[1 + (abs(hashtext(p.mrn)) % 6)],
  now() - ((abs(hashtext(p.mrn)) % 300) || ' minutes')::interval
FROM public.patients p;

INSERT INTO public.events (hospital_id, actor_label, department_code, entity_type, entity_id, event_type, severity, payload, occurred_at)
SELECT '11111111-1111-1111-1111-111111111111',
  'System',
  (ARRAY['ED','LAB','RAD','PHA','ICU','OT','ADM'])[1 + (g % 7)],
  'encounter', NULL,
  (ARRAY['patient.registered','patient.queued','lab.sample.received','lab.result.signed','radiology.study.completed','pharmacy.dispensed','billing.charge.added','bed.assigned','alert.raised'])[1 + (g % 9)],
  (ARRAY['info','info','info','warning','critical'])[1 + (g % 5)],
  '{}'::jsonb,
  now() - ((g * 3) || ' minutes')::interval
FROM generate_series(1,200) g;