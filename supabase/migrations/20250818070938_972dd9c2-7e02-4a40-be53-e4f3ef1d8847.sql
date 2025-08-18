-- Create a secure access code for leads
INSERT INTO public.access_codes (
  code,
  role,
  description,
  generated_by,
  expires_at,
  is_active
) VALUES (
  'LEAD_MASTER_COSMIC_UFO_2025_X9K7',
  'lead',
  'Master Lead Access - Ultra Secure Entry Code',
  'system',
  NOW() + INTERVAL '10 years',
  true
);