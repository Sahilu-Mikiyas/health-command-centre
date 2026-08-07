ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS license_expiry date,
  ADD COLUMN IF NOT EXISTS cme_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cme_required integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS board_certification text;

UPDATE public.staff
SET license_expiry = (current_date + ((row_number_val * 37) % 900) * interval '1 day')::date
FROM (SELECT id, row_number() OVER (ORDER BY created_at) AS row_number_val FROM public.staff) AS ranked
WHERE public.staff.id = ranked.id AND public.staff.license_expiry IS NULL;

UPDATE public.staff SET cme_credits = 20 + (abs(hashtext(id::text)) % 11) WHERE cme_credits = 0;

CREATE POLICY "hr managers write staff" ON public.staff
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hr_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'hr_manager'));