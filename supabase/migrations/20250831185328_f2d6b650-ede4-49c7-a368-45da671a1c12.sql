-- Fix RLS policies for team_status and updates tables to allow team members to insert initial data

-- Drop existing restrictive policies for team_status
DROP POLICY IF EXISTS "Leads can manage team status" ON team_status;
DROP POLICY IF EXISTS "Users can view status for their team" ON team_status;

-- Create new RLS policies for team_status
CREATE POLICY "Team members can insert initial team status"
ON team_status
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (team_id IN (
    SELECT profiles.team_id 
    FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.team_id IS NOT NULL
  ) OR get_user_role(auth.uid()) = ANY (ARRAY['lead'::user_role, 'mentor'::user_role]))
);

CREATE POLICY "Team members can view their team status"
ON team_status
FOR SELECT
USING (
  team_id IN (
    SELECT profiles.team_id 
    FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.team_id IS NOT NULL
  ) OR get_user_role(auth.uid()) = ANY (ARRAY['lead'::user_role, 'mentor'::user_role])
);

CREATE POLICY "Leads can manage team status"
ON team_status
FOR ALL
USING (get_user_role(auth.uid()) = 'lead'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'lead'::user_role);

-- Update updates table policies to allow team members to insert
DROP POLICY IF EXISTS "Team members can create updates" ON updates;

CREATE POLICY "Team members can create updates"
ON updates
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (team_id IN (
    SELECT profiles.team_id 
    FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.team_id IS NOT NULL
  ) OR get_user_role(auth.uid()) = ANY (ARRAY['lead'::user_role, 'mentor'::user_role]))
);