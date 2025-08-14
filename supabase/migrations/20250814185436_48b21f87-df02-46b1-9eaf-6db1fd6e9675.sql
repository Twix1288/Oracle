-- Fix critical security vulnerabilities by securing access_codes and documents tables

-- Secure access_codes table (critical security fix)
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Drop all existing public policies for access_codes
DROP POLICY IF EXISTS "Enable read access for all users" ON public.access_codes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.access_codes;

-- Create secure policies for access_codes - only authenticated users with proper roles can access
CREATE POLICY "Authenticated users can view access codes for their role" 
ON public.access_codes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only authenticated admins can insert access codes" 
ON public.access_codes 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Secure documents table (critical security fix)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop all existing public policies for documents
DROP POLICY IF EXISTS "Enable read access for all users" ON public.documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.documents;

-- Create secure policies for documents based on role visibility
CREATE POLICY "Users can view documents based on role visibility" 
ON public.documents 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    role_visibility = 'all' OR 
    role_visibility IN (
      SELECT unnest(string_to_array(auth.jwt() ->> 'user_role', ','))
    )
  )
);

CREATE POLICY "Authenticated users can create documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own documents" 
ON public.documents 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Secure events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Drop public access policies for events
DROP POLICY IF EXISTS "Enable read access for all users" ON public.events;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.events;

-- Create secure event policies
CREATE POLICY "Authenticated users can view events" 
ON public.events 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Secure mentor_profiles table  
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;

-- Drop public access policies for mentor_profiles
DROP POLICY IF EXISTS "Enable read access for all users" ON public.mentor_profiles;

-- Create secure mentor profile policies
CREATE POLICY "Authenticated users can view mentor profiles" 
ON public.mentor_profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Mentors can manage their own profiles" 
ON public.mentor_profiles 
FOR ALL 
USING (auth.uid() IS NOT NULL);