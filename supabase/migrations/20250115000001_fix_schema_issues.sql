-- Fix critical schema issues for functional buttons and connections

-- Fix messages table to use UUID for user IDs
ALTER TABLE public.messages 
ALTER COLUMN sender_id TYPE UUID USING sender_id::UUID,
ALTER COLUMN receiver_id TYPE UUID USING receiver_id::UUID;

-- Add missing columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS oracle_generated BOOLEAN DEFAULT false;

-- Create missing learning system tables
CREATE TABLE IF NOT EXISTS public.oracle_learning_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  oracle_log_id uuid REFERENCES public.oracle_logs(id) ON DELETE CASCADE,
  feedback_summary text,
  improvement_areas text[],
  learning_insights jsonb,
  suggested_confidence_adjustment text,
  suggested_search_strategy_adjustment text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oracle_user_learning_profiles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  last_feedback_analysis timestamp with time zone,
  total_feedback_count integer DEFAULT 0,
  average_satisfaction real,
  preferred_models text[],
  preferred_search_strategies text[],
  learning_goals_progress jsonb,
  collaboration_preferences jsonb,
  latest_insights jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oracle_model_preferences (
  model_name text PRIMARY KEY,
  total_queries integer DEFAULT 0,
  average_satisfaction real,
  helpful_rate real,
  last_updated timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oracle_optimization_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  analysis_summary text,
  matching_algorithm_improvements text[],
  suggested_parameters jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.oracle_learning_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_user_learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_model_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_optimization_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oracle_learning_insights
CREATE POLICY "Allow all authenticated users to read learning insights" 
ON public.oracle_learning_insights FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role to insert learning insights" 
ON public.oracle_learning_insights FOR INSERT 
WITH CHECK (true);

-- RLS Policies for oracle_user_learning_profiles
CREATE POLICY "Users can view their own learning profiles" 
ON public.oracle_user_learning_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning profiles" 
ON public.oracle_user_learning_profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Allow service role to insert/upsert learning profiles" 
ON public.oracle_user_learning_profiles FOR INSERT 
WITH CHECK (true);

-- RLS Policies for oracle_model_preferences
CREATE POLICY "Allow all authenticated users to read model preferences" 
ON public.oracle_model_preferences FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role to update model preferences" 
ON public.oracle_model_preferences FOR UPDATE 
USING (true);

CREATE POLICY "Allow service role to insert model preferences" 
ON public.oracle_model_preferences FOR INSERT 
WITH CHECK (true);

-- RLS Policies for oracle_optimization_insights
CREATE POLICY "Allow all authenticated users to read optimization insights" 
ON public.oracle_optimization_insights FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role to insert optimization insights" 
ON public.oracle_optimization_insights FOR INSERT 
WITH CHECK (true);

-- Fix connection_requests table to use proper UUID references
ALTER TABLE public.connection_requests 
ALTER COLUMN requester_id TYPE UUID USING requester_id::UUID,
ALTER COLUMN requested_id TYPE UUID USING requested_id::UUID;

-- Add missing columns to connection_requests
ALTER TABLE public.connection_requests 
ADD COLUMN IF NOT EXISTS oracle_confidence real DEFAULT 0.8;

-- Fix builder_connections table to use proper UUID references  
ALTER TABLE public.builder_connections 
ALTER COLUMN connector_id TYPE UUID USING connector_id::UUID,
ALTER COLUMN connectee_id TYPE UUID USING connectee_id::UUID;

-- Add missing columns to builder_connections
ALTER TABLE public.builder_connections 
ADD COLUMN IF NOT EXISTS oracle_confidence real DEFAULT 0.8,
ADD COLUMN IF NOT EXISTS oracle_reasoning text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_requester ON public.connection_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_requested ON public.connection_requests(requested_id);
CREATE INDEX IF NOT EXISTS idx_builder_connections_connector ON public.builder_connections(connector_id);
CREATE INDEX IF NOT EXISTS idx_builder_connections_connectee ON public.builder_connections(connectee_id);
