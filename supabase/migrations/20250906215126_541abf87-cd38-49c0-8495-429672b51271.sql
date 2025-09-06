-- Add some sample skills data to existing profiles for testing Oracle matching
UPDATE profiles 
SET skills = ARRAY['React', 'TypeScript', 'Node.js', 'UI/UX Design'] 
WHERE full_name = 'Rishit Agnihotri';

UPDATE profiles 
SET skills = ARRAY['Python', 'Machine Learning', 'Data Science', 'API Development'],
    experience_level = 'Mid-level',
    bio = 'Passionate about AI and building intelligent systems. Love collaborative projects.',
    availability = '15-20 hours/week'
WHERE full_name = 'Liam Davis';

-- Update the existing comprehensive Oracle context function to fix GROUP BY error
CREATE OR REPLACE FUNCTION public.get_comprehensive_oracle_context(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
      FROM (
        SELECT query, response, query_type, created_at, confidence, user_satisfaction
        FROM oracle_logs 
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 20
      ) ol
    ),
    'team_updates', (
      SELECT json_agg(row_to_json(u.*))
      FROM (
        SELECT u.* 
        FROM updates u
        JOIN profiles p ON p.team_id = u.team_id
        WHERE p.id = p_user_id
        ORDER BY u.created_at DESC
        LIMIT 10
      ) u
    ),
    'team_messages', (
      SELECT json_agg(row_to_json(msg.*))
      FROM (
        SELECT msg.*
        FROM messages msg
        JOIN profiles p ON p.team_id = msg.team_id
        WHERE p.id = p_user_id
        ORDER BY msg.created_at DESC
        LIMIT 10
      ) msg
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