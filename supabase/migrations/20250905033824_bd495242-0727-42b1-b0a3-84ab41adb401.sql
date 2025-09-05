-- Fix search_path security issues for all functions

-- Fix generate_access_code function
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS TEXT AS $$
BEGIN
  RETURN upper(substring(md5(random()::text) from 1 for 6));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix create_team_with_project_data function
CREATE OR REPLACE FUNCTION public.create_team_with_project_data(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_project_description TEXT DEFAULT NULL,
  p_tech_stack TEXT[] DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  new_team public.teams;
  new_member public.members;
BEGIN
  -- Insert team
  INSERT INTO public.teams (name, description, project_name, project_description, tech_stack, access_code)
  VALUES (p_name, p_description, p_project_name, p_project_description, p_tech_stack, generate_access_code())
  RETURNING * INTO new_team;
  
  -- Add creator as team member if user_id provided
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.members (user_id, team_id, role)
    VALUES (p_user_id, new_team.id, 'lead')
    RETURNING * INTO new_member;
    
    -- Update user's team_id in profile
    UPDATE public.profiles 
    SET team_id = new_team.id 
    WHERE id = p_user_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'team', row_to_json(new_team),
    'member', row_to_json(new_member)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix join_team_with_code function
CREATE OR REPLACE FUNCTION public.join_team_with_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS JSON AS $$
DECLARE
  target_team public.teams;
  new_member public.members;
  member_count INTEGER;
BEGIN
  -- Find team by access code
  SELECT * INTO target_team FROM public.teams WHERE access_code = p_code;
  
  IF target_team IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid access code');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM public.members WHERE user_id = p_user_id AND team_id = target_team.id) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this team');
  END IF;
  
  -- Check team capacity
  SELECT COUNT(*) INTO member_count FROM public.members WHERE team_id = target_team.id;
  
  IF member_count >= target_team.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Team is full');
  END IF;
  
  -- Add user to team
  INSERT INTO public.members (user_id, team_id, role)
  VALUES (p_user_id, target_team.id, 'builder')
  RETURNING * INTO new_member;
  
  -- Update user's team_id in profile
  UPDATE public.profiles 
  SET team_id = target_team.id 
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'team', row_to_json(target_team),
    'member', row_to_json(new_member)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix assign_user_role function
CREATE OR REPLACE FUNCTION public.assign_user_role(
  p_user_id UUID,
  p_role user_role
)
RETURNS JSON AS $$
BEGIN
  -- Update user role
  UPDATE public.profiles 
  SET role = p_role, updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;