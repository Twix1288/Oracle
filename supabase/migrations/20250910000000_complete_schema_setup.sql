-- =====================================================
-- COMPLETE ORACLE DATABASE SCHEMA SETUP
-- This migration creates all required tables and functionality
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    access_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    stage TEXT DEFAULT 'ideation',
    visibility TEXT DEFAULT 'private',
    is_archived BOOLEAN DEFAULT FALSE,
    embedding_vector vector(1536)
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    bio TEXT,
    skills TEXT[],
    builder_level TEXT DEFAULT 'beginner',
    availability_hours INTEGER DEFAULT 0,
    learning_goals TEXT[],
    project_goals TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    embedding_vector vector(1536)
);

-- Members table
CREATE TABLE IF NOT EXISTS public.members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    team_id UUID REFERENCES public.teams(id),
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, team_id)
);

-- =====================================================
-- MESSAGING SYSTEM
-- =====================================================

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id),
    receiver_id UUID REFERENCES auth.users(id),
    team_id UUID REFERENCES public.teams(id),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'general',
    oracle_generated BOOLEAN DEFAULT FALSE,
    sender_role TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    embedding_vector vector(1536)
);

-- =====================================================
-- CONNECTION SYSTEM
-- =====================================================

-- Connection requests table
CREATE TABLE IF NOT EXISTS public.connection_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requester_id UUID REFERENCES auth.users(id),
    requested_id UUID REFERENCES auth.users(id),
    request_type TEXT DEFAULT 'connection',
    message TEXT,
    status TEXT DEFAULT 'pending',
    oracle_confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Builder connections table
CREATE TABLE IF NOT EXISTS public.builder_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    connector_id UUID REFERENCES auth.users(id),
    connectee_id UUID REFERENCES auth.users(id),
    connection_type TEXT DEFAULT 'collaboration',
    status TEXT DEFAULT 'active',
    oracle_confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ORACLE SYSTEM
-- =====================================================

-- Oracle logs table
CREATE TABLE IF NOT EXISTS public.oracle_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    team_id UUID REFERENCES public.teams(id),
    query TEXT NOT NULL,
    response TEXT,
    query_type TEXT DEFAULT 'general',
    confidence FLOAT,
    processing_time INTEGER,
    model_used TEXT,
    sources_used INTEGER DEFAULT 0,
    context_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    embedding_vector vector(1536)
);

-- Oracle feedback table
CREATE TABLE IF NOT EXISTS public.oracle_feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    oracle_log_id UUID REFERENCES public.oracle_logs(id),
    user_id UUID REFERENCES auth.users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    helpful BOOLEAN,
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Oracle learning insights table
CREATE TABLE IF NOT EXISTS public.oracle_learning_insights (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    oracle_log_id UUID REFERENCES public.oracle_logs(id),
    insight_type TEXT NOT NULL,
    insight_data JSONB,
    confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Oracle user learning profiles table
CREATE TABLE IF NOT EXISTS public.oracle_user_learning_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    learning_preferences JSONB,
    interaction_patterns JSONB,
    success_metrics JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Oracle model preferences table
CREATE TABLE IF NOT EXISTS public.oracle_model_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    preferred_models JSONB,
    performance_metrics JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Oracle optimization insights table
CREATE TABLE IF NOT EXISTS public.oracle_optimization_insights (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    insight_type TEXT NOT NULL,
    insight_data JSONB,
    confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PROJECT SYSTEM
-- =====================================================

-- Project updates table
CREATE TABLE IF NOT EXISTS public.project_updates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id),
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    update_type TEXT DEFAULT 'progress',
    visibility TEXT DEFAULT 'team',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    embedding_vector vector(1536)
);

-- Documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id),
    title TEXT NOT NULL,
    content TEXT,
    content_type TEXT DEFAULT 'text',
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    embedding_vector vector(1536)
);

-- =====================================================
-- COLLABORATION SYSTEM
-- =====================================================

-- Skill offers table
CREATE TABLE IF NOT EXISTS public.skill_offers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    skill TEXT NOT NULL,
    description TEXT,
    availability_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    embedding_vector vector(1536)
);

-- Workshops table
CREATE TABLE IF NOT EXISTS public.workshops (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    skill TEXT NOT NULL,
    max_participants INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    embedding_vector vector(1536)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Vector indexes for semantic search
CREATE INDEX IF NOT EXISTS idx_teams_embedding ON public.teams USING ivfflat (embedding_vector vector_l2_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_profiles_embedding ON public.profiles USING ivfflat (embedding_vector vector_l2_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_messages_embedding ON public.messages USING ivfflat (embedding_vector vector_l2_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_oracle_logs_embedding ON public.oracle_logs USING ivfflat (embedding_vector vector_l2_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_project_updates_embedding ON public.project_updates USING ivfflat (embedding_vector vector_l2_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON public.documents USING ivfflat (embedding_vector vector_l2_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_skill_offers_embedding ON public.skill_offers USING ivfflat (embedding_vector vector_l2_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_workshops_embedding ON public.workshops USING ivfflat (embedding_vector vector_l2_ops) WITH (lists = 100);

-- Standard indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_team ON public.messages(team_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_requester ON public.connection_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_requested ON public.connection_requests(requested_id);
CREATE INDEX IF NOT EXISTS idx_builder_connections_connector ON public.builder_connections(connector_id);
CREATE INDEX IF NOT EXISTS idx_builder_connections_connectee ON public.builder_connections(connectee_id);
CREATE INDEX IF NOT EXISTS idx_oracle_logs_user ON public.oracle_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_oracle_logs_team ON public.oracle_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_oracle_logs_created_at ON public.oracle_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_project_updates_team ON public.project_updates(team_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_user ON public.project_updates(user_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_learning_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_user_learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_model_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_optimization_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view teams they belong to" ON public.teams
    FOR SELECT USING (
        id IN (
            SELECT team_id FROM public.members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create teams" ON public.teams
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update teams they created" ON public.teams
    FOR UPDATE USING (auth.uid() = created_by);

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Members policies
CREATE POLICY "Users can view team members" ON public.members
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM public.members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join teams" ON public.members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages they sent or received" ON public.messages
    FOR SELECT USING (
        sender_id = auth.uid() OR receiver_id = auth.uid()
    );

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Connection requests policies
CREATE POLICY "Users can view their connection requests" ON public.connection_requests
    FOR SELECT USING (
        requester_id = auth.uid() OR requested_id = auth.uid()
    );

CREATE POLICY "Users can create connection requests" ON public.connection_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their connection requests" ON public.connection_requests
    FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = requested_id);

-- Builder connections policies
CREATE POLICY "Users can view their connections" ON public.builder_connections
    FOR SELECT USING (
        connector_id = auth.uid() OR connectee_id = auth.uid()
    );

CREATE POLICY "Users can create connections" ON public.builder_connections
    FOR INSERT WITH CHECK (auth.uid() = connector_id);

-- Oracle logs policies
CREATE POLICY "Users can view their oracle logs" ON public.oracle_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create oracle logs" ON public.oracle_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Oracle feedback policies
CREATE POLICY "Users can view their feedback" ON public.oracle_feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback" ON public.oracle_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Project updates policies
CREATE POLICY "Users can view team updates" ON public.project_updates
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM public.members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create updates for their teams" ON public.project_updates
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT team_id FROM public.members 
            WHERE user_id = auth.uid()
        )
    );

-- Documents policies
CREATE POLICY "Users can view team documents" ON public.documents
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM public.members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create documents for their teams" ON public.documents
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT team_id FROM public.members 
            WHERE user_id = auth.uid()
        )
    );

-- Skill offers policies
CREATE POLICY "Users can view all skill offers" ON public.skill_offers
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their skill offers" ON public.skill_offers
    FOR ALL USING (auth.uid() = user_id);

-- Workshops policies
CREATE POLICY "Users can view all workshops" ON public.workshops
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their workshops" ON public.workshops
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS FOR VECTOR OPERATIONS
-- =====================================================

-- Function to upsert embeddings
CREATE OR REPLACE FUNCTION public.upsert_embedding(
    table_name TEXT,
    record_id UUID,
    embedding vector(1536),
    content TEXT
)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('UPDATE %I SET embedding_vector = $1 WHERE id = $2', table_name)
    USING embedding, record_id;
    
    -- If no rows were updated, insert a new record
    IF NOT FOUND THEN
        EXECUTE format('INSERT INTO %I (id, embedding_vector) VALUES ($1, $2)', table_name)
        USING record_id, embedding;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function for GraphRAG search
CREATE OR REPLACE FUNCTION public.search_graph_rag(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.5,
    match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    table_name TEXT,
    content TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        'teams'::TEXT as table_name,
        COALESCE(t.name || ' ' || COALESCE(t.description, ''), '') as content,
        1 - (t.embedding_vector <=> query_embedding) as similarity
    FROM public.teams t
    WHERE t.embedding_vector IS NOT NULL
    AND 1 - (t.embedding_vector <=> query_embedding) > match_threshold
    
    UNION ALL
    
    SELECT 
        p.id,
        'profiles'::TEXT as table_name,
        COALESCE(p.full_name || ' ' || COALESCE(p.bio, ''), '') as content,
        1 - (p.embedding_vector <=> query_embedding) as similarity
    FROM public.profiles p
    WHERE p.embedding_vector IS NOT NULL
    AND 1 - (p.embedding_vector <=> query_embedding) > match_threshold
    
    UNION ALL
    
    SELECT 
        m.id,
        'messages'::TEXT as table_name,
        m.content,
        1 - (m.embedding_vector <=> query_embedding) as similarity
    FROM public.messages m
    WHERE m.embedding_vector IS NOT NULL
    AND 1 - (m.embedding_vector <=> query_embedding) > match_threshold
    
    UNION ALL
    
    SELECT 
        pu.id,
        'project_updates'::TEXT as table_name,
        COALESCE(pu.title || ' ' || pu.content, '') as content,
        1 - (pu.embedding_vector <=> query_embedding) as similarity
    FROM public.project_updates pu
    WHERE pu.embedding_vector IS NOT NULL
    AND 1 - (pu.embedding_vector <=> query_embedding) > match_threshold
    
    UNION ALL
    
    SELECT 
        d.id,
        'documents'::TEXT as table_name,
        COALESCE(d.title || ' ' || COALESCE(d.content, ''), '') as content,
        1 - (d.embedding_vector <=> query_embedding) as similarity
    FROM public.documents d
    WHERE d.embedding_vector IS NOT NULL
    AND 1 - (d.embedding_vector <=> query_embedding) > match_threshold
    
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function for team neighbors
CREATE OR REPLACE FUNCTION public.team_neighbors(
    team_id UUID,
    neighbor_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    neighbor_id UUID,
    similarity FLOAT
) AS $$
DECLARE
    team_embedding vector(1536);
BEGIN
    -- Get the team's embedding
    SELECT embedding_vector INTO team_embedding
    FROM public.teams
    WHERE id = team_id;
    
    IF team_embedding IS NULL THEN
        RETURN;
    END IF;
    
    -- Find similar teams
    RETURN QUERY
    SELECT 
        t.id as neighbor_id,
        1 - (t.embedding_vector <=> team_embedding) as similarity
    FROM public.teams t
    WHERE t.id != team_id
    AND t.embedding_vector IS NOT NULL
    ORDER BY similarity DESC
    LIMIT neighbor_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR AUTO-VECTORIZATION
-- =====================================================

-- Function to generate embeddings
CREATE OR REPLACE FUNCTION public.generate_embedding(text_content TEXT)
RETURNS vector(1536) AS $$
BEGIN
    -- This would call the OpenAI API in a real implementation
    -- For now, return a zero vector
    RETURN array_fill(0, ARRAY[1536])::vector(1536);
END;
$$ LANGUAGE plpgsql;

-- Trigger function for auto-vectorization
CREATE OR REPLACE FUNCTION public.auto_vectorize()
RETURNS TRIGGER AS $$
DECLARE
    content_text TEXT;
    embedding vector(1536);
BEGIN
    -- Extract content based on table
    CASE TG_TABLE_NAME
        WHEN 'teams' THEN
            content_text := COALESCE(NEW.name || ' ' || COALESCE(NEW.description, ''), '');
        WHEN 'profiles' THEN
            content_text := COALESCE(NEW.full_name || ' ' || COALESCE(NEW.bio, ''), '');
        WHEN 'messages' THEN
            content_text := NEW.content;
        WHEN 'project_updates' THEN
            content_text := COALESCE(NEW.title || ' ' || NEW.content, '');
        WHEN 'documents' THEN
            content_text := COALESCE(NEW.title || ' ' || COALESCE(NEW.content, ''), '');
        WHEN 'oracle_logs' THEN
            content_text := COALESCE(NEW.query || ' ' || COALESCE(NEW.response, ''), '');
        WHEN 'skill_offers' THEN
            content_text := COALESCE(NEW.skill || ' ' || COALESCE(NEW.description, ''), '');
        WHEN 'workshops' THEN
            content_text := COALESCE(NEW.title || ' ' || COALESCE(NEW.description, ''), '');
        ELSE
            content_text := '';
    END CASE;
    
    -- Generate embedding if content exists
    IF content_text IS NOT NULL AND LENGTH(TRIM(content_text)) > 0 THEN
        embedding := public.generate_embedding(content_text);
        NEW.embedding_vector := embedding;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-vectorization
CREATE TRIGGER team_auto_vectorize
    BEFORE INSERT OR UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_vectorize();

CREATE TRIGGER profile_auto_vectorize
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_vectorize();

CREATE TRIGGER message_auto_vectorize
    BEFORE INSERT OR UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_vectorize();

CREATE TRIGGER project_update_auto_vectorize
    BEFORE INSERT OR UPDATE ON public.project_updates
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_vectorize();

CREATE TRIGGER document_auto_vectorize
    BEFORE INSERT OR UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_vectorize();

CREATE TRIGGER oracle_log_auto_vectorize
    BEFORE INSERT OR UPDATE ON public.oracle_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_vectorize();

CREATE TRIGGER skill_offer_auto_vectorize
    BEFORE INSERT OR UPDATE ON public.skill_offers
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_vectorize();

CREATE TRIGGER workshop_auto_vectorize
    BEFORE INSERT OR UPDATE ON public.workshops
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_vectorize();

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample teams
INSERT INTO public.teams (id, name, description, created_by, stage, visibility) VALUES
    (uuid_generate_v4(), 'AI Builders United', 'A community of AI enthusiasts building the future', auth.uid(), 'development', 'public'),
    (uuid_generate_v4(), 'Web3 Pioneers', 'Exploring blockchain and decentralized technologies', auth.uid(), 'ideation', 'public'),
    (uuid_generate_v4(), 'Startup Accelerator', 'Helping early-stage startups grow and scale', auth.uid(), 'growth', 'private')
ON CONFLICT (id) DO NOTHING;

-- Insert sample skill offers
INSERT INTO public.skill_offers (user_id, skill, description, availability_hours) VALUES
    (auth.uid(), 'React Development', 'Expert in React, TypeScript, and modern frontend development', 20),
    (auth.uid(), 'AI/ML Engineering', 'Machine learning, deep learning, and AI model development', 15),
    (auth.uid(), 'Product Management', 'Strategic product planning and team leadership', 10)
ON CONFLICT DO NOTHING;

-- Insert sample workshops
INSERT INTO public.workshops (user_id, title, description, skill, max_participants) VALUES
    (auth.uid(), 'React Masterclass', 'Learn advanced React patterns and best practices', 'React Development', 25),
    (auth.uid(), 'AI Fundamentals', 'Introduction to machine learning and AI concepts', 'AI/ML Engineering', 30),
    (auth.uid(), 'Product Strategy Workshop', 'Building successful product strategies', 'Product Management', 20)
ON CONFLICT DO NOTHING;
