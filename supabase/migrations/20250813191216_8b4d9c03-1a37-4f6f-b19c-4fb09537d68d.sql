-- Fix all security issues by enabling RLS and adding proper policies

-- Enable RLS on all tables that need it (if not already enabled)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'teams' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'members' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'updates' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'team_status' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.team_status ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'builder_assignments' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.builder_assignments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'builder_onboarding' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.builder_onboarding ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop all existing public policies that make data accessible to everyone
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

-- Create restrictive policies that require authentication
-- Teams table - only authenticated users can access
CREATE POLICY "Authenticated users only - teams" 
ON public.teams 
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Members table - only authenticated users can access
CREATE POLICY "Authenticated users only - members" 
ON public.members 
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Updates table - only authenticated users can access
CREATE POLICY "Authenticated users only - updates" 
ON public.updates 
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Team status - only authenticated users can access
CREATE POLICY "Authenticated users only - team_status" 
ON public.team_status 
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Builder assignments - only authenticated users can access
CREATE POLICY "Authenticated users only - builder_assignments" 
ON public.builder_assignments 
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Builder onboarding - only authenticated users can access
CREATE POLICY "Authenticated users only - builder_onboarding" 
ON public.builder_onboarding 
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);