-- Enhance team creation function to include all comprehensive project data
CREATE OR REPLACE FUNCTION public.create_team_with_project_data(
  p_team_name text,
  p_description text,
  p_problem_statement text,
  p_solution_approach text,
  p_target_audience text,
  p_project_type text,
  p_skills_needed text[],
  p_tech_requirements text[],
  p_team_size_needed integer,
  p_timeline_months integer,
  p_budget text DEFAULT NULL,
  p_market_research text DEFAULT NULL,
  p_competitive_advantage text DEFAULT NULL,
  p_success_metrics text DEFAULT NULL,
  p_mentorship_areas text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_team_id uuid;
  v_access_code text;
BEGIN
  -- Create the team with comprehensive project data
  INSERT INTO public.teams (
    name, 
    description, 
    team_creator_id, 
    project_type, 
    target_audience,
    problem_statement, 
    solution_approach, 
    tech_requirements,
    timeline_months, 
    team_size_needed, 
    skills_needed, 
    is_public,
    metadata
  ) VALUES (
    p_team_name, 
    p_description, 
    auth.uid(), 
    p_project_type, 
    p_target_audience,
    p_problem_statement, 
    p_solution_approach, 
    p_tech_requirements,
    p_timeline_months, 
    p_team_size_needed, 
    p_skills_needed, 
    true,
    jsonb_build_object(
      'budget', p_budget,
      'market_research', p_market_research,
      'competitive_advantage', p_competitive_advantage,
      'success_metrics', p_success_metrics,
      'mentorship_areas', p_mentorship_areas,
      'created_at', now(),
      'onboarding_completed', true
    )
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

  -- Return success with team info and access code
  RETURN jsonb_build_object(
    'success', true,
    'team_id', v_team_id,
    'access_code', v_access_code,
    'message', 'Team created successfully with comprehensive project data'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_team_with_project_data(text, text, text, text, text, text, text[], text[], integer, integer, text, text, text, text, text) TO authenticated;

-- Create function to make user a team creator
CREATE OR REPLACE FUNCTION public.make_team_creator(
  p_user_id UUID, 
  p_team_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    is_team_creator = true,
    created_team_id = p_team_id,
    team_id = p_team_id,
    role = 'builder',
    updated_at = NOW()
  WHERE id = p_user_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'User is now team creator');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.make_team_creator(UUID, UUID) TO authenticated;
