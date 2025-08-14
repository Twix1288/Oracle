-- Fix RLS policy for access_codes to allow public reading for validation
DROP POLICY IF EXISTS "Authenticated users can view access codes" ON public.access_codes;

CREATE POLICY "Anyone can read access codes for validation" ON public.access_codes
FOR SELECT USING (true);

-- Fix RLS policy to allow system to insert access codes
DROP POLICY IF EXISTS "Authenticated users can create access codes" ON public.access_codes;

CREATE POLICY "System can manage access codes" ON public.access_codes
FOR ALL USING (true);