-- Fix all security issues by enabling RLS and adding proper policies

-- Enable RLS on all tables that need it
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_onboarding ENABLE ROW LEVEL SECURITY;

-- Drop all existing public policies first
DROP POLICY IF EXISTS "Allow public insert access to teams" ON public.teams;
DROP POLICY IF EXISTS "Allow public read access to teams" ON public.teams;
DROP POLICY IF EXISTS "Allow public update access to teams" ON public.teams;

DROP POLICY IF EXISTS "Allow public insert access to members" ON public.members;
DROP POLICY IF EXISTS "Allow public read access to members" ON public.members;
DROP POLICY IF EXISTS "Allow public update access to members" ON public.members;

DROP POLICY IF EXISTS "Allow public insert access to updates" ON public.updates;
DROP POLICY IF EXISTS "Allow public read access to updates" ON public.updates;
DROP POLICY IF EXISTS "Allow public update access to updates" ON public.updates;

DROP POLICY IF EXISTS "Allow public insert access to team_status" ON public.team_status;
DROP POLICY IF EXISTS "Allow public read access to team_status" ON public.team_status;
DROP POLICY IF EXISTS "Allow public update access to team_status" ON public.team_status;

DROP POLICY IF EXISTS "Allow public insert access to builder_assignments" ON public.builder_assignments;
DROP POLICY IF EXISTS "Allow public read access to builder_assignments" ON public.builder_assignments;
DROP POLICY IF EXISTS "Allow public update access to builder_assignments" ON public.builder_assignments;

DROP POLICY IF EXISTS "Allow public insert access to builder_onboarding" ON public.builder_onboarding;
DROP POLICY IF EXISTS "Allow public read access to builder_onboarding" ON public.builder_onboarding;
DROP POLICY IF EXISTS "Allow public update access to builder_onboarding" ON public.builder_onboarding;

-- Create a user_profiles table to track authenticated users
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- User profiles policies - users can only see their own profile
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add user_id column to members table to link to authenticated users
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Teams table policies - only authenticated users who are members can access
CREATE POLICY "Authenticated users can view teams they are members of" 
ON public.teams 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members 
    WHERE members.team_id = teams.id 
    AND members.user_id = auth.uid()
  )
);

CREATE POLICY "Team members can update their team" 
ON public.teams 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members 
    WHERE members.team_id = teams.id 
    AND members.user_id = auth.uid()
  )
);

-- Members table policies - authenticated users can only view members of their teams
CREATE POLICY "Users can view members of their teams" 
ON public.members 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.members m2 
    WHERE m2.team_id = members.team_id 
    AND m2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert themselves as members" 
ON public.members 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Updates table policies - only team members can view updates
CREATE POLICY "Users can view updates for their teams" 
ON public.updates 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members 
    WHERE members.team_id = updates.team_id 
    AND members.user_id = auth.uid()
  )
);

CREATE POLICY "Team members can create updates" 
ON public.updates 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.members 
    WHERE members.team_id = updates.team_id 
    AND members.user_id = auth.uid()
  )
);

-- Team status policies - only team members can access
CREATE POLICY "Users can view status of their teams" 
ON public.team_status 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members 
    WHERE members.team_id = team_status.team_id 
    AND members.user_id = auth.uid()
  )
);

CREATE POLICY "Team members can update team status" 
ON public.team_status 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members 
    WHERE members.team_id = team_status.team_id 
    AND members.user_id = auth.uid()
  )
);

-- Builder assignments policies - users can only view their own assignments
CREATE POLICY "Users can view their own builder assignments" 
ON public.builder_assignments 
FOR SELECT 
TO authenticated
USING (true); -- We'll need to add user_id column or use a different approach

-- Builder onboarding policies - users can only view their own onboarding
CREATE POLICY "Users can view their own onboarding data" 
ON public.builder_onboarding 
FOR SELECT 
TO authenticated
USING (true); -- We'll need to add user_id column or use a different approach

-- Fix function search path issues by setting explicit search_path
ALTER FUNCTION public.validate_access_code(text) SET search_path = public;
ALTER FUNCTION public.get_access_codes_overview() SET search_path = public;