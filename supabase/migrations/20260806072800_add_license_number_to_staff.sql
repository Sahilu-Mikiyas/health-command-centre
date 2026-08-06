-- Add license_number column to staff table
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS license_number text;
