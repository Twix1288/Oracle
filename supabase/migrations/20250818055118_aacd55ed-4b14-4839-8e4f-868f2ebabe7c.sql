-- Fix security vulnerability: Remove public access to access_codes table
-- Drop the insecure policy that allows anyone to read access codes
DROP POLICY IF EXISTS "Anyone can read active access codes for validation" ON public.access_codes;

-- Create a secure policy that only allows authenticated users to read access codes they need
CREATE POLICY "Authenticated users can read access codes for validation" 
ON public.access_codes 
FOR SELECT 
TO authenticated
USING (
  -- Users can only read access codes when they are:
  -- 1. Active and not expired
  -- 2. And they are either:
  --    a. The person who generated it, OR
  --    b. They have 'lead' role (for management), OR  
  --    c. They are validating it through a function call (handled by SECURITY DEFINER functions)
  (is_active = true) 
  AND ((expires_at IS NULL) OR (expires_at > now()))
  AND (
    generated_by = auth.uid()::text 
    OR get_user_role(auth.uid()) = 'lead'
  )
);

-- Update the existing management policy to be more specific
DROP POLICY IF EXISTS "Authenticated users can manage access codes" ON public.access_codes;

-- Create specific policies for different operations
CREATE POLICY "Leads can manage all access codes" 
ON public.access_codes 
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'lead')
WITH CHECK (get_user_role(auth.uid()) = 'lead');

CREATE POLICY "Users can create access codes" 
ON public.access_codes 
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own access codes" 
ON public.access_codes 
FOR UPDATE
TO authenticated
USING (generated_by = auth.uid()::text OR get_user_role(auth.uid()) = 'lead')
WITH CHECK (generated_by = auth.uid()::text OR get_user_role(auth.uid()) = 'lead');

-- Ensure validation functions remain secure and functional
-- The validate_access_code and validate_team_access_code functions 
-- are already SECURITY DEFINER, so they can access the table regardless of RLS
-- This ensures validation still works while keeping the data secure