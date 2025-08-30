-- Create master access codes for the simplified system
INSERT INTO public.access_codes (code, role, description, is_active, generated_by) VALUES 
('BUILD2024', 'builder', 'Master access code for builders', true, 'system'),
('MENTOR2024', 'mentor', 'Master access code for mentors', true, 'system'),
('LEAD2024', 'lead', 'Master access code for leads', true, 'system'),
('GUEST2024', 'guest', 'Master access code for guests', true, 'system');