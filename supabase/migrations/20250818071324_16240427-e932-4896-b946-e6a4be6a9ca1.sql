-- Add role column to access_codes table
ALTER TABLE public.access_codes ADD COLUMN role user_role;

-- Update the existing lead access code with the role
UPDATE public.access_codes 
SET role = 'lead'
WHERE code = 'LEAD_MASTER_COSMIC_UFO_2025_X9K7';

-- Drop and recreate the validate_access_code function
DROP FUNCTION IF EXISTS public.validate_access_code(text, user_role);

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
  LIMIT 1;
END;
$$;