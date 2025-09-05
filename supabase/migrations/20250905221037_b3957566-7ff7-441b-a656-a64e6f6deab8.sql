-- Create documents table for RAG system with vector embeddings
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text', -- 'profile', 'team', 'message', 'update', 'onboarding'
  source_id UUID, -- references user_id, team_id, etc depending on content_type
  source_table TEXT, -- 'profiles', 'teams', 'messages', 'updates', etc
  metadata JSONB DEFAULT '{}',
  embedding vector(1536), -- OpenAI ada-002 embedding size
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies for documents
CREATE POLICY "Users can view documents related to their teams" 
ON public.documents 
FOR SELECT 
USING (
  -- User can see their own profile documents
  (content_type = 'profile' AND source_id = auth.uid()) OR
  -- User can see documents from teams they're in
  (content_type IN ('team', 'message', 'update') AND source_id IN (
    SELECT team_id FROM members WHERE user_id = auth.uid()
  )) OR
  -- Mentors can see all team documents
  (content_type IN ('team', 'message', 'update') AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'mentor'
  )) OR
  -- Public documents (community features)
  content_type = 'public'
);

CREATE POLICY "System can insert documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (true); -- Allow system to insert, will be restricted by application logic

-- Create indexes for efficient vector search
CREATE INDEX documents_embedding_idx ON public.documents 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX documents_content_type_idx ON public.documents (content_type);
CREATE INDEX documents_source_idx ON public.documents (source_id, source_table);
CREATE INDEX documents_created_at_idx ON public.documents (created_at DESC);

-- Create full-text search index for fallback
CREATE INDEX documents_content_fts_idx ON public.documents 
USING gin(to_tsvector('english', content));

-- Function to automatically update updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enhanced Oracle context function that includes all user data
CREATE OR REPLACE FUNCTION public.get_comprehensive_oracle_context(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to vectorize and store onboarding data
CREATE OR REPLACE FUNCTION public.store_onboarding_as_documents(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Trigger to automatically vectorize profile data when updated
CREATE OR REPLACE FUNCTION public.auto_vectorize_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Call function to store onboarding data as searchable documents
  PERFORM store_onboarding_as_documents(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER profile_auto_vectorize
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_vectorize_profile();

-- Function to store team data as documents
CREATE OR REPLACE FUNCTION public.store_team_as_document(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Trigger to automatically vectorize team data
CREATE OR REPLACE FUNCTION public.auto_vectorize_team()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM store_team_as_document(NEW.id);
  RETURN NEW;
END;
$function$;