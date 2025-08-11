-- 1) Restrict direct reads and add secure RPCs
-- Drop overly permissive public SELECT policy on access_codes
DROP POLICY IF EXISTS "Allow public read access to access_codes" ON public.access_codes;

-- Ensure RLS is enabled (it already is, but be explicit)
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Create a SECURITY DEFINER function to validate codes without exposing them
CREATE OR REPLACE FUNCTION public.validate_access_code(p_code text, p_role user_role)
RETURNS TABLE (
  id uuid,
  role user_role,
  team_id uuid,
  member_id uuid,
  description text,
  expires_at timestamptz,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT id, role, team_id, member_id, description, expires_at, is_active
  FROM public.access_codes
  WHERE code = p_code
    AND role = p_role
    AND coalesce(is_active, true) = true
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_access_code(text, user_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_access_code(text, user_role) TO anon, authenticated;

-- Provide a metadata-only overview that excludes the sensitive code value
CREATE OR REPLACE FUNCTION public.get_access_codes_overview()
RETURNS TABLE (
  id uuid,
  role user_role,
  team_id uuid,
  member_id uuid,
  description text,
  is_active boolean,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  generated_by text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, role, team_id, member_id, description, is_active, expires_at, created_at, updated_at, generated_by
  FROM public.access_codes
  ORDER BY created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_access_codes_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_access_codes_overview() TO anon, authenticated;
