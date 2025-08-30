-- Now create the remaining functions needed
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    'unassigned'::user_role
  );
  RETURN NEW;
END;
$$;

-- Create the use_access_code function
CREATE OR REPLACE FUNCTION public.use_access_code(p_user_id uuid, p_code text, p_builder_name text DEFAULT null)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_access_code RECORD;
BEGIN
  -- Validate the access code
  SELECT ac.*, t.name as team_name INTO v_access_code 
  FROM public.access_codes ac
  LEFT JOIN public.teams t ON ac.team_id = t.id
  WHERE ac.code = p_code
    AND COALESCE(ac.is_active, true) = true
    AND (ac.expires_at IS NULL OR ac.expires_at > NOW())
    AND (ac.max_uses IS NULL OR COALESCE(ac.current_uses, 0) < ac.max_uses);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired access code');
  END IF;
  
  -- Update user profile with role and team (if applicable)
  UPDATE public.profiles 
  SET 
    role = v_access_code.role,
    team_id = CASE 
      WHEN v_access_code.role = 'builder' THEN v_access_code.team_id 
      ELSE team_id 
    END,
    full_name = CASE 
      WHEN v_access_code.role = 'builder' AND p_builder_name IS NOT NULL THEN p_builder_name
      ELSE full_name
    END,
    onboarding_completed = true,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Increment usage count
  UPDATE public.access_codes
  SET current_uses = COALESCE(current_uses, 0) + 1, updated_at = NOW()
  WHERE id = v_access_code.id;
  
  -- Return success with role and team info
  RETURN jsonb_build_object(
    'success', true, 
    'role', v_access_code.role,
    'team_id', v_access_code.team_id,
    'team_name', v_access_code.team_name
  );
END;
$$;