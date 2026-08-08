CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  first_warning_days integer NOT NULL DEFAULT 90,
  urgent_warning_days integer NOT NULL DEFAULT 30,
  lockout_days integer NOT NULL DEFAULT 15,
  notify_staff_member boolean NOT NULL DEFAULT true,
  recipient_roles text[] NOT NULL DEFAULT ARRAY['hr_manager','super_admin']::text[],
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,
  digest_hour integer NOT NULL DEFAULT 8,
  quiet_weekends boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in staff can read notification settings"
ON public.notification_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and HR can insert notification settings"
ON public.notification_settings FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr_manager'));

CREATE POLICY "Admins and HR can update notification settings"
ON public.notification_settings FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr_manager'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'hr_manager'));

CREATE TRIGGER notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.notification_settings (hospital_id)
SELECT id FROM public.hospitals ORDER BY created_at LIMIT 1
ON CONFLICT (hospital_id) DO NOTHING;