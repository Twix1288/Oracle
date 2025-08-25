-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users only - builder_onboarding" ON public.builder_onboarding;
DROP POLICY IF EXISTS "Authenticated users only - builder_assignments" ON public.builder_assignments;

-- Create secure RLS policies for builder_onboarding table
CREATE POLICY "Leads can manage all builder onboarding data" 
ON public.builder_onboarding 
FOR ALL 
USING (get_user_role(auth.uid()) = 'lead'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'lead'::user_role);

CREATE POLICY "Builders can view their own team onboarding data" 
ON public.builder_onboarding 
FOR SELECT 
USING (
  team_id IN (
    SELECT profiles.team_id 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.team_id IS NOT NULL
  )
);

CREATE POLICY "Mentors can view onboarding data for their assigned teams" 
ON public.builder_onboarding 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'mentor'::user_role 
  AND team_id IN (
    SELECT teams.id 
    FROM teams 
    WHERE teams.assigned_mentor_id = auth.uid()
  )
);

-- Create secure RLS policies for builder_assignments table
CREATE POLICY "Leads can manage all builder assignments" 
ON public.builder_assignments 
FOR ALL 
USING (get_user_role(auth.uid()) = 'lead'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'lead'::user_role);

CREATE POLICY "Builders can view assignments for their team" 
ON public.builder_assignments 
FOR SELECT 
USING (
  team_id IN (
    SELECT profiles.team_id 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.team_id IS NOT NULL
  )
);

CREATE POLICY "Mentors can view assignments for their assigned teams" 
ON public.builder_assignments 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'mentor'::user_role 
  AND team_id IN (
    SELECT teams.id 
    FROM teams 
    WHERE teams.assigned_mentor_id = auth.uid()
  )
);