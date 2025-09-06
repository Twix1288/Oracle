-- Fix security vulnerabilities by setting search_path on all database functions

-- Fix store_onboarding_as_documents function
CREATE OR REPLACE FUNCTION public.store_onboarding_as_documents(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_profile profiles;
  content_text text;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile FROM profiles WHERE id = p_user_id;
  
  IF user_profile IS NULL THEN
    RETURN;
  END IF;
  
  -- Create comprehensive onboarding content text
  content_text := format(
    'User Profile: %s
    Role: %s
    Skills: %s
    Experience Level: %s
    Learning Goals: %s
    Project Goals: %s
    Bio: %s
    Interests: %s
    Expertise Areas: %s
    Career Aspirations: %s
    Challenge Areas: %s
    Communication Style: %s
    Work Style: %s
    Availability: %s
    Timezone: %s
    Help Needed: %s
    Mentorship Needs: %s
    Preferred Technologies: %s
    Collaboration Preferences: %s
    Industry Focus: %s
    Networking Goals: %s
    Success Metrics: %s',
    COALESCE(user_profile.full_name, ''),
    COALESCE(user_profile.role::text, ''),
    COALESCE(array_to_string(user_profile.skills, ', '), ''),
    COALESCE(user_profile.experience_level, ''),
    COALESCE(array_to_string(user_profile.learning_goals, ', '), ''),
    COALESCE(user_profile.project_goals, ''),
    COALESCE(user_profile.bio, ''),
    COALESCE(array_to_string(user_profile.interests, ', '), ''),
    COALESCE(array_to_string(user_profile.expertise_areas, ', '), ''),
    COALESCE(array_to_string(user_profile.career_aspirations, ', '), ''),
    COALESCE(array_to_string(user_profile.challenge_areas, ', '), ''),
    COALESCE(user_profile.communication_style, ''),
    COALESCE(user_profile.work_style, ''),
    COALESCE(user_profile.availability, ''),
    COALESCE(user_profile.timezone, ''),
    COALESCE(array_to_string(user_profile.help_needed, ', '), ''),
    COALESCE(user_profile.mentorship_needs, ''),
    COALESCE(array_to_string(user_profile.preferred_technologies, ', '), ''),
    COALESCE(user_profile.collaboration_preferences, ''),
    COALESCE(user_profile.industry_focus, ''),
    COALESCE(array_to_string(user_profile.networking_goals, ', '), ''),
    COALESCE(array_to_string(user_profile.success_metrics, ', '), '')
  );
  
  -- Insert or update the user profile document
  INSERT INTO documents (content, content_type, source_id, source_table, metadata)
  VALUES (
    content_text,
    'profile',
    p_user_id,
    'profiles',
    jsonb_build_object(
      'user_id', p_user_id,
      'full_name', user_profile.full_name,
      'role', user_profile.role,
      'team_id', user_profile.team_id,
      'last_updated', now()
    )
  )
  ON CONFLICT ON CONSTRAINT documents_pkey 
  DO UPDATE SET
    content = EXCLUDED.content,
    metadata = EXCLUDED.metadata,
    updated_at = now();
END;
$function$;

-- Fix store_team_as_document function  
CREATE OR REPLACE FUNCTION public.store_team_as_document(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  team_record teams;
  content_text text;
BEGIN
  SELECT * INTO team_record FROM teams WHERE id = p_team_id;
  
  IF team_record IS NULL THEN
    RETURN;
  END IF;
  
  content_text := format(
    'Team: %s
    Description: %s
    Project: %s
    Project Description: %s
    Problem Statement: %s
    Solution Approach: %s
    Target Audience: %s
    Project Type: %s
    Tech Stack: %s
    Skills Needed: %s
    Tech Requirements: %s
    Stage: %s
    Team Size Needed: %s
    Timeline: %s months
    Market Research: %s
    Competitive Advantage: %s
    Success Metrics: %s
    Mentorship Areas: %s',
    COALESCE(team_record.name, ''),
    COALESCE(team_record.description, ''),
    COALESCE(team_record.project_name, ''),
    COALESCE(team_record.project_description, ''),
    COALESCE(team_record.problem_statement, ''),
    COALESCE(team_record.solution_approach, ''),
    COALESCE(team_record.target_audience, ''),
    COALESCE(team_record.project_type, ''),
    COALESCE(array_to_string(team_record.tech_stack, ', '), ''),
    COALESCE(array_to_string(team_record.skills_needed, ', '), ''),
    COALESCE(array_to_string(team_record.tech_requirements, ', '), ''),
    COALESCE(team_record.stage, ''),
    COALESCE(team_record.team_size_needed::text, ''),
    COALESCE(team_record.timeline_months::text, ''),
    COALESCE(team_record.market_research, ''),
    COALESCE(team_record.competitive_advantage, ''),
    COALESCE(team_record.success_metrics, ''),
    COALESCE(team_record.mentorship_areas, '')
  );
  
  INSERT INTO documents (content, content_type, source_id, source_table, metadata)
  VALUES (
    content_text,
    'team',
    p_team_id,
    'teams',
    jsonb_build_object(
      'team_id', p_team_id,
      'name', team_record.name,
      'stage', team_record.stage,
      'project_type', team_record.project_type,
      'last_updated', now()
    )
  )
  ON CONFLICT ON CONSTRAINT documents_pkey 
  DO UPDATE SET
    content = EXCLUDED.content,
    metadata = EXCLUDED.metadata,
    updated_at = now();
END;
$function$;

-- Fix store_update_as_document function
CREATE OR REPLACE FUNCTION public.store_update_as_document(p_update_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  update_record updates;
  creator_name text;
  creator_role user_role;
  content_text text;
BEGIN
  -- Get update record
  SELECT * INTO update_record FROM updates WHERE id = p_update_id;
  
  IF update_record IS NULL THEN
    RETURN;
  END IF;
  
  -- Get creator profile info
  SELECT full_name, role 
  INTO creator_name, creator_role
  FROM profiles 
  WHERE id = update_record.created_by;
  
  content_text := format(
    'Team Update (%s) by %s (%s): %s',
    COALESCE(update_record.type::text, 'note'),
    COALESCE(creator_name, 'Unknown'),
    COALESCE(creator_role::text, 'unassigned'),
    update_record.content
  );
  
  INSERT INTO documents (content, content_type, source_id, source_table, metadata)
  VALUES (
    content_text,
    'update',
    update_record.team_id,
    'updates',
    jsonb_build_object(
      'update_id', p_update_id,
      'creator_id', update_record.created_by,
      'creator_name', creator_name,
      'type', update_record.type,
      'team_id', update_record.team_id,
      'created_at', update_record.created_at
    )
  );
END;
$function$;

-- Fix store_oracle_log_as_document function
CREATE OR REPLACE FUNCTION public.store_oracle_log_as_document(p_log_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  log_record oracle_logs;
  user_name text;
  user_role_val user_role;
  content_text text;
BEGIN
  -- Get oracle log record
  SELECT * INTO log_record FROM oracle_logs WHERE id = p_log_id;
  
  IF log_record IS NULL THEN
    RETURN;
  END IF;
  
  -- Get user profile info
  SELECT full_name, role 
  INTO user_name, user_role_val
  FROM profiles 
  WHERE id = log_record.user_id;
  
  content_text := format(
    'Oracle Query by %s (%s): %s
    Response: %s
    Query Type: %s
    User Satisfaction: %s',
    COALESCE(user_name, 'Unknown'),
    COALESCE(user_role_val::text, 'unassigned'),
    log_record.query,
    COALESCE(substring(log_record.response from 1 for 500), ''),
    COALESCE(log_record.query_type, 'chat'),
    COALESCE(log_record.user_satisfaction::text, 'unrated')
  );
  
  INSERT INTO documents (content, content_type, source_id, source_table, metadata)
  VALUES (
    content_text,
    'oracle_log',
    COALESCE(log_record.team_id, log_record.user_id),
    'oracle_logs',
    jsonb_build_object(
      'log_id', p_log_id,
      'user_id', log_record.user_id,
      'user_name', user_name,
      'query_type', log_record.query_type,
      'team_id', log_record.team_id,
      'user_satisfaction', log_record.user_satisfaction,
      'created_at', log_record.created_at
    )
  );
END;
$function$;

-- Fix store_message_as_document function
CREATE OR REPLACE FUNCTION public.store_message_as_document(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  message_record messages;
  sender_name text;
  sender_role user_role;
  sender_skills text[];
  content_text text;
BEGIN
  -- Get message and sender info separately
  SELECT * INTO message_record FROM messages WHERE id = p_message_id;
  
  IF message_record IS NULL THEN
    RETURN;
  END IF;
  
  -- Get sender profile info
  SELECT full_name, role, skills 
  INTO sender_name, sender_role, sender_skills
  FROM profiles 
  WHERE id = message_record.sender_id;
  
  content_text := format(
    'Message from %s (%s): %s
    Sender Skills: %s
    Team Context: Team %s conversation',
    COALESCE(sender_name, 'Unknown'),
    COALESCE(sender_role::text, 'unassigned'),
    message_record.content,
    COALESCE(array_to_string(sender_skills, ', '), ''),
    COALESCE(message_record.team_id::text, 'No Team')
  );
  
  INSERT INTO documents (content, content_type, source_id, source_table, metadata)
  VALUES (
    content_text,
    'message',
    message_record.team_id,
    'messages',
    jsonb_build_object(
      'message_id', p_message_id,
      'sender_id', message_record.sender_id,
      'sender_name', sender_name,
      'sender_role', sender_role,
      'team_id', message_record.team_id,
      'created_at', message_record.created_at
    )
  );
END;
$function$;

-- Fix get_comprehensive_oracle_context function
CREATE OR REPLACE FUNCTION public.get_comprehensive_oracle_context(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  context jsonb;
BEGIN
  SELECT jsonb_build_object(
    'user_profile', (
      SELECT row_to_json(p.*) 
      FROM profiles p 
      WHERE p.id = p_user_id
    ),
    'user_team', (
      SELECT jsonb_build_object(
        'team_info', row_to_json(t.*),
        'team_members', (
          SELECT json_agg(
            jsonb_build_object(
              'user_id', m.user_id,
              'role', m.role,
              'profile', row_to_json(prof.*)
            )
          )
          FROM members m
          JOIN profiles prof ON prof.id = m.user_id
          WHERE m.team_id = t.id
        )
      )
      FROM teams t 
      JOIN profiles p ON p.team_id = t.id
      WHERE p.id = p_user_id
    ),
    'recent_interactions', (
      SELECT json_agg(
        jsonb_build_object(
          'query', ol.query,
          'response', ol.response,
          'query_type', ol.query_type,
          'created_at', ol.created_at,
          'confidence', ol.confidence,
          'user_satisfaction', ol.user_satisfaction
        )
      )
      FROM oracle_logs ol
      WHERE ol.user_id = p_user_id
      ORDER BY ol.created_at DESC
      LIMIT 20
    ),
    'team_updates', (
      SELECT json_agg(row_to_json(u.*))
      FROM updates u
      JOIN profiles p ON p.team_id = u.team_id
      WHERE p.id = p_user_id
      ORDER BY u.created_at DESC
      LIMIT 10
    ),
    'team_messages', (
      SELECT json_agg(row_to_json(msg.*))
      FROM messages msg
      JOIN profiles p ON p.team_id = msg.team_id
      WHERE p.id = p_user_id
      ORDER BY msg.created_at DESC
      LIMIT 10
    ),
    'progress_entries', (
      SELECT json_agg(row_to_json(pe.*))
      FROM progress_entries pe
      WHERE pe.user_id = p_user_id
      ORDER BY pe.created_at DESC
      LIMIT 5
    ),
    'available_teams', (
      SELECT json_agg(
        jsonb_build_object(
          'team', row_to_json(t.*),
          'member_count', (SELECT COUNT(*) FROM members WHERE team_id = t.id),
          'skills_match', (
            SELECT COUNT(*)
            FROM unnest(t.skills_needed) AS team_skill
            JOIN profiles p ON p.id = p_user_id
            WHERE team_skill = ANY(p.skills)
          )
        )
      )
      FROM teams t
      WHERE (SELECT COUNT(*) FROM members WHERE team_id = t.id) < t.max_members
      AND t.id != (SELECT team_id FROM profiles WHERE id = p_user_id)
      ORDER BY (
        SELECT COUNT(*)
        FROM unnest(t.skills_needed) AS team_skill
        JOIN profiles p ON p.id = p_user_id
        WHERE team_skill = ANY(p.skills)
      ) DESC
      LIMIT 10
    )
  )
  INTO context;

  RETURN context;
END;
$function$;

-- Fix get_oracle_user_context function
CREATE OR REPLACE FUNCTION public.get_oracle_user_context(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix get_oracle_team_context function
CREATE OR REPLACE FUNCTION public.get_oracle_team_context(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;