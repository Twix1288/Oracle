-- Fix the final security vulnerability by setting search_path on the remaining function

-- Fix use_access_code function
CREATE OR REPLACE FUNCTION public.use_access_code(p_user_id uuid, p_code text, p_builder_name text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  target_team teams;
  new_member members;
  member_count INTEGER;
  user_profile profiles;
BEGIN
  -- Get current user profile
  SELECT * INTO user_profile FROM profiles WHERE id = p_user_id;
  
  IF user_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;
  
  -- Update builder name if provided
  IF p_builder_name IS NOT NULL AND p_builder_name != '' THEN
    UPDATE profiles 
    SET full_name = p_builder_name, updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
  
  -- Find team by access code
  SELECT * INTO target_team FROM teams WHERE access_code = p_code;
  
  IF target_team IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid access code');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM members WHERE user_id = p_user_id AND team_id = target_team.id) THEN
    RETURN json_build_object(
      'success', true, 
      'role', (SELECT role FROM members WHERE user_id = p_user_id AND team_id = target_team.id),
      'team_name', target_team.name
    );
  END IF;
  
  -- Check team capacity
  SELECT COUNT(*) INTO member_count FROM members WHERE team_id = target_team.id;
  
  IF member_count >= target_team.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Team is full');
  END IF;
  
  -- Add user to team as builder
  INSERT INTO members (user_id, team_id, role)
  VALUES (p_user_id, target_team.id, 'builder')
  RETURNING * INTO new_member;
  
  -- Update user's team_id and role in profile
  UPDATE profiles 
  SET team_id = target_team.id, role = 'builder', updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'role', 'builder',
    'team_name', target_team.name
  );
END;
$function$;