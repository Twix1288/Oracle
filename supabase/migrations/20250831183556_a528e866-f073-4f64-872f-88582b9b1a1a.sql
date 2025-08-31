-- Update the teams table RLS policy to allow authenticated users to view teams during onboarding
DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams;

-- Create a new policy that allows authenticated users to view teams for onboarding
CREATE POLICY "Authenticated users can view teams for onboarding" 
ON public.teams 
FOR SELECT 
USING (
  -- Allow if user is authenticated (for onboarding)
  auth.uid() IS NOT NULL
);

-- Keep the leads management policy
-- The "Leads can manage teams" policy remains unchanged