-- Fix the validate_access_code function permissions and logic
DROP FUNCTION IF EXISTS public.validate_access_code(text, user_role);

CREATE OR REPLACE FUNCTION public.validate_access_code(p_code text, p_role user_role)
RETURNS TABLE(
  id uuid,
  role user_role,
  team_id uuid,
  member_id uuid,
  description text,
  expires_at timestamp with time zone,
  is_active boolean
)
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
    ac.member_id,
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_access_code(text, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_access_code(text, user_role) TO anon;