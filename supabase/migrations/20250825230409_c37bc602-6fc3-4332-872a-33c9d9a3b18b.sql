-- Insert master access codes for each role
INSERT INTO public.access_codes (code, role, description, is_active, generated_by) VALUES
('PIEFI-LEAD-MASTER-2025', 'lead', 'Master access code for Lead role - full program management', true, 'system'),
('PIEFI-MENTOR-GUIDE-2025', 'mentor', 'Master access code for Mentor role - team guidance and support', true, 'system'),
('PIEFI-BUILDER-CREATE-2025', 'builder', 'Master access code for Builder role - product development', true, 'system');

-- Create some sample team-specific codes
INSERT INTO public.access_codes (code, role, team_id, description, is_active, generated_by, max_uses) VALUES
('TEAM-ALPHA-BUILD-2025', 'builder', (SELECT id FROM teams LIMIT 1), 'Team Alpha builder access code', true, 'system', 50),
('TEAM-ALPHA-MENTOR-2025', 'mentor', (SELECT id FROM teams LIMIT 1), 'Team Alpha mentor access code', true, 'system', 10);

-- Update the validate_access_code function to handle both master and team codes
CREATE OR REPLACE FUNCTION public.validate_access_code(p_code text, p_role user_role)
RETURNS TABLE(id uuid, role user_role, team_id uuid, description text, expires_at timestamp with time zone, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.id,
    ac.role,
    ac.team_id,
    ac.description,
    ac.expires_at,
    ac.is_active
  FROM public.access_codes ac
  WHERE ac.code = p_code
    AND ac.role = p_role
    AND COALESCE(ac.is_active, true) = true
    AND (ac.expires_at IS NULL OR ac.expires_at > now())
    AND (ac.max_uses IS NULL OR ac.current_uses < ac.max_uses)
  LIMIT 1;
END;
$$;