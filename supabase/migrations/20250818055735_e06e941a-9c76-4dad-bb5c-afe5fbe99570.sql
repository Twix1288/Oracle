-- Fix critical security vulnerabilities: Restrict access to oracle logs and team data

-- 1. Fix Oracle Logs Security - Restrict access to user's own logs and role-based access
DROP POLICY IF EXISTS "Users can view oracle logs based on role" ON public.oracle_logs;
DROP POLICY IF EXISTS "Users can insert oracle logs" ON public.oracle_logs;

-- Users can only view their own oracle logs, or leads/mentors can view all
CREATE POLICY "Users can view their own oracle logs" 
ON public.oracle_logs 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid()::text 
  OR get_user_role(auth.uid()) IN ('lead', 'mentor')
);

-- Users can only insert their own oracle logs
CREATE POLICY "Users can insert their own oracle logs" 
ON public.oracle_logs 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- 2. Fix Team Data Security - Restrict access to team members only

-- Teams table - users can only see teams they're part of or if they're lead/mentor
DROP POLICY IF EXISTS "Guests can view teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users only - teams" ON public.teams;

CREATE POLICY "Users can view teams they belong to" 
ON public.teams 
FOR SELECT 
TO authenticated
USING (
  id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid() AND team_id IS NOT NULL
  )
  OR get_user_role(auth.uid()) IN ('lead', 'mentor')
);

CREATE POLICY "Leads can manage teams" 
ON public.teams 
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'lead')
WITH CHECK (get_user_role(auth.uid()) = 'lead');

-- Members table - restrict to team members and leads/mentors
DROP POLICY IF EXISTS "Guests can view members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users only - members" ON public.members;

CREATE POLICY "Users can view members of their team" 
ON public.members 
FOR SELECT 
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid() AND team_id IS NOT NULL
  )
  OR get_user_role(auth.uid()) IN ('lead', 'mentor')
);

CREATE POLICY "Leads can manage members" 
ON public.members 
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'lead')
WITH CHECK (get_user_role(auth.uid()) = 'lead');

-- Updates table - restrict to team members
DROP POLICY IF EXISTS "Guests can view updates" ON public.updates;
DROP POLICY IF EXISTS "Authenticated users only - updates" ON public.updates;

CREATE POLICY "Users can view updates for their team" 
ON public.updates 
FOR SELECT 
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid() AND team_id IS NOT NULL
  )
  OR get_user_role(auth.uid()) IN ('lead', 'mentor')
);

CREATE POLICY "Team members can create updates" 
ON public.updates 
FOR INSERT 
TO authenticated
WITH CHECK (
  team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid() AND team_id IS NOT NULL
  )
  OR get_user_role(auth.uid()) IN ('lead', 'mentor')
);

CREATE POLICY "Leads can manage all updates" 
ON public.updates 
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'lead')
WITH CHECK (get_user_role(auth.uid()) = 'lead');

-- Team Status table - restrict to team members
DROP POLICY IF EXISTS "Guests can view team status" ON public.team_status;
DROP POLICY IF EXISTS "Authenticated users only - team_status" ON public.team_status;

CREATE POLICY "Users can view status for their team" 
ON public.team_status 
FOR SELECT 
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid() AND team_id IS NOT NULL
  )
  OR get_user_role(auth.uid()) IN ('lead', 'mentor')
);

CREATE POLICY "Leads can manage team status" 
ON public.team_status 
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'lead')
WITH CHECK (get_user_role(auth.uid()) = 'lead');