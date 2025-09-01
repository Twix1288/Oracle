-- Fix RLS policy for members table to allow onboarding completion
-- Users need to be able to create member records during onboarding

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Users can insert member records during onboarding" ON public.members;

-- Create new policy that allows authenticated users to insert member records
-- This is needed for the onboarding process to work
CREATE POLICY "Users can insert member records during onboarding" 
ON public.members 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure users can update member records they create
DROP POLICY IF EXISTS "Users can update member records they create" ON public.members;

CREATE POLICY "Users can update member records they create" 
ON public.members 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);