-- Add is_archived column to teams table
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Add created_by column if it doesn't exist
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add updated_at column with trigger for automatic updates
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_teams_is_archived ON public.teams(is_archived);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);
CREATE INDEX IF NOT EXISTS idx_teams_updated_at ON public.teams(updated_at);
