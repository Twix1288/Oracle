-- Create use_access_code function for the Gateway
CREATE OR REPLACE FUNCTION public.use_access_code(
  p_user_id UUID,
  p_code TEXT,
  p_builder_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  target_team public.teams;
  new_member public.members;
  member_count INTEGER;
  user_profile public.profiles;
BEGIN
  -- Get current user profile
  SELECT * INTO user_profile FROM public.profiles WHERE id = p_user_id;
  
  IF user_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;
  
  -- Update builder name if provided
  IF p_builder_name IS NOT NULL AND p_builder_name != '' THEN
    UPDATE public.profiles 
    SET full_name = p_builder_name, updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
  
  -- Find team by access code
  SELECT * INTO target_team FROM public.teams WHERE access_code = p_code;
  
  IF target_team IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid access code');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM public.members WHERE user_id = p_user_id AND team_id = target_team.id) THEN
    RETURN json_build_object(
      'success', true, 
      'role', (SELECT role FROM public.members WHERE user_id = p_user_id AND team_id = target_team.id),
      'team_name', target_team.name
    );
  END IF;
  
  -- Check team capacity
  SELECT COUNT(*) INTO member_count FROM public.members WHERE team_id = target_team.id;
  
  IF member_count >= target_team.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Team is full');
  END IF;
  
  -- Add user to team as builder
  INSERT INTO public.members (user_id, team_id, role)
  VALUES (p_user_id, target_team.id, 'builder')
  RETURNING * INTO new_member;
  
  -- Update user's team_id and role in profile
  UPDATE public.profiles 
  SET team_id = target_team.id, role = 'builder', updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'role', 'builder',
    'team_name', target_team.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;