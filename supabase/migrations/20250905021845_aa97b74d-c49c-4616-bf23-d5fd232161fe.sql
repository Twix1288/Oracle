-- Add ai_summary column to teams table for AI-generated project summaries
ALTER TABLE public.teams 
ADD COLUMN ai_summary TEXT;