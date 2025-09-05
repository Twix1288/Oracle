-- Phase 7: Add remaining essential functions and policies

-- Create team creation function with access code generation
CREATE OR REPLACE FUNCTION public.create_team_with_project_data(
  p_team_name text,
  p_description text,
  p_project_type text,
  p_target_audience text,
  p_problem_statement text,
  p_solution_approach text,
  p_tech_requirements text[],
  p_timeline_months integer,
  p_team_size_needed integer,
  p_skills_needed text[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_team_id uuid;
  v_access_code text;
BEGIN
  -- Create the team
  INSERT INTO public.teams (
    name, description, team_creator_id, project_type, target_audience,
    problem_statement, solution_approach, tech_requirements,
    timeline_months, team_size_needed, skills_needed, is_public
  ) VALUES (
    p_team_name, p_description, auth.uid(), p_project_type, p_target_audience,
    p_problem_statement, p_solution_approach, p_tech_requirements,
    p_timeline_months, p_team_size_needed, p_skills_needed, true
  ) RETURNING id INTO v_team_id;

  -- Generate access code for the team
  v_access_code := 'TEAM_' || UPPER(substring(md5(random()::text) from 1 for 8));
  
  -- Create access code record
  INSERT INTO public.access_codes (
    code, role, team_id, creator_id, description, expires_at
  ) VALUES (
    v_access_code, 'builder', v_team_id, auth.uid(),
    'Access code for team: ' || p_team_name,
    now() + interval '1 year'
  );

  -- Update user's profile to be part of this team and role as builder
  UPDATE public.profiles 
  SET team_id = v_team_id, role = 'builder'::public.user_role
  WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'success', true,
    'team_id', v_team_id,
    'access_code', v_access_code,
    'message', 'Team created successfully'
  );
END;
$$;

-- Function to handle join requests
CREATE OR REPLACE FUNCTION public.approve_join_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request record;
BEGIN
  -- Get request details and verify the requester is the team creator
  SELECT * INTO v_request FROM public.join_requests 
  WHERE id = p_request_id AND creator_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or unauthorized');
  END IF;

  -- Update request status
  UPDATE public.join_requests 
  SET status = 'approved', responded_at = now()
  WHERE id = p_request_id;

  -- Add user to the team
  UPDATE public.profiles 
  SET team_id = v_request.team_id, role = 'builder'::public.user_role
  WHERE id = v_request.requester_id;

  RETURN jsonb_build_object('success', true, 'message', 'Join request approved');
END;
$$;

-- Function to use access codes
CREATE OR REPLACE FUNCTION public.use_access_code(p_user_id uuid, p_code text, p_builder_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Update user profile with role and team
  UPDATE public.profiles 
  SET 
    role = v_access_code.role,
    team_id = v_access_code.team_id,
    full_name = CASE 
      WHEN p_builder_name IS NOT NULL THEN p_builder_name
      ELSE full_name
    END,
    onboarding_completed = true,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Increment usage count
  UPDATE public.access_codes
  SET current_uses = COALESCE(current_uses, 0) + 1, updated_at = NOW()
  WHERE id = v_access_code.id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'role', v_access_code.role,
    'team_id', v_access_code.team_id,
    'team_name', v_access_code.team_name
  );
END;
$$;