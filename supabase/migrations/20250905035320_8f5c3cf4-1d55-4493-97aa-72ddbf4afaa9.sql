-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column to oracle_logs for embeddings
ALTER TABLE oracle_logs ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS oracle_logs_embedding_idx ON oracle_logs USING ivfflat (embedding vector_cosine_ops);

-- Add vector columns to other tables for comprehensive RAG
ALTER TABLE updates ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS updates_embedding_idx ON updates USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS messages_embedding_idx ON messages USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS teams_embedding_idx ON teams USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS profiles_embedding_idx ON profiles USING ivfflat (embedding vector_cosine_ops);

-- Create builder_conversations table for lounge conversations
CREATE TABLE IF NOT EXISTS builder_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  sender_id UUID REFERENCES profiles(id),
  message TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on builder_conversations
ALTER TABLE builder_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for builder_conversations
CREATE POLICY "Team members can view conversations" ON builder_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.team_id = builder_conversations.team_id 
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can insert conversations" ON builder_conversations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.team_id = builder_conversations.team_id 
      AND members.user_id = auth.uid()
    ) AND sender_id = auth.uid()
  );

-- Create progress_entries table for tracking builder progress
CREATE TABLE IF NOT EXISTS progress_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'milestone', 'daily', 'weekly', 'blocker', 'achievement'
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'blocked', 'cancelled'
  ai_feedback TEXT, -- AI-generated feedback on progress
  ai_suggestions JSONB, -- AI suggestions for next steps
  embedding vector(1536),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on progress_entries
ALTER TABLE progress_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for progress_entries
CREATE POLICY "Team members can view progress" ON progress_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.team_id = progress_entries.team_id 
      AND members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their progress" ON progress_entries
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Team members can insert progress" ON progress_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE members.team_id = progress_entries.team_id 
      AND members.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS builder_conversations_team_idx ON builder_conversations(team_id);
CREATE INDEX IF NOT EXISTS builder_conversations_embedding_idx ON builder_conversations USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS progress_entries_team_idx ON progress_entries(team_id);
CREATE INDEX IF NOT EXISTS progress_entries_user_idx ON progress_entries(user_id);
CREATE INDEX IF NOT EXISTS progress_entries_embedding_idx ON progress_entries USING ivfflat (embedding vector_cosine_ops);

-- Create triggers for updated_at
CREATE TRIGGER update_builder_conversations_updated_at
  BEFORE UPDATE ON builder_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_entries_updated_at
  BEFORE UPDATE ON progress_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();