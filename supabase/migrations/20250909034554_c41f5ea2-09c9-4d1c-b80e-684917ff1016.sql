-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding_vector columns to existing tables
ALTER TABLE builder_conversations ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);
ALTER TABLE oracle_logs ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);
ALTER TABLE progress_entries ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);
ALTER TABLE project_updates ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);
ALTER TABLE updates ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);
ALTER TABLE builder_challenges ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);

-- Create new tables for button functionality
CREATE TABLE IF NOT EXISTS skill_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id),
  skill TEXT NOT NULL,
  availability TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  embedding_vector vector(1536),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60,
  max_attendees INTEGER DEFAULT 20,
  attendees JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'scheduled',
  embedding_vector vector(1536),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feed_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  feed_item_id UUID,
  feed_item_type TEXT, -- 'project_update', 'team', 'profile'
  interaction_type TEXT NOT NULL, -- 'like', 'comment', 'share'
  body TEXT, -- for comments
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS collaboration_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id UUID REFERENCES profiles(id),
  target_id UUID REFERENCES profiles(id),
  project_id UUID REFERENCES teams(id),
  proposal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  timeline TEXT,
  deliverables JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- Enable RLS on new tables
ALTER TABLE skill_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_proposals ENABLE ROW LEVEL SECURITY;

-- RLS policies for skill_offers
CREATE POLICY "Users can view all skill offers" ON skill_offers FOR SELECT USING (true);
CREATE POLICY "Users can create their own skill offers" ON skill_offers FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own skill offers" ON skill_offers FOR UPDATE USING (auth.uid() = owner_id);

-- RLS policies for workshops
CREATE POLICY "Users can view all workshops" ON workshops FOR SELECT USING (true);
CREATE POLICY "Users can create workshops" ON workshops FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their workshops" ON workshops FOR UPDATE USING (auth.uid() = host_id);

-- RLS policies for feed_interactions
CREATE POLICY "Users can view all feed interactions" ON feed_interactions FOR SELECT USING (true);
CREATE POLICY "Users can create their own feed interactions" ON feed_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for project_interests
CREATE POLICY "Team members can view project interests" ON project_interests FOR SELECT USING (
  EXISTS (SELECT 1 FROM members WHERE team_id = project_id AND user_id = auth.uid()) OR
  auth.uid() = user_id
);
CREATE POLICY "Users can express interest" ON project_interests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Team creators can respond to interests" ON project_interests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM teams WHERE id = project_id AND team_creator_id = auth.uid()) OR
  auth.uid() = user_id
);

-- RLS policies for collaboration_proposals
CREATE POLICY "Users can view their collaboration proposals" ON collaboration_proposals FOR SELECT USING (
  auth.uid() = proposer_id OR auth.uid() = target_id
);
CREATE POLICY "Users can create collaboration proposals" ON collaboration_proposals FOR INSERT WITH CHECK (auth.uid() = proposer_id);
CREATE POLICY "Targets can respond to proposals" ON collaboration_proposals FOR UPDATE USING (auth.uid() = target_id OR auth.uid() = proposer_id);

-- Create ivfflat indexes for performance
CREATE INDEX IF NOT EXISTS documents_embedding_vector_idx ON documents USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS profiles_embedding_vector_idx ON profiles USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS teams_embedding_vector_idx ON teams USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS project_updates_embedding_vector_idx ON project_updates USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS progress_entries_embedding_vector_idx ON progress_entries USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS skill_offers_embedding_vector_idx ON skill_offers USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS workshops_embedding_vector_idx ON workshops USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- Create updated_at triggers for new tables
CREATE TRIGGER update_skill_offers_updated_at
  BEFORE UPDATE ON skill_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshops_updated_at
  BEFORE UPDATE ON workshops
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create safe RPC functions
CREATE OR REPLACE FUNCTION upsert_embedding(
  tablename text,
  row_id uuid,
  emb double precision[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE tablename
    WHEN 'documents' THEN
      UPDATE documents SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'profiles' THEN
      UPDATE profiles SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'teams' THEN
      UPDATE teams SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'project_updates' THEN
      UPDATE project_updates SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'progress_entries' THEN
      UPDATE progress_entries SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'builder_challenges' THEN
      UPDATE builder_challenges SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'builder_conversations' THEN
      UPDATE builder_conversations SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'messages' THEN
      UPDATE messages SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'oracle_logs' THEN
      UPDATE oracle_logs SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'updates' THEN
      UPDATE updates SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'skill_offers' THEN
      UPDATE skill_offers SET embedding_vector = emb::vector WHERE id = row_id;
    WHEN 'workshops' THEN
      UPDATE workshops SET embedding_vector = emb::vector WHERE id = row_id;
    ELSE
      RAISE EXCEPTION 'Invalid table name: %', tablename;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION search_graph_rag(
  q_emb double precision[],
  k integer DEFAULT 5
) RETURNS TABLE(
  src_type text,
  id uuid,
  title text,
  snippet text,
  distance double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  (
    -- Search documents
    SELECT 
      'document'::text as src_type,
      d.id,
      COALESCE(d.metadata->>'title', 'Document')::text as title,
      LEFT(d.content, 200)::text as snippet,
      (d.embedding_vector <=> q_emb::vector) as distance
    FROM documents d
    WHERE d.embedding_vector IS NOT NULL
    ORDER BY d.embedding_vector <=> q_emb::vector
    LIMIT k
  )
  UNION ALL
  (
    -- Search profiles
    SELECT 
      'profile'::text as src_type,
      p.id,
      COALESCE(p.full_name, 'User Profile')::text as title,
      COALESCE(LEFT(p.bio, 200), array_to_string(p.skills[1:3], ', '))::text as snippet,
      (p.embedding_vector <=> q_emb::vector) as distance
    FROM profiles p
    WHERE p.embedding_vector IS NOT NULL
    ORDER BY p.embedding_vector <=> q_emb::vector
    LIMIT k
  )
  UNION ALL
  (
    -- Search teams
    SELECT 
      'team'::text as src_type,
      t.id,
      t.name::text as title,
      COALESCE(LEFT(t.description, 200), LEFT(t.project_description, 200))::text as snippet,
      (t.embedding_vector <=> q_emb::vector) as distance
    FROM teams t
    WHERE t.embedding_vector IS NOT NULL
    ORDER BY t.embedding_vector <=> q_emb::vector
    LIMIT k
  )
  UNION ALL
  (
    -- Search project updates
    SELECT 
      'project_update'::text as src_type,
      pu.id,
      CONCAT('Update: ', pu.update_type)::text as title,
      LEFT(pu.content, 200)::text as snippet,
      (pu.embedding_vector <=> q_emb::vector) as distance
    FROM project_updates pu
    WHERE pu.embedding_vector IS NOT NULL
    ORDER BY pu.embedding_vector <=> q_emb::vector
    LIMIT k
  )
  UNION ALL
  (
    -- Search progress entries
    SELECT 
      'progress_entry'::text as src_type,
      pe.id,
      pe.title::text as title,
      LEFT(COALESCE(pe.description, pe.category), 200)::text as snippet,
      (pe.embedding_vector <=> q_emb::vector) as distance
    FROM progress_entries pe
    WHERE pe.embedding_vector IS NOT NULL
    ORDER BY pe.embedding_vector <=> q_emb::vector
    LIMIT k
  )
  UNION ALL
  (
    -- Search builder challenges
    SELECT 
      'builder_challenge'::text as src_type,
      bc.id,
      bc.title::text as title,
      LEFT(COALESCE(bc.description, bc.challenge_type), 200)::text as snippet,
      (bc.embedding_vector <=> q_emb::vector) as distance
    FROM builder_challenges bc
    WHERE bc.embedding_vector IS NOT NULL
    ORDER BY bc.embedding_vector <=> q_emb::vector
    LIMIT k
  )
  UNION ALL
  (
    -- Search conversations
    SELECT 
      'conversation'::text as src_type,
      bc.id,
      'Team Conversation'::text as title,
      LEFT(bc.message, 200)::text as snippet,
      (bc.embedding_vector <=> q_emb::vector) as distance
    FROM builder_conversations bc
    WHERE bc.embedding_vector IS NOT NULL
    ORDER BY bc.embedding_vector <=> q_emb::vector
    LIMIT k
  )
  UNION ALL
  (
    -- Search messages
    SELECT 
      'message'::text as src_type,
      m.id,
      'Direct Message'::text as title,
      LEFT(m.content, 200)::text as snippet,
      (m.embedding_vector <=> q_emb::vector) as distance
    FROM messages m
    WHERE m.embedding_vector IS NOT NULL
    ORDER BY m.embedding_vector <=> q_emb::vector
    LIMIT k
  )
  ORDER BY distance ASC
  LIMIT k;
END;
$$;

CREATE OR REPLACE FUNCTION team_neighbors(team_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.user_id,
    p.full_name,
    m.role::text
  FROM members m
  JOIN profiles p ON p.id = m.user_id
  WHERE m.team_id = team_neighbors.team_id;
END;
$$;