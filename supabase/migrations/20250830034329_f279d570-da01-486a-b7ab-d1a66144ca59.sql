-- Fix infinite recursion by completely recreating profiles RLS policies
-- First, get all existing policy names and drop them
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on profiles table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
    END LOOP;
END $$;

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

-- Policy for leads to view all profiles (direct role check without function)
CREATE POLICY "Leads can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.id = auth.uid() AND p2.role = 'lead'
  )
);

-- Policy for mentors to view all profiles (direct role check without function)  
CREATE POLICY "Mentors can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.id = auth.uid() AND p2.role = 'mentor'
  )
);