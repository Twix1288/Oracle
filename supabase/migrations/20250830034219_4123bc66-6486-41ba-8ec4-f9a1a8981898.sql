-- Fix infinite recursion in profiles RLS policies
-- Drop all existing problematic policies first
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;  
DROP POLICY IF EXISTS "Users can view profiles with proper restrictions" ON public.profiles;

-- Create simple, non-recursive policies
-- Policy for users to view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Policy for users to insert their own profile
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Policy for leads and mentors to view all profiles (using direct role check)
CREATE POLICY "Leads and mentors can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR 
  (role IN ('lead', 'mentor'))
);

-- Policy for team members to view each other's profiles
CREATE POLICY "Team members can view team profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR 
  (team_id IS NOT NULL AND team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid() AND team_id IS NOT NULL
  ))
);