-- Update the security definer function to explicitly bypass RLS
CREATE OR REPLACE FUNCTION public.check_user_role_simple(user_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_result text;
BEGIN
  -- Use a direct query that bypasses RLS by using the security definer context
  SELECT role::text INTO user_role_result 
  FROM public.profiles 
  WHERE id = user_id;
  
  RETURN user_role_result = required_role;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN false;
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_role_simple(uuid, text) TO authenticated;