-- Fix critical security vulnerability in team_status table RLS policies
-- Drop the overly permissive policy that allows all authenticated users to access all team status data
DROP POLICY IF EXISTS "Authenticated users can manage team status" ON public.team_status;

-- Create restrictive policies that only allow appropriate access

-- Policy 1: Team members can view and update their own team's status
CREATE POLICY "Team members can manage their team status" 
ON public.team_status 
FOR ALL 
USING (
  team_id IN (
    SELECT profiles.team_id 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.team_id IS NOT NULL
  )
)
WITH CHECK (
  team_id IN (
    SELECT profiles.team_id 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.team_id IS NOT NULL
  )
);

-- Policy 2: Mentors can view and update status for teams they're assigned to mentor
CREATE POLICY "Mentors can manage assigned team status" 
ON public.team_status 
FOR ALL 
USING (
  get_user_role(auth.uid()) = 'mentor'::user_role 
  AND team_id IN (
    SELECT teams.id 
    FROM teams 
    WHERE teams.assigned_mentor_id = auth.uid()
  )
)
WITH CHECK (
  get_user_role(auth.uid()) = 'mentor'::user_role 
  AND team_id IN (
    SELECT teams.id 
    FROM teams 
    WHERE teams.assigned_mentor_id = auth.uid()
  )
);

-- Policy 3: Leads can manage all team status records for oversight
CREATE POLICY "Leads can manage all team status" 
ON public.team_status 
FOR ALL 
USING (get_user_role(auth.uid()) = 'lead'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'lead'::user_role);