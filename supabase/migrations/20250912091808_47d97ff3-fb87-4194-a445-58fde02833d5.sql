-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  skills TEXT[],
  role TEXT DEFAULT 'builder',
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  embedding_vector vector(1536)
);

-- Create oracle_logs table
CREATE TABLE public.oracle_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID,
  query TEXT NOT NULL,
  response JSONB NOT NULL,
  query_type TEXT NOT NULL DEFAULT 'suggest',
  model_used TEXT,
  confidence FLOAT,
  sources INTEGER DEFAULT 0,
  context_used BOOLEAN DEFAULT true,
  similarity_score FLOAT,
  graph_nodes JSONB,
  graph_relationships JSONB,
  knowledge_graph JSONB,
  command_executed BOOLEAN DEFAULT false,
  command_result JSONB,
  helpful BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  embedding_vector vector(1536)
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  team_creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  embedding_vector vector(1536)
);

-- Create team members junction table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  embedding_vector vector(1536)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  embedding_vector vector(1536)
);

-- Create progress_entries table
CREATE TABLE public.progress_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  embedding_vector vector(1536)
);

-- Create project_updates table
CREATE TABLE public.project_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  embedding_vector vector(1536)
);

-- Create updates table
CREATE TABLE public.updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'general',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  embedding_vector vector(1536)
);

-- Create builder_challenges table
CREATE TABLE public.builder_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'medium',
  tags TEXT[],
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  embedding_vector vector(1536)
);

-- Create builder_conversations table
CREATE TABLE public.builder_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  participants UUID[] NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  embedding_vector vector(1536)
);

-- Create skill_offers table
CREATE TABLE public.skill_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  availability TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  embedding_vector vector(1536)
);

-- Create workshops table
CREATE TABLE public.workshops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendees JSONB DEFAULT '[]'::jsonb,
  max_attendees INTEGER,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  embedding_vector vector(1536)
);

-- Create feed_interactions table
CREATE TABLE public.feed_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_item_id UUID NOT NULL,
  type TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_interests table
CREATE TABLE public.project_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Create collaboration_proposals table
CREATE TABLE public.collaboration_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposal_type TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create connection_requests table
CREATE TABLE public.connection_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, requested_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for oracle_logs
CREATE POLICY "Users can view their own oracle logs" ON public.oracle_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own oracle logs" ON public.oracle_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for teams
CREATE POLICY "Teams are viewable by everyone" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Team creators can update their teams" ON public.teams FOR UPDATE USING (auth.uid() = team_creator_id);
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = team_creator_id);

-- Create RLS policies for team_members
CREATE POLICY "Team members are viewable by everyone" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Team members can be inserted by team creators or the user themselves" ON public.team_members FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND team_creator_id = auth.uid())
);

-- Create RLS policies for other tables
CREATE POLICY "Documents are viewable by team members and creators" ON public.documents FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = documents.team_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Messages are viewable by team members" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = messages.team_id AND user_id = auth.uid())
);
CREATE POLICY "Team members can send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND 
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = messages.team_id AND user_id = auth.uid())
);

-- Create remaining policies for other tables
CREATE POLICY "Progress entries are viewable by team members and creators" ON public.progress_entries FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = progress_entries.team_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create progress entries" ON public.progress_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Project updates are viewable by everyone" ON public.project_updates FOR SELECT USING (true);
CREATE POLICY "Team members can create project updates" ON public.project_updates FOR INSERT WITH CHECK (
  auth.uid() = author_id AND 
  EXISTS (SELECT 1 FROM public.team_members WHERE team_id = project_updates.team_id AND user_id = auth.uid())
);

CREATE POLICY "Updates are viewable by everyone" ON public.updates FOR SELECT USING (true);
CREATE POLICY "Users can create their own updates" ON public.updates FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Builder challenges are viewable by everyone" ON public.builder_challenges FOR SELECT USING (true);
CREATE POLICY "Users can create builder challenges" ON public.builder_challenges FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Builder conversations are viewable by participants" ON public.builder_conversations FOR SELECT USING (
  auth.uid() = creator_id OR auth.uid() = ANY(participants)
);
CREATE POLICY "Users can create builder conversations" ON public.builder_conversations FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Skill offers are viewable by everyone" ON public.skill_offers FOR SELECT USING (true);
CREATE POLICY "Users can create their own skill offers" ON public.skill_offers FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Workshops are viewable by everyone" ON public.workshops FOR SELECT USING (true);
CREATE POLICY "Users can create workshops" ON public.workshops FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Feed interactions are viewable by the user" ON public.feed_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create feed interactions" ON public.feed_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Notifications can be created for users" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Project interests are viewable by project creators and interested users" ON public.project_interests FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.teams WHERE id = project_id AND team_creator_id = auth.uid())
);
CREATE POLICY "Users can express interest in projects" ON public.project_interests FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Collaboration proposals are viewable by proposer and target" ON public.collaboration_proposals FOR SELECT USING (
  auth.uid() = proposer_id OR auth.uid() = target_id
);
CREATE POLICY "Users can create collaboration proposals" ON public.collaboration_proposals FOR INSERT WITH CHECK (auth.uid() = proposer_id);

CREATE POLICY "Connection requests are viewable by requester and requested" ON public.connection_requests FOR SELECT USING (
  auth.uid() = requester_id OR auth.uid() = requested_id
);
CREATE POLICY "Users can create connection requests" ON public.connection_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Create indexes for better performance
CREATE INDEX idx_profiles_embedding ON public.profiles USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_oracle_logs_embedding ON public.oracle_logs USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_teams_embedding ON public.teams USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_documents_embedding ON public.documents USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_messages_embedding ON public.messages USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_progress_entries_embedding ON public.progress_entries USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_project_updates_embedding ON public.project_updates USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_progress_entries_updated_at BEFORE UPDATE ON public.progress_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create RPC functions
CREATE OR REPLACE FUNCTION public.upsert_embedding(tablename text, row_id uuid, emb double precision[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE tablename
    WHEN 'profiles' THEN
      UPDATE public.profiles SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'oracle_logs' THEN
      UPDATE public.oracle_logs SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'teams' THEN
      UPDATE public.teams SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'documents' THEN
      UPDATE public.documents SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'messages' THEN
      UPDATE public.messages SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'progress_entries' THEN
      UPDATE public.progress_entries SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'project_updates' THEN
      UPDATE public.project_updates SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'updates' THEN
      UPDATE public.updates SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'builder_challenges' THEN
      UPDATE public.builder_challenges SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'builder_conversations' THEN
      UPDATE public.builder_conversations SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'skill_offers' THEN
      UPDATE public.skill_offers SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'workshops' THEN
      UPDATE public.workshops SET embedding_vector = emb::vector WHERE id = row_id;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_graph_rag(q_emb double precision[], k integer DEFAULT 5)
RETURNS TABLE(src_type text, id uuid, title text, snippet text, distance double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  (
    SELECT 'document' as src_type, d.id, d.title, COALESCE(LEFT(d.content, 200), '') as snippet, 
           d.embedding_vector <=> q_emb::vector as distance
    FROM public.documents d
    WHERE d.embedding_vector IS NOT NULL
    ORDER BY d.embedding_vector <=> q_emb::vector
    LIMIT k
  )
  UNION ALL
  (
    SELECT 'profile' as src_type, p.id, COALESCE(p.display_name, p.full_name, 'User Profile') as title, 
           COALESCE(p.bio, '') as snippet, p.embedding_vector <=> q_emb::vector as distance
    FROM public.profiles p
    WHERE p.embedding_vector IS NOT NULL
    ORDER BY p.embedding_vector <=> q_emb::vector
    LIMIT k
  )
  UNION ALL
  (
    SELECT 'team' as src_type, t.id, t.name as title, COALESCE(t.description, '') as snippet,
           t.embedding_vector <=> q_emb::vector as distance
    FROM public.teams t
    WHERE t.embedding_vector IS NOT NULL
    ORDER BY t.embedding_vector <=> q_emb::vector
    LIMIT k
  )
  UNION ALL
  (
    SELECT 'project_update' as src_type, pu.id, pu.title, COALESCE(LEFT(pu.content, 200), '') as snippet,
           pu.embedding_vector <=> q_emb::vector as distance
    FROM public.project_updates pu
    WHERE pu.embedding_vector IS NOT NULL
    ORDER BY pu.embedding_vector <=> q_emb::vector
    LIMIT k
  )
  UNION ALL
  (
    SELECT 'progress_entry' as src_type, pe.id, pe.title, COALESCE(pe.description, '') as snippet,
           pe.embedding_vector <=> q_emb::vector as distance
    FROM public.progress_entries pe
    WHERE pe.embedding_vector IS NOT NULL
    ORDER BY pe.embedding_vector <=> q_emb::vector
    LIMIT k
  )
  UNION ALL
  (
    SELECT 'builder_challenge' as src_type, bc.id, bc.title, COALESCE(bc.description, '') as snippet,
           bc.embedding_vector <=> q_emb::vector as distance
    FROM public.builder_challenges bc
    WHERE bc.embedding_vector IS NOT NULL
    ORDER BY bc.embedding_vector <=> q_emb::vector
    LIMIT k
  )
  ORDER BY distance
  LIMIT k;
END;
$$;

CREATE OR REPLACE FUNCTION public.team_neighbors(team_id uuid)
RETURNS TABLE(user_id uuid, full_name text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT tm.user_id, COALESCE(p.full_name, p.display_name, 'Unknown') as full_name, tm.role
  FROM public.team_members tm
  LEFT JOIN public.profiles p ON p.user_id = tm.user_id
  WHERE tm.team_id = team_neighbors.team_id;
END;
$$;

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, display_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'name')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();