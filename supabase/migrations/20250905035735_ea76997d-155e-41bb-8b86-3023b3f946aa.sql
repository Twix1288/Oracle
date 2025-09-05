-- Function to update Oracle interaction statistics
CREATE OR REPLACE FUNCTION update_oracle_interaction_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user's Oracle interaction count and timestamp
  UPDATE profiles 
  SET 
    oracle_interaction_count = COALESCE(oracle_interaction_count, 0) + 1,
    oracle_last_interaction = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update interaction stats
CREATE TRIGGER update_oracle_stats_trigger
  AFTER INSERT ON oracle_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_oracle_interaction_stats();

-- Function to get comprehensive user context for Oracle
CREATE OR REPLACE FUNCTION get_oracle_user_context(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  user_context jsonb;
BEGIN
  SELECT jsonb_build_object(
    'profile', row_to_json(p.*),
    'team', (
      SELECT row_to_json(t.*) 
      FROM teams t 
      WHERE t.id = p.team_id
    ),
    'team_members', (
      SELECT json_agg(
        jsonb_build_object(
          'id', m.user_id,
          'role', m.role,
          'name', prof.full_name,
          'skills', prof.skills,
          'expertise_areas', prof.expertise_areas
        )
      )
      FROM members m
      JOIN profiles prof ON prof.id = m.user_id
      WHERE m.team_id = p.team_id
    ),
    'recent_updates', (
      SELECT json_agg(row_to_json(u.*))
      FROM updates u
      WHERE u.team_id = p.team_id
      ORDER BY u.created_at DESC
      LIMIT 10
    ),
    'recent_messages', (
      SELECT json_agg(row_to_json(msg.*))
      FROM messages msg
      WHERE msg.team_id = p.team_id
      ORDER BY msg.created_at DESC
      LIMIT 10
    ),
    'oracle_history', (
      SELECT json_agg(
        jsonb_build_object(
          'query', ol.query,
          'query_type', ol.query_type,
          'created_at', ol.created_at,
          'user_satisfaction', ol.user_satisfaction
        )
      )
      FROM oracle_logs ol
      WHERE ol.user_id = p_user_id
      ORDER BY ol.created_at DESC
      LIMIT 20
    )
  )
  INTO user_context
  FROM profiles p
  WHERE p.id = p_user_id;

  RETURN user_context;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create comprehensive team data for Oracle RAG
CREATE OR REPLACE FUNCTION get_oracle_team_context(p_team_id uuid)
RETURNS jsonb AS $$
DECLARE
  team_context jsonb;
BEGIN
  SELECT jsonb_build_object(
    'team', row_to_json(t.*),
    'members', (
      SELECT json_agg(
        jsonb_build_object(
          'user_id', m.user_id,
          'role', m.role,
          'profile', row_to_json(p.*)
        )
      )
      FROM members m
      JOIN profiles p ON p.id = m.user_id
      WHERE m.team_id = p_team_id
    ),
    'all_updates', (
      SELECT json_agg(row_to_json(u.*))
      FROM updates u
      WHERE u.team_id = p_team_id
      ORDER BY u.created_at DESC
    ),
    'all_messages', (
      SELECT json_agg(row_to_json(msg.*))
      FROM messages msg
      WHERE msg.team_id = p_team_id
      ORDER by msg.created_at DESC
    ),
    'team_oracle_interactions', (
      SELECT json_agg(
        jsonb_build_object(
          'query', ol.query,
          'response', ol.response,
          'query_type', ol.query_type,
          'user_role', ol.user_role,
          'created_at', ol.created_at
        )
      )
      FROM oracle_logs ol
      WHERE ol.team_id = p_team_id
      ORDER BY ol.created_at DESC
      LIMIT 50
    )
  )
  INTO team_context
  FROM teams t
  WHERE t.id = p_team_id;

  RETURN team_context;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to create teams with comprehensive project data
CREATE OR REPLACE FUNCTION create_team_with_project_data(
  p_name text,
  p_description text DEFAULT NULL,
  p_project_name text DEFAULT NULL,
  p_project_description text DEFAULT NULL,
  p_tech_stack text[] DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_problem_statement text DEFAULT NULL,
  p_solution_approach text DEFAULT NULL,
  p_target_audience text DEFAULT NULL,
  p_project_type text DEFAULT NULL,
  p_skills_needed text[] DEFAULT NULL,
  p_tech_requirements text[] DEFAULT NULL,
  p_team_size_needed integer DEFAULT 3,
  p_timeline_months integer DEFAULT 6
)
RETURNS jsonb AS $$
DECLARE
  new_team teams;
  new_member members;
BEGIN
  -- Insert team with comprehensive data
  INSERT INTO public.teams (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;