-- Add email column to staff table and update handle_new_user trigger
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS email text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  provisioned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, hospital_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    (SELECT id FROM public.hospitals ORDER BY created_at LIMIT 1)
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Check if this email was provisioned as staff by Super Admin
  SELECT role INTO provisioned_role FROM public.staff WHERE LOWER(email) = LOWER(NEW.email) LIMIT 1;

  IF provisioned_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, provisioned_role)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
