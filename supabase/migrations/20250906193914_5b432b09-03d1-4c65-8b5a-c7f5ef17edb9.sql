-- Fix remaining security vulnerabilities by setting search_path on remaining database functions

-- Fix generate_access_code function
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN upper(substring(md5(random()::text) from 1 for 6));
END;
$function$;

-- Fix create_team_with_project_data function (main version)
CREATE OR REPLACE FUNCTION public.create_team_with_project_data(p_name text, p_description text DEFAULT NULL::text, p_project_name text DEFAULT NULL::text, p_project_description text DEFAULT NULL::text, p_tech_stack text[] DEFAULT NULL::text[], p_user_id uuid DEFAULT NULL::uuid, p_problem_statement text DEFAULT NULL::text, p_solution_approach text DEFAULT NULL::text, p_target_audience text DEFAULT NULL::text, p_project_type text DEFAULT NULL::text, p_skills_needed text[] DEFAULT NULL::text[], p_tech_requirements text[] DEFAULT NULL::text[], p_team_size_needed integer DEFAULT 3, p_timeline_months integer DEFAULT 6)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  new_team teams;
  new_member members;
BEGIN
  -- Insert team with comprehensive data
  INSERT INTO teams (
    name, 
    description, 
    project_name,
    project_description,
    tech_stack,
    problem_statement,
    solution_approach,
    target_audience,
    project_type,
    skills_needed,
    tech_requirements,
    team_size_needed,
    timeline_months,
    access_code
  ) VALUES (
    p_name,
    p_description,
    p_project_name,
    p_project_description,
    p_tech_stack,
    p_problem_statement,
    p_solution_approach,
    p_target_audience,
    p_project_type,
    p_skills_needed,
    p_tech_requirements,
    p_team_size_needed,
    p_timeline_months,
    generate_access_code()
  ) RETURNING * INTO new_team;
  
  -- Add creator as team member if user_id provided
  IF p_user_id IS NOT NULL THEN
    INSERT INTO members (user_id, team_id, role)
    VALUES (p_user_id, new_team.id, 'builder')
    RETURNING * INTO new_member;
    
    -- Update user's team_id in profile
    UPDATE profiles 
    SET team_id = new_team.id 
    WHERE id = p_user_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'team', row_to_json(new_team),
    'member', row_to_json(new_member)
  );
END;
$function$;

-- Fix assign_user_role function
CREATE OR REPLACE FUNCTION public.assign_user_role(p_user_id uuid, p_role user_role)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Update user role
  UPDATE profiles 
  SET role = p_role, updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  RETURN json_build_object('success', true);
END;
$function$;

-- Fix join_team_with_code function
CREATE OR REPLACE FUNCTION public.join_team_with_code(p_user_id uuid, p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  target_team teams;
  new_member members;
  member_count INTEGER;
BEGIN
  -- Find team by access code
  SELECT * INTO target_team FROM teams WHERE access_code = p_code;
  
  IF target_team IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid access code');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM members WHERE user_id = p_user_id AND team_id = target_team.id) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this team');
  END IF;
  
  -- Check team capacity
  SELECT COUNT(*) INTO member_count FROM members WHERE team_id = target_team.id;
  
  IF member_count >= target_team.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Team is full');
  END IF;
  
  -- Add user to team
  INSERT INTO members (user_id, team_id, role)
  VALUES (p_user_id, target_team.id, 'builder')
  RETURNING * INTO new_member;
  
  -- Update user's team_id in profile
  UPDATE profiles 
  SET team_id = target_team.id 
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'team', row_to_json(target_team),
    'member', row_to_json(new_member)
  );
END;
$function$;