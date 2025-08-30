-- Fix security vulnerability in profiles table RLS policy
-- Current policy allows builders to see ALL profiles with team_id, not just their own team

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can view profiles based on role" ON public.profiles;

-- Create a more secure policy that properly restricts access
CREATE POLICY "Users can view profiles with proper restrictions" 
ON public.profiles 
FOR SELECT 
USING (
  CASE
    -- Users can always view their own profile (full access)
    WHEN (auth.uid() = id) THEN true
    -- Leads and mentors can view all profiles (for management purposes)
    WHEN (get_user_role(auth.uid()) = ANY (ARRAY['lead'::user_role, 'mentor'::user_role])) THEN true
    -- Builders can only view profiles from their own team (not all teams)
    WHEN (
      get_user_role(auth.uid()) = 'builder'::user_role 
      AND team_id IS NOT NULL 
      AND team_id IN (
        SELECT team_id 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND team_id IS NOT NULL
      )
    ) THEN true
    ELSE false
  END
);

-- Create a function to get public profile data for team members
-- This returns only non-sensitive fields for team visibility
CREATE OR REPLACE FUNCTION public.get_team_member_profiles(p_team_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  avatar_url text,
  bio text,
  skills text[],
  experience_level text,
  github_url text,
  portfolio_url text,
  role user_role
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.skills,
    p.experience_level,
    p.github_url,
    p.portfolio_url,
    p.role
  FROM public.profiles p
  WHERE p.team_id = p_team_id
    AND (
      -- Allow if requester is from same team
      p_team_id IN (
        SELECT team_id 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND team_id IS NOT NULL
      )
      -- Or if requester is lead/mentor
      OR get_user_role(auth.uid()) = ANY (ARRAY['lead'::user_role, 'mentor'::user_role])
    );
$$;