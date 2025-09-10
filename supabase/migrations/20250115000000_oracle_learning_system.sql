-- Oracle Learning System Tables
-- This migration creates tables for the self-improving Oracle system

-- Create oracle_feedback table for detailed feedback collection
CREATE TABLE public.oracle_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  oracle_log_id uuid REFERENCES oracle_logs(id) ON DELETE CASCADE,
  satisfaction_score integer NOT NULL CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
  helpful boolean NOT NULL,
  response_quality text NOT NULL CHECK (response_quality IN ('excellent', 'good', 'average', 'poor')),
  accuracy text NOT NULL CHECK (accuracy IN ('very_accurate', 'accurate', 'somewhat_accurate', 'inaccurate')),
  relevance text NOT NULL CHECK (relevance IN ('very_relevant', 'relevant', 'somewhat_relevant', 'irrelevant')),
  feedback_text text,
  improvement_suggestions text[],
  model_used text,
  confidence_score real,
  query_text text,
  response_text text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create oracle_learning_insights table for storing analysis results
CREATE TABLE public.oracle_learning_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insights_data jsonb NOT NULL,
  generated_at timestamp with time zone DEFAULT now(),
  action text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create oracle_model_preferences table for tracking model performance
CREATE TABLE public.oracle_model_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name text NOT NULL,
  performance_score real NOT NULL,
  helpful_rate real NOT NULL,
  total_queries integer DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(model_name)
);

-- Create oracle_optimization_insights table for collaboration optimization
CREATE TABLE public.oracle_optimization_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  optimization_type text NOT NULL,
  insights_data jsonb NOT NULL,
  generated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Create oracle_success_patterns table for tracking what works
CREATE TABLE public.oracle_success_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_type text NOT NULL, -- 'collaboration', 'project_management', 'learning', etc.
  pattern_data jsonb NOT NULL,
  success_rate real NOT NULL,
  sample_size integer NOT NULL,
  last_observed timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Create oracle_user_learning_profiles table for personalized learning
CREATE TABLE public.oracle_user_learning_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  learning_preferences jsonb,
  successful_interaction_patterns jsonb,
  improvement_areas text[],
  preferred_response_style text,
  satisfaction_trends jsonb,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.oracle_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_learning_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_model_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_optimization_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_success_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_user_learning_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oracle_feedback
CREATE POLICY "Users can view their own feedback" 
ON public.oracle_feedback 
FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM oracle_logs WHERE id = oracle_log_id));

CREATE POLICY "Users can insert their own feedback" 
ON public.oracle_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM oracle_logs WHERE id = oracle_log_id));

-- RLS Policies for oracle_learning_insights (admin only for now)
CREATE POLICY "Only authenticated users can view learning insights" 
ON public.oracle_learning_insights 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- RLS Policies for oracle_model_preferences (read-only for users)
CREATE POLICY "Users can view model preferences" 
ON public.oracle_model_preferences 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- RLS Policies for oracle_optimization_insights (read-only for users)
CREATE POLICY "Users can view optimization insights" 
ON public.oracle_optimization_insights 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- RLS Policies for oracle_success_patterns (read-only for users)
CREATE POLICY "Users can view success patterns" 
ON public.oracle_success_patterns 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- RLS Policies for oracle_user_learning_profiles
CREATE POLICY "Users can view their own learning profile" 
ON public.oracle_user_learning_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning profile" 
ON public.oracle_user_learning_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning profile" 
ON public.oracle_user_learning_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_oracle_feedback_satisfaction ON public.oracle_feedback(satisfaction_score);
CREATE INDEX idx_oracle_feedback_helpful ON public.oracle_feedback(helpful);
CREATE INDEX idx_oracle_feedback_created_at ON public.oracle_feedback(created_at);
CREATE INDEX idx_oracle_learning_insights_action ON public.oracle_learning_insights(action);
CREATE INDEX idx_oracle_learning_insights_generated_at ON public.oracle_learning_insights(generated_at);
CREATE INDEX idx_oracle_model_preferences_performance ON public.oracle_model_preferences(performance_score);
CREATE INDEX idx_oracle_success_patterns_type ON public.oracle_success_patterns(pattern_type);
CREATE INDEX idx_oracle_success_patterns_success_rate ON public.oracle_success_patterns(success_rate);
CREATE INDEX idx_oracle_user_learning_profiles_user_id ON public.oracle_user_learning_profiles(user_id);

-- Create function to automatically update user learning profiles
CREATE OR REPLACE FUNCTION update_user_learning_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user learning profile when feedback is submitted
  INSERT INTO oracle_user_learning_profiles (
    user_id,
    learning_preferences,
    successful_interaction_patterns,
    improvement_areas,
    last_updated
  )
  VALUES (
    (SELECT user_id FROM oracle_logs WHERE id = NEW.oracle_log_id),
    jsonb_build_object(
      'preferred_response_quality', NEW.response_quality,
      'preferred_accuracy', NEW.accuracy,
      'preferred_relevance', NEW.relevance
    ),
    jsonb_build_object(
      'high_satisfaction_queries', CASE WHEN NEW.satisfaction_score >= 4 THEN 1 ELSE 0 END,
      'helpful_responses', CASE WHEN NEW.helpful THEN 1 ELSE 0 END
    ),
    CASE 
      WHEN NEW.satisfaction_score <= 2 THEN ARRAY[NEW.response_quality, NEW.accuracy, NEW.relevance]
      ELSE ARRAY[]::text[]
    END,
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    learning_preferences = COALESCE(oracle_user_learning_profiles.learning_preferences, '{}'::jsonb) || 
                          jsonb_build_object(
                            'preferred_response_quality', NEW.response_quality,
                            'preferred_accuracy', NEW.accuracy,
                            'preferred_relevance', NEW.relevance
                          ),
    successful_interaction_patterns = COALESCE(oracle_user_learning_profiles.successful_interaction_patterns, '{}'::jsonb) || 
                                     jsonb_build_object(
                                       'high_satisfaction_queries', 
                                       COALESCE((oracle_user_learning_profiles.successful_interaction_patterns->>'high_satisfaction_queries')::integer, 0) + 
                                       CASE WHEN NEW.satisfaction_score >= 4 THEN 1 ELSE 0 END,
                                       'helpful_responses', 
                                       COALESCE((oracle_user_learning_profiles.successful_interaction_patterns->>'helpful_responses')::integer, 0) + 
                                       CASE WHEN NEW.helpful THEN 1 ELSE 0 END
                                     ),
    improvement_areas = CASE 
      WHEN NEW.satisfaction_score <= 2 THEN 
        array_cat(COALESCE(oracle_user_learning_profiles.improvement_areas, ARRAY[]::text[]), 
                  ARRAY[NEW.response_quality, NEW.accuracy, NEW.relevance])
      ELSE oracle_user_learning_profiles.improvement_areas
    END,
    last_updated = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update learning profiles
CREATE TRIGGER trigger_update_user_learning_profile
  AFTER INSERT ON oracle_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_user_learning_profile();

-- Create function to calculate Oracle performance metrics
CREATE OR REPLACE FUNCTION get_oracle_performance_metrics()
RETURNS TABLE (
  total_interactions bigint,
  avg_satisfaction numeric,
  helpful_rate numeric,
  model_performance jsonb,
  recent_trends jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_interactions,
    ROUND(AVG(ol.user_satisfaction)::numeric, 2) as avg_satisfaction,
    ROUND((COUNT(*) FILTER (WHERE ol.helpful = true)::numeric / COUNT(*)) * 100, 2) as helpful_rate,
    (
      SELECT jsonb_object_agg(model_used, model_stats)
      FROM (
        SELECT 
          model_used,
          jsonb_build_object(
            'total_queries', COUNT(*),
            'avg_satisfaction', ROUND(AVG(user_satisfaction)::numeric, 2),
            'helpful_rate', ROUND((COUNT(*) FILTER (WHERE helpful = true)::numeric / COUNT(*)) * 100, 2)
          ) as model_stats
        FROM oracle_logs 
        WHERE model_used IS NOT NULL
        GROUP BY model_used
      ) model_data
    ) as model_performance,
    (
      SELECT jsonb_build_object(
        'daily_avg', ROUND(AVG(user_satisfaction)::numeric, 2),
        'trend_direction', 
          CASE 
            WHEN AVG(user_satisfaction) > LAG(AVG(user_satisfaction)) OVER (ORDER BY DATE(created_at)) THEN 'improving'
            WHEN AVG(user_satisfaction) < LAG(AVG(user_satisfaction)) OVER (ORDER BY DATE(created_at)) THEN 'declining'
            ELSE 'stable'
          END
      )
      FROM oracle_logs 
      WHERE created_at >= NOW() - INTERVAL '7 days'
    ) as recent_trends
  FROM oracle_logs ol
  WHERE ol.user_satisfaction IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to get personalized Oracle suggestions
CREATE OR REPLACE FUNCTION get_personalized_oracle_suggestions(user_uuid uuid)
RETURNS TABLE (
  suggestion_type text,
  suggestion_data jsonb,
  confidence_score real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'learning_preferences'::text as suggestion_type,
    ulp.learning_preferences as suggestion_data,
    0.8::real as confidence_score
  FROM oracle_user_learning_profiles ulp
  WHERE ulp.user_id = user_uuid
  
  UNION ALL
  
  SELECT 
    'success_patterns'::text as suggestion_type,
    sp.pattern_data as suggestion_data,
    sp.success_rate as confidence_score
  FROM oracle_success_patterns sp
  WHERE sp.success_rate > 0.7
  ORDER BY confidence_score DESC;
END;
$$ LANGUAGE plpgsql;
