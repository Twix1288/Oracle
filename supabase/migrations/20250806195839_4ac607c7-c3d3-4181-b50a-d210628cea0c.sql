-- Delete all existing access codes
DELETE FROM public.access_codes;

-- Create single lead access code
INSERT INTO public.access_codes (code, role, description, is_active)
VALUES ('lead2025', 'lead', 'Lead Administrator Access', true);