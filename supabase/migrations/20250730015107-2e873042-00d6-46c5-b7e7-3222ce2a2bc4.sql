-- Create enum types first
CREATE TYPE public.user_role AS ENUM ('builder', 'mentor', 'lead', 'guest');
CREATE TYPE public.update_type AS ENUM ('daily', 'milestone', 'mentor_meeting');
CREATE TYPE public.team_stage AS ENUM ('ideation', 'development', 'testing', 'launch', 'growth');

-- Teams table
CREATE TABLE public.teams (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    stage team_stage DEFAULT 'ideation',
    tags TEXT[],
    assigned_mentor_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Members table
CREATE TABLE public.members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    role user_role NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Updates table for progress tracking
CREATE TABLE public.updates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    type update_type NOT NULL,
    created_by TEXT, -- member name since no auth
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Events table
CREATE TABLE public.events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    tags TEXT[],
    attendance TEXT[], -- array of member names
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Documents table for RAG system (without vector for now)
CREATE TABLE public.documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    role_visibility user_role[] DEFAULT ARRAY['builder'::user_role, 'mentor'::user_role, 'lead'::user_role, 'guest'::user_role],
    source_type TEXT, -- 'update', 'mentor_note', 'faq', 'resource'
    source_reference UUID, -- reference to updates, teams, etc.
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Team status summary table (auto-updated)
CREATE TABLE public.team_status (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL UNIQUE,
    current_status TEXT,
    last_update TIMESTAMP WITH TIME ZONE,
    pending_actions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_status ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required)
CREATE POLICY "Allow public read access to teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to teams" ON public.teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to teams" ON public.teams FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to members" ON public.members FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to updates" ON public.updates FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to updates" ON public.updates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to updates" ON public.updates FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to events" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to events" ON public.events FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to documents" ON public.documents FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to team_status" ON public.team_status FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to team_status" ON public.team_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to team_status" ON public.team_status FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX idx_updates_team_id ON public.updates(team_id);
CREATE INDEX idx_updates_created_at ON public.updates(created_at);
CREATE INDEX idx_members_team_id ON public.members(team_id);
CREATE INDEX idx_documents_role_visibility ON public.documents USING GIN(role_visibility);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_updates_updated_at BEFORE UPDATE ON public.updates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_team_status_updated_at BEFORE UPDATE ON public.team_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-update team status when updates are added
CREATE OR REPLACE FUNCTION public.update_team_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.team_status (team_id, current_status, last_update)
    VALUES (NEW.team_id, LEFT(NEW.content, 200), NEW.created_at)
    ON CONFLICT (team_id) 
    DO UPDATE SET 
        current_status = LEFT(NEW.content, 200),
        last_update = NEW.created_at,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update team status on new updates
CREATE TRIGGER update_team_status_on_update 
    AFTER INSERT ON public.updates 
    FOR EACH ROW EXECUTE FUNCTION public.update_team_status();