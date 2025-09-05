-- Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;
DROP POLICY IF EXISTS "Leads can manage teams" ON teams;

-- Allow leads to manage all teams
CREATE POLICY "Leads can manage teams" ON teams
FOR ALL USING (get_user_role(auth.uid()) = 'lead'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'lead'::user_role);

-- Allow any authenticated user to create teams (for project onboarding)
CREATE POLICY "Users can create teams" ON teams
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow team members to update their own teams
CREATE POLICY "Team members can update their team" ON teams
FOR UPDATE USING (
  id IN (
    SELECT team_id FROM profiles 
    WHERE id = auth.uid() AND team_id IS NOT NULL
  )
)
WITH CHECK (
  id IN (
    SELECT team_id FROM profiles 
    WHERE id = auth.uid() AND team_id IS NOT NULL
  )
);