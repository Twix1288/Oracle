-- Create a security definer function to check user role without recursion
CREATE OR REPLACE FUNCTION public.check_user_role_simple(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct query without RLS to avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role::text = required_role
  );
END;
$$;

-- Drop the problematic policies that still cause recursion
DROP POLICY IF EXISTS "Leads can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Mentors can view all profiles" ON public.profiles;

-- Create new policies using the security definer function
CREATE POLICY "Leads can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR 
  public.check_user_role_simple(auth.uid(), 'lead')
);

CREATE POLICY "Mentors can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR 
  public.check_user_role_simple(auth.uid(), 'mentor')
);