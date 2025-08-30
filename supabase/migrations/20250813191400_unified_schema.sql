-- Enable vector extension for RAG system
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enum types
CREATE TYPE public.user_role AS ENUM ('builder', 'mentor', 'lead', 'guest');
CREATE TYPE public.update_type AS ENUM ('daily', 'milestone', 'mentor_meeting', 'broadcast');
CREATE TYPE public.team_stage AS ENUM ('ideation', 'development', 'testing', 'launch', 'growth');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'completed', 'blocked');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.broadcast_type AS ENUM ('all', 'team', 'role');

-- Teams table with enhanced fields
CREATE TABLE public.teams (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    stage team_stage DEFAULT 'ideation',
    tags TEXT[],
    assigned_mentor_id UUID,
    access_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_activity_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Members table with enhanced fields
CREATE TABLE public.members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    role user_role NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    skills TEXT[],
    experience_level TEXT,
    help_needed TEXT[],
    bio TEXT,
    avatar_url TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Updates table with enhanced fields
CREATE TABLE public.updates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    type update_type NOT NULL,
    created_by TEXT,
    sentiment FLOAT,
    keywords TEXT[],
    related_tasks UUID[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Tasks table for automated task management
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',
    assigned_to UUID REFERENCES public.members(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours FLOAT,
    actual_hours FLOAT,
    tags TEXT[],
    dependencies UUID[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Team status table with enhanced fields
CREATE TABLE public.team_status (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    current_status TEXT,
    last_update TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    pending_actions TEXT[],
    blockers TEXT[],
    health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
    velocity FLOAT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Messages table with enhanced fields
CREATE TABLE public.messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id TEXT NOT NULL,
    sender_role user_role NOT NULL,
    receiver_id TEXT,
    receiver_role user_role,
    content TEXT NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    is_broadcast BOOLEAN DEFAULT FALSE,
    broadcast_type broadcast_type,
    broadcast_target TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Documents table for RAG system with vector support
CREATE TABLE public.documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    source_type TEXT,
    role_visibility user_role[] DEFAULT '{}'::user_role[],
    team_visibility UUID[] DEFAULT '{}'::uuid[],
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Oracle logs table for learning and analytics
CREATE TABLE public.oracle_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    user_role user_role NOT NULL,
    user_id TEXT,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    sources_count INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_teams_stage ON public.teams(stage);
CREATE INDEX idx_members_team ON public.members(team_id);
CREATE INDEX idx_updates_team ON public.updates(team_id);
CREATE INDEX idx_tasks_team ON public.tasks(team_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_messages_broadcast ON public.messages(is_broadcast, broadcast_type, broadcast_target);
CREATE INDEX idx_documents_embedding ON public.documents USING ivfflat (embedding vector_cosine_ops);

-- Create function to generate random access codes
CREATE OR REPLACE FUNCTION generate_team_access_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    unique_code BOOLEAN := FALSE;
BEGIN
    WHILE NOT unique_code LOOP
        -- Generate a random 8-character code
        code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
        
        -- Check if code is unique
        SELECT NOT EXISTS (
            SELECT 1 FROM public.teams WHERE access_code = code
        ) INTO unique_code;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user broadcasts
CREATE OR REPLACE FUNCTION get_user_broadcasts(
  p_user_id UUID,
  p_role TEXT,
  p_team_id UUID
) RETURNS SETOF messages AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM messages
  WHERE is_broadcast = TRUE
  AND (
    broadcast_type = 'all'
    OR (broadcast_type = 'team' AND broadcast_target = p_team_id::TEXT)
    OR (broadcast_type = 'role' AND broadcast_target = p_role)
  )
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate team health score
CREATE OR REPLACE FUNCTION calculate_team_health_score(
  p_team_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 100;
  v_last_update TIMESTAMP WITH TIME ZONE;
  v_update_count INTEGER;
  v_member_count INTEGER;
  v_task_completion_rate FLOAT;
BEGIN
  -- Get last update time
  SELECT last_update INTO v_last_update
  FROM team_status
  WHERE team_id = p_team_id;

  -- Deduct points for inactivity
  IF v_last_update < NOW() - INTERVAL '7 days' THEN
    v_score := v_score - 30;
  END IF;

  -- Count recent updates
  SELECT COUNT(*) INTO v_update_count
  FROM updates
  WHERE team_id = p_team_id
  AND created_at > NOW() - INTERVAL '7 days';

  IF v_update_count < 3 THEN
    v_score := v_score - 20;
  END IF;

  -- Check team size
  SELECT COUNT(*) INTO v_member_count
  FROM members
  WHERE team_id = p_team_id;

  IF v_member_count < 2 THEN
    v_score := v_score - 25;
  END IF;

  -- Calculate task completion rate
  SELECT 
    COALESCE(
      COUNT(CASE WHEN status = 'completed' THEN 1 END)::FLOAT / 
      NULLIF(COUNT(*), 0)::FLOAT * 100,
      0
    ) INTO v_task_completion_rate
  FROM tasks
  WHERE team_id = p_team_id
  AND created_at > NOW() - INTERVAL '30 days';

  IF v_task_completion_rate < 50 THEN
    v_score := v_score - 15;
  END IF;

  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically assign tasks
CREATE OR REPLACE FUNCTION auto_assign_task(
  p_task_id UUID
) RETURNS UUID AS $$
DECLARE
  v_team_id UUID;
  v_assigned_to UUID;
BEGIN
  -- Get task's team
  SELECT team_id INTO v_team_id
  FROM tasks
  WHERE id = p_task_id;

  -- Find least loaded team member
  SELECT m.id INTO v_assigned_to
  FROM members m
  LEFT JOIN tasks t ON t.assigned_to = m.id AND t.status != 'completed'
  WHERE m.team_id = v_team_id
  GROUP BY m.id
  ORDER BY COUNT(t.id) ASC
  LIMIT 1;

  -- Update task
  UPDATE tasks
  SET assigned_to = v_assigned_to,
      updated_at = NOW()
  WHERE id = p_task_id;

  RETURN v_assigned_to;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_team_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_timestamp
BEFORE UPDATE ON teams
FOR EACH ROW
EXECUTE FUNCTION update_team_timestamp();

-- Create trigger for task assignments
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != OLD.assigned_to THEN
    INSERT INTO messages (
      sender_id,
      sender_role,
      receiver_id,
      receiver_role,
      content,
      team_id,
      metadata
    )
    VALUES (
      'system',
      'guest',
      NEW.assigned_to::TEXT,
      (SELECT role FROM members WHERE id = NEW.assigned_to),
      format('You have been assigned a new task: %s', NEW.title),
      NEW.team_id,
      jsonb_build_object('task_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_assignment_notification
AFTER UPDATE ON tasks
FOR EACH ROW
WHEN (NEW.assigned_to IS NOT NULL AND NEW.assigned_to != OLD.assigned_to)
EXECUTE FUNCTION notify_task_assignment();
