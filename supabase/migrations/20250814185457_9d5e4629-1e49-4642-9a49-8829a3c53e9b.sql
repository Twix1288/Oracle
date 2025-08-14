-- Fix critical security vulnerabilities by securing access_codes and documents tables (simplified)

-- Secure access_codes table (critical security fix)
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Drop all existing public policies for access_codes
DROP POLICY IF EXISTS "Allow public insert access to access_codes" ON public.access_codes;
DROP POLICY IF EXISTS "Allow public update access to access_codes" ON public.access_codes;
DROP POLICY IF EXISTS "Allow public delete access to access_codes" ON public.access_codes;

-- Create secure policies for access_codes - only authenticated users can access
CREATE POLICY "Authenticated users can view access codes" 
ON public.access_codes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create access codes" 
ON public.access_codes 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Secure documents table (critical security fix)  
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop all existing public policies for documents
DROP POLICY IF EXISTS "Allow public read access to documents" ON public.documents;
DROP POLICY IF EXISTS "Allow public insert access to documents" ON public.documents;
DROP POLICY IF EXISTS "Allow public update access to documents" ON public.documents;

-- Create secure policies for documents
CREATE POLICY "Authenticated users can view documents" 
ON public.documents 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Secure events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Drop public access policies for events
DROP POLICY IF EXISTS "Allow public read access to events" ON public.events;
DROP POLICY IF EXISTS "Allow public insert access to events" ON public.events;
DROP POLICY IF EXISTS "Allow public update access to events" ON public.events;

-- Create secure event policies
CREATE POLICY "Authenticated users can view events" 
ON public.events 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Secure mentor_profiles table  
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;

-- Drop public access policies for mentor_profiles
DROP POLICY IF EXISTS "Allow public read access to mentor_profiles" ON public.mentor_profiles;
DROP POLICY IF EXISTS "Allow public insert access to mentor_profiles" ON public.mentor_profiles;
DROP POLICY IF EXISTS "Allow public update access to mentor_profiles" ON public.mentor_profiles;

-- Create secure mentor profile policies
CREATE POLICY "Authenticated users can view mentor profiles" 
ON public.mentor_profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);