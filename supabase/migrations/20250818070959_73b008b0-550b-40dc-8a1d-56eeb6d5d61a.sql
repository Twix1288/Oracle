-- Create a secure access code for leads
INSERT INTO public.access_codes (
  code,
  description,
  generated_by,
  expires_at,
  is_active,
  team_name
) VALUES (
  'LEAD_MASTER_COSMIC_UFO_2025_X9K7',
  'Master Lead Access - Ultra Secure Entry Code for Lead Role',
  'system',
  NOW() + INTERVAL '10 years',
  true,
  'LEAD_ACCESS'
);