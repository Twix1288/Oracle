-- Create oracle_logs table to store all Oracle conversations and interactions
CREATE TABLE public.oracle_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  response text NOT NULL,
  query_type text NOT NULL DEFAULT 'chat', -- chat, resources, connect, update, message, etc.
  model_used text,
  confidence real DEFAULT 0,
  sources integer DEFAULT 0,
  processing_time integer DEFAULT 0, -- in milliseconds
  search_strategy text,
  context_used boolean DEFAULT false,
  user_role user_role NOT NULL,
  team_id uuid REFERENCES teams(id),
  
  -- Enhanced metadata for RAG system  
  similarity_score real,
  
  -- GraphRAG data
  graph_nodes jsonb,
  graph_relationships jsonb,
  knowledge_graph jsonb,
  
  -- Command execution results
  command_executed boolean DEFAULT false,
  command_type text,
  command_result jsonb,
  
  -- User satisfaction and feedback
  user_satisfaction integer CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5),
  user_feedback text,
  helpful boolean,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.oracle_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oracle_logs
CREATE POLICY "Users can view their own Oracle logs" 
ON public.oracle_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Oracle logs" 
ON public.oracle_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Oracle logs" 
ON public.oracle_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Mentors can view logs from their assigned teams
CREATE POLICY "Mentors can view team Oracle logs"
ON public.oracle_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'mentor'
  ) 
  AND team_id IN (
    SELECT m.team_id FROM members m
    JOIN profiles p ON p.id = auth.uid()
    WHERE p.role = 'mentor'
  )
);

-- Create indexes for performance
CREATE INDEX idx_oracle_logs_user_id ON oracle_logs(user_id);
CREATE INDEX idx_oracle_logs_team_id ON oracle_logs(team_id);
CREATE INDEX idx_oracle_logs_created_at ON oracle_logs(created_at DESC);
CREATE INDEX idx_oracle_logs_query_type ON oracle_logs(query_type);

-- Enhanced profiles table for comprehensive onboarding data
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_technologies text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS learning_goals text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS communication_style text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_style text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mentorship_needs text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS project_goals text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expertise_areas text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS career_aspirations text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_learning_style text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS collaboration_preferences text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS industry_focus text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS networking_goals text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS challenge_areas text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS success_metrics text[];

-- Add Oracle-specific user context fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS oracle_interaction_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS oracle_last_interaction timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS oracle_preferences jsonb DEFAULT '{}'::jsonb;

-- Enhanced teams table for better Oracle context
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS problem_statement text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS solution_approach text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS target_audience text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS project_type text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS skills_needed text[];
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS tech_requirements text[];
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS team_size_needed integer DEFAULT 3;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS timeline_months integer DEFAULT 6;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS market_research text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS competitive_advantage text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS success_metrics text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS mentorship_areas text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS ai_summary text;