-- SECURITY: stop trusting the client-supplied `role` in signup metadata.
--
-- `raw_user_meta_data` is written by whoever calls supabase.auth.signUp(), so the
-- previous trigger let anyone self-register as super_admin by passing
-- { data: { role: "super_admin" } }. Roles now come only from sources a user
-- cannot control:
--   1. the staff roster (row pre-filed by an admin/HR with a matching email)
--   2. the very first account on a fresh install becomes super_admin (bootstrap)
--   3. everyone else starts as receptionist (least-privileged clinical role)
-- Admin/HR provisioning (staff.server.ts) still overwrites the role with the
-- chosen one via the service-role client right after the account is created.

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

REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
