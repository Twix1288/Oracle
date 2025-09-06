-- Phase 0: Database Enhancements for Builder Magnet Platform

-- Add new fields to profiles table for enhanced onboarding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS collaboration_style TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability_hours INTEGER DEFAULT 10;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS learning_style TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS builder_level TEXT DEFAULT 'novice';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS connection_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS collaboration_karma INTEGER DEFAULT 0;

-- Create builder_connections table for tracking Oracle-facilitated relationships
CREATE TABLE IF NOT EXISTS builder_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  connectee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  facilitated_by_oracle BOOLEAN DEFAULT true,
  connection_type TEXT DEFAULT 'collaboration', -- 'collaboration', 'mentorship', 'skill_exchange'
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'active'
  oracle_confidence REAL DEFAULT 0.7,
  oracle_reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create connection_requests table for pending introductions
CREATE TABLE IF NOT EXISTS connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  requested_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  request_type TEXT DEFAULT 'introduction',
  message TEXT,
  oracle_generated BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Create weekly_digests table for personalized networking summaries
CREATE TABLE IF NOT EXISTS weekly_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  digest_week DATE NOT NULL,
  connection_suggestions JSONB DEFAULT '[]'::jsonb,
  project_highlights JSONB DEFAULT '[]'::jsonb,
  learning_opportunities JSONB DEFAULT '[]'::jsonb,
  collaboration_matches JSONB DEFAULT '[]'::jsonb,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Add project visibility and Oracle summary to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS project_visibility TEXT DEFAULT 'public';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS oracle_summary TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE teams ADD COLUMN IF NOT EXISTS seeking_collaborators BOOLEAN DEFAULT false;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS collaboration_needs JSONB DEFAULT '[]'::jsonb;

-- Create project_updates table for quick updates separate from main updates
CREATE TABLE IF NOT EXISTS project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  update_type TEXT DEFAULT 'progress', -- 'progress', 'milestone', 'challenge', 'success'
  visibility TEXT DEFAULT 'public', -- 'public', 'team_only', 'private'
  oracle_processed BOOLEAN DEFAULT false,
  oracle_insights JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create builder_challenges table for gamification
CREATE TABLE IF NOT EXISTS builder_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL, -- 'connection', 'learning', 'collaboration', 'mentorship'
  title TEXT NOT NULL,
  description TEXT,
  target_metric INTEGER DEFAULT 1,
  current_progress INTEGER DEFAULT 0,
  reward_points INTEGER DEFAULT 10,
  week_assigned DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  oracle_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE builder_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE builder_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for builder_connections
CREATE POLICY "Users can view their own connections" ON builder_connections
FOR SELECT USING (auth.uid() = connector_id OR auth.uid() = connectee_id);

CREATE POLICY "Users can create connections for themselves" ON builder_connections
FOR INSERT WITH CHECK (auth.uid() = connector_id);

CREATE POLICY "Users can update their connection status" ON builder_connections
FOR UPDATE USING (auth.uid() = connector_id OR auth.uid() = connectee_id);

-- RLS Policies for connection_requests
CREATE POLICY "Users can view their requests" ON connection_requests
FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = requested_id);

CREATE POLICY "Users can create requests" ON connection_requests
FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can respond to requests" ON connection_requests
FOR UPDATE USING (auth.uid() = requested_id);

-- RLS Policies for weekly_digests
CREATE POLICY "Users can view their own digests" ON weekly_digests
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create digests" ON weekly_digests
FOR INSERT WITH CHECK (true);

-- RLS Policies for project_updates
CREATE POLICY "Public updates are viewable by all" ON project_updates
FOR SELECT USING (visibility = 'public' OR auth.uid() = user_id OR 
  (visibility = 'team_only' AND EXISTS (
    SELECT 1 FROM members WHERE team_id = project_updates.team_id AND user_id = auth.uid()
  ))
);

CREATE POLICY "Team members can create updates" ON project_updates
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM members WHERE team_id = project_updates.team_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update their own updates" ON project_updates
FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for builder_challenges
CREATE POLICY "Users can view their own challenges" ON builder_challenges
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create challenges" ON builder_challenges
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their challenge progress" ON builder_challenges
FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_builder_connections_connector ON builder_connections(connector_id);
CREATE INDEX IF NOT EXISTS idx_builder_connections_connectee ON builder_connections(connectee_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_requester ON connection_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_requested ON connection_requests(requested_id);
CREATE INDEX IF NOT EXISTS idx_weekly_digests_user_week ON weekly_digests(user_id, digest_week);
CREATE INDEX IF NOT EXISTS idx_project_updates_team ON project_updates(team_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_visibility ON project_updates(visibility);
CREATE INDEX IF NOT EXISTS idx_builder_challenges_user ON builder_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_visibility ON teams(project_visibility);

-- Create function to update team last_activity when updates are made
CREATE OR REPLACE FUNCTION update_team_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE teams SET last_activity = now() WHERE id = NEW.team_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for team activity updates
DROP TRIGGER IF EXISTS update_team_activity_trigger ON project_updates;
CREATE TRIGGER update_team_activity_trigger
  AFTER INSERT ON project_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_team_activity();

-- Create function to auto-update Oracle summaries when projects get updates
CREATE OR REPLACE FUNCTION generate_oracle_project_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark team for Oracle processing (will be handled by Oracle system)
  UPDATE teams 
  SET oracle_summary = 'Pending Oracle analysis...',
      last_activity = now()
  WHERE id = NEW.team_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for Oracle summary generation
DROP TRIGGER IF EXISTS generate_oracle_summary_trigger ON project_updates;
CREATE TRIGGER generate_oracle_summary_trigger
  AFTER INSERT ON project_updates
  FOR EACH ROW
  EXECUTE FUNCTION generate_oracle_project_summary();