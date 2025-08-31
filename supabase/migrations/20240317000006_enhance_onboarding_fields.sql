-- Add enhanced onboarding fields to members table for Oracle RAG system
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS learning_goals TEXT,
ADD COLUMN IF NOT EXISTS preferred_tech_stack TEXT,
ADD COLUMN IF NOT EXISTS collaboration_style TEXT,
ADD COLUMN IF NOT EXISTS availability TEXT,
ADD COLUMN IF NOT EXISTS mentorship_areas TEXT,
ADD COLUMN IF NOT EXISTS project_timeline TEXT,
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS success_metrics TEXT;

-- Add index for better query performance on skills
CREATE INDEX IF NOT EXISTS idx_members_skills ON public.members USING GIN (skills);

-- Add index for role-based queries
CREATE INDEX IF NOT EXISTS idx_members_role ON public.members (role);

-- Add index for team assignments
CREATE INDEX IF NOT EXISTS idx_members_team_id ON public.members (team_id);

-- Create a function to search members by skills
CREATE OR REPLACE FUNCTION search_members_by_skills(search_skills TEXT[])
RETURNS TABLE (
    id UUID,
    name TEXT,
    role user_role,
    team_id UUID,
    skills TEXT[],
    experience TEXT,
    learning_goals TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.name,
        m.role,
        m.team_id,
        m.skills,
        m.experience,
        m.learning_goals
    FROM public.members m
    WHERE m.skills && search_skills  -- Check if any skills overlap
    ORDER BY 
        array_length(array(
            SELECT unnest(m.skills) 
            INTERSECT 
            SELECT unnest(search_skills)
        ), 1) DESC,  -- Order by number of matching skills
        m.experience DESC;  -- Then by experience
END;
$$ LANGUAGE plpgsql;

-- Create a function to get team members with specific skills
CREATE OR REPLACE FUNCTION get_team_members_with_skills(team_uuid UUID, required_skills TEXT[])
RETURNS TABLE (
    id UUID,
    name TEXT,
    role user_role,
    skills TEXT[],
    experience TEXT,
    learning_goals TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.name,
        m.role,
        m.skills,
        m.experience,
        m.learning_goals
    FROM public.members m
    WHERE m.team_id = team_uuid 
    AND m.skills && required_skills
    ORDER BY 
        array_length(array(
            SELECT unnest(m.skills) 
            INTERSECT 
            SELECT unnest(required_skills)
        ), 1) DESC;
END;
$$ LANGUAGE plpgsql;
