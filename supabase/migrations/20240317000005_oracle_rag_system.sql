-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table for RAG system
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    source_type TEXT NOT NULL,
    role_visibility TEXT[] DEFAULT '{}'::text[],
    team_visibility TEXT[] DEFAULT '{}'::text[],
    embedding vector(1536),  -- OpenAI's text-embedding-ada-002 dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    communication_style TEXT,
    work_style TEXT,
    availability TEXT,
    timezone TEXT,
    learning_goals TEXT,
    interests TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create oracle logs table for learning
CREATE TABLE IF NOT EXISTS public.oracle_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    query TEXT NOT NULL,
    context TEXT,
    response TEXT NOT NULL,
    feedback JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_source_type ON public.documents(source_type);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON public.documents USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_documents_role_visibility ON public.documents USING gin(role_visibility);
CREATE INDEX IF NOT EXISTS idx_documents_team_visibility ON public.documents USING gin(team_visibility);
CREATE INDEX IF NOT EXISTS idx_oracle_logs_user_id ON public.oracle_logs(user_id);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read their own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can read documents based on role and team"
ON public.documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.members
        WHERE id = auth.uid()
        AND (
            role = ANY(documents.role_visibility)
            OR team_id = ANY(documents.team_visibility::uuid[])
        )
    )
);

CREATE POLICY "Users can read their own logs"
ON public.oracle_logs FOR SELECT
USING (auth.uid() = user_id);

-- Create function for similarity search
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    user_role text DEFAULT NULL,
    team_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        documents.id,
        documents.content,
        documents.metadata,
        1 - (documents.embedding <=> query_embedding) AS similarity
    FROM documents
    WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
    AND (
        user_role IS NULL 
        OR user_role = ANY(documents.role_visibility)
        OR team_id::text = ANY(documents.team_visibility)
    )
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;
