-- Create necessary tables if they don't exist
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    stage TEXT NOT NULL DEFAULT 'ideation',
    access_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    assigned_mentor_id UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'builder',
    team_id UUID REFERENCES public.teams(id),
    access_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id),
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'daily',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.team_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) UNIQUE,
    current_status TEXT,
    pending_actions TEXT[],
    last_update TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert some initial teams
INSERT INTO public.teams (name, description, stage) VALUES
('Team Alpha', 'Frontend development team focusing on user experience and modern UI', 'development'),
('Team Beta', 'Backend infrastructure team building scalable services', 'ideation'),
('Team Gamma', 'Full-stack team working on the core product features', 'testing'),
('Team Delta', 'Mobile app development team', 'development'),
('Team Epsilon', 'DevOps and infrastructure team', 'launch');

-- Create initial team statuses
INSERT INTO public.team_status (team_id, current_status, pending_actions)
SELECT 
    id as team_id,
    CASE 
        WHEN stage = 'ideation' THEN 'Defining project scope and requirements'
        WHEN stage = 'development' THEN 'Building core features'
        WHEN stage = 'testing' THEN 'Testing with early users'
        WHEN stage = 'launch' THEN 'Preparing for public launch'
        ELSE 'Planning next sprint'
    END as current_status,
    ARRAY['Set up development environment', 'Review project documentation', 'Join team meetings'] as pending_actions
FROM public.teams;

-- Create some initial updates
INSERT INTO public.updates (team_id, content, type)
SELECT 
    id as team_id,
    CASE 
        WHEN stage = 'ideation' THEN 'Team formed and initial planning completed'
        WHEN stage = 'development' THEN 'Core features development in progress'
        WHEN stage = 'testing' THEN 'Started user testing phase'
        WHEN stage = 'launch' THEN 'Preparing launch materials'
        ELSE 'Sprint planning completed'
    END as content,
    'milestone' as type
FROM public.teams;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_stage ON public.teams(stage);
CREATE INDEX IF NOT EXISTS idx_members_role ON public.members(role);
CREATE INDEX IF NOT EXISTS idx_members_team_id ON public.members(team_id);
CREATE INDEX IF NOT EXISTS idx_updates_team_id ON public.updates(team_id);
CREATE INDEX IF NOT EXISTS idx_updates_created_at ON public.updates(created_at);

-- Grant necessary permissions
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.teams
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON public.members
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON public.updates
    FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON public.team_status
    FOR SELECT USING (true);

-- Allow leads to modify data
CREATE POLICY "Enable full access for leads" ON public.teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE id = auth.uid() AND role = 'lead'
        )
    );

CREATE POLICY "Enable full access for leads" ON public.members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE id = auth.uid() AND role = 'lead'
        )
    );

CREATE POLICY "Enable full access for leads" ON public.updates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE id = auth.uid() AND role = 'lead'
        )
    );

CREATE POLICY "Enable full access for leads" ON public.team_status
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE id = auth.uid() AND role = 'lead'
        )
    );
