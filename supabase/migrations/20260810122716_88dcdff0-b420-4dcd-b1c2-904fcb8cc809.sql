ALTER TABLE public.invoices REPLICA IDENTITY FULL;
ALTER TABLE public.vitals REPLICA IDENTITY FULL;
ALTER TABLE public.clinical_notes REPLICA IDENTITY FULL;
ALTER TABLE public.patients REPLICA IDENTITY FULL;
ALTER TABLE public.staff REPLICA IDENTITY FULL;
ALTER TABLE public.encounters REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.vitals; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.clinical_notes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.patients; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.invoice_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

CREATE INDEX IF NOT EXISTS events_occurred_at_desc_idx ON public.events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS orders_verified_at_desc_idx ON public.orders (verified_at DESC);