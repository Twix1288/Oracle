-- Remove the problematic trigger and fix team status handling during onboarding

-- Drop the trigger that's causing RLS violations during onboarding
DROP TRIGGER IF EXISTS update_team_status ON updates;

-- Drop the function as well since we'll handle this differently
DROP FUNCTION IF EXISTS public.update_team_status();

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