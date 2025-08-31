-- Remove the problematic triggers and function with CASCADE

-- Drop all triggers on updates table that use update_team_status function
DROP TRIGGER IF EXISTS update_team_status ON updates CASCADE;
DROP TRIGGER IF EXISTS update_team_status_on_update ON updates CASCADE;  
DROP TRIGGER IF EXISTS update_team_status_trigger ON updates CASCADE;

-- Now drop the function with CASCADE to remove any remaining dependencies
DROP FUNCTION IF EXISTS public.update_team_status() CASCADE;

-- Update RLS policies for team_status to be more permissive during onboarding
DROP POLICY IF EXISTS "Team members can insert initial team status" ON team_status;
DROP POLICY IF EXISTS "Team members can view their team status" ON team_status;
DROP POLICY IF EXISTS "Leads can manage team status" ON team_status;

-- Create simpler, more permissive policies for team_status
CREATE POLICY "Authenticated users can manage team status"
ON team_status
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure updates table allows team members to insert
DROP POLICY IF EXISTS "Team members can create updates" ON updates;

CREATE POLICY "Authenticated users can create updates"
ON updates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);