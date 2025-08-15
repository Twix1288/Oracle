-- Add role to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'guest';

-- Create role management functions
CREATE OR REPLACE FUNCTION public.assign_user_role(p_user_id UUID, p_role user_role)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET role = p_role, updated_at = NOW()
  WHERE id = p_user_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Role updated successfully');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
END;
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result
  FROM public.profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(user_role_result, 'guest'::user_role);
END;
$$;

-- Update RLS policies to use roles from profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view profiles based on role" ON public.profiles 
FOR SELECT USING (
  CASE 
    WHEN public.get_user_role(auth.uid()) IN ('lead', 'mentor') THEN true
    WHEN auth.uid() = id THEN true
    WHEN public.get_user_role(auth.uid()) = 'builder' AND team_id IS NOT NULL THEN true
    ELSE false
  END
);

-- Create admin role management table for leads to manage roles
CREATE TABLE IF NOT EXISTS public.role_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_role user_role NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only leads can manage role assignments" ON public.role_assignments 
FOR ALL USING (public.get_user_role(auth.uid()) = 'lead');

-- Update trigger for role_assignments
CREATE TRIGGER update_role_assignments_updated_at
  BEFORE UPDATE ON public.role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();