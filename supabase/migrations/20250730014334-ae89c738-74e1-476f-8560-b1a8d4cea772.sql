-- Fix the role_visibility column type issue
CREATE TABLE public.documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI ada-002 embedding size
    metadata JSONB DEFAULT '{}',
    role_visibility user_role[] DEFAULT ARRAY['builder'::user_role, 'mentor'::user_role, 'lead'::user_role, 'guest'::user_role],
    source_type TEXT, -- 'update', 'mentor_note', 'faq', 'resource'
    source_reference UUID, -- reference to updates, teams, etc.
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and create policies
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to documents" ON public.documents FOR UPDATE USING (true);

-- Create indexes
CREATE INDEX idx_documents_embedding ON public.documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_documents_role_visibility ON public.documents USING GIN(role_visibility);

-- Create trigger for documents
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();