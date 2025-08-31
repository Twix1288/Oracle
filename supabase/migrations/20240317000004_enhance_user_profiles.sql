-- Create enum types for better data consistency
CREATE TYPE user_role AS ENUM ('builder', 'mentor', 'lead', 'guest');
CREATE TYPE experience_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE user_skill AS ENUM (
  'frontend',
  'backend',
  'fullstack',
  'ui_ux',
  'devops',
  'mobile',
  'data',
  'ai_ml',
  'blockchain',
  'security'
);

-- Enhance the members table with additional fields
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS github_username TEXT,
ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
ADD COLUMN IF NOT EXISTS skills user_skill[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS experience_level experience_level,
ADD COLUMN IF NOT EXISTS preferred_technologies TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS learning_goals TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS communication_style TEXT,
ADD COLUMN IF NOT EXISTS work_style TEXT,
ADD COLUMN IF NOT EXISTS availability TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_data JSONB,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Create a function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_member_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update last_updated
DROP TRIGGER IF EXISTS update_member_last_updated ON public.members;
CREATE TRIGGER update_member_last_updated
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION update_member_last_updated();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_members_skills ON public.members USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_members_experience_level ON public.members (experience_level);
CREATE INDEX IF NOT EXISTS idx_members_onboarding_completed ON public.members (onboarding_completed);

-- Add RLS policies
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can read own data"
ON public.members FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "Users can update own data"
ON public.members FOR UPDATE
USING (auth.uid() = id);

-- Allow leads to read all data
CREATE POLICY "Leads can read all data"
ON public.members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.members
        WHERE id = auth.uid() AND role = 'lead'
    )
);

-- Allow leads to update all data
CREATE POLICY "Leads can update all data"
ON public.members FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.members
        WHERE id = auth.uid() AND role = 'lead'
    )
);
