-- Add all missing columns needed for Oracle integration and new onboarding system
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS personal_goals text[],
ADD COLUMN IF NOT EXISTS project_vision text,
ADD COLUMN IF NOT EXISTS help_needed text[],
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS github_url text,
ADD COLUMN IF NOT EXISTS portfolio_url text;