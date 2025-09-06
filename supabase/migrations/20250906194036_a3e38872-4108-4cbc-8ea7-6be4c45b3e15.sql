-- Fix the final function that's missing search_path parameter

-- Fix the shorter version of create_team_with_project_data function
CREATE OR REPLACE FUNCTION public.create_team_with_project_data(p_name text, p_description text DEFAULT NULL::text, p_project_name text DEFAULT NULL::text, p_project_description text DEFAULT NULL::text, p_tech_stack text[] DEFAULT NULL::text[], p_user_id uuid DEFAULT NULL::uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  new_team teams;
  new_member members;
BEGIN
  -- Insert team
  INSERT INTO teams (name, description, project_name, project_description, tech_stack, access_code)
  VALUES (p_name, p_description, p_project_name, p_project_description, p_tech_stack, generate_access_code())
  RETURNING * INTO new_team;
  
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