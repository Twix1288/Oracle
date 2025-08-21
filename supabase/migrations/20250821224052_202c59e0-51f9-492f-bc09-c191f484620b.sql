-- Create a simple builder access code for testing
INSERT INTO access_codes (
  code, 
  role, 
  description, 
  is_active, 
  expires_at,
  generated_by
) VALUES (
  'BUILD-TEST-2025', 
  'builder', 
  'Quick test code for builder dashboard access', 
  true, 
  now() + interval '30 days',
  'system'
);