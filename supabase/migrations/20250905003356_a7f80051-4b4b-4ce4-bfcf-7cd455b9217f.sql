-- ============================================================================
-- ORACLE TRANSFORMATION: Project-First Innovation Hub Schema
-- ============================================================================

-- New enums for the expanded functionality
CREATE TYPE project_stage AS ENUM ('idea', 'prototype', 'mvp', 'live');
CREATE TYPE project_visibility AS ENUM ('public', 'team', 'private');
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE mentor_offer_status AS ENUM ('pending', 'accepted', 'declined', 'completed');
CREATE TYPE thread_status AS ENUM ('open', 'solved', 'closed');
CREATE TYPE reaction_kind AS ENUM ('upvote', 'downvote', 'bookmark', 'like');
CREATE TYPE index_owner_type AS ENUM ('project', 'mentor', 'qa', 'user', 'team');
CREATE TYPE index_privacy AS ENUM ('public', 'team', 'private');

-- ============================================================================
-- PROJECTS TABLE - Core entity for user-created projects
-- ============================================================================
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  problem TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  stage project_stage DEFAULT 'idea',
  visibility project_visibility DEFAULT 'public',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view public projects" ON public.projects FOR SELECT USING (visibility = 'public');
CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING (owner_user_id = auth.uid());
CREATE POLICY "Team members can view team projects" ON public.projects FOR SELECT USING (
  visibility = 'team' AND id IN (
    SELECT p.id FROM public.projects p
    JOIN public.teams t ON t.project_id = p.id
    JOIN public.team_memberships tm ON tm.team_id = t.id
    WHERE tm.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Project owners can update their projects" ON public.projects FOR UPDATE USING (owner_user_id = auth.uid());
CREATE POLICY "Project owners can delete their projects" ON public.projects FOR DELETE USING (owner_user_id = auth.uid());

-- Add project_id to existing teams table
ALTER TABLE public.teams ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- ============================================================================
-- TEAM MEMBERSHIPS - Flexible team membership system
-- ============================================================================
CREATE TABLE public.team_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS for team memberships
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

-- Team membership policies
CREATE POLICY "Users can view memberships for their teams" ON public.team_memberships FOR SELECT USING (
  user_id = auth.uid() OR team_id IN (
    SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Team owners/admins can manage memberships" ON public.team_memberships FOR ALL USING (
  team_id IN (
    SELECT team_id FROM public.team_memberships 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);
CREATE POLICY "Users can join teams via invites" ON public.team_memberships FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- INVITES - Team invitation system
-- ============================================================================
CREATE TABLE public.invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  status invite_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for invites
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Invite policies
CREATE POLICY "Team members can view team invites" ON public.invites FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Team owners/admins can manage invites" ON public.invites FOR ALL USING (
  team_id IN (
    SELECT team_id FROM public.team_memberships 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);
CREATE POLICY "Anyone can view valid invites for joining" ON public.invites FOR SELECT USING (
  status = 'pending' AND (expires_at IS NULL OR expires_at > now()) 
  AND (max_uses IS NULL OR current_uses < max_uses)
);

-- ============================================================================
-- MENTOR PROFILES - Enhanced mentor information
-- ============================================================================
CREATE TABLE public.mentor_profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bio TEXT,
  expertise_tags TEXT[] DEFAULT '{}',
  availability_blocks JSONB DEFAULT '{}',
  links TEXT[] DEFAULT '{}',
  hourly_rate DECIMAL(10,2),
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for mentor profiles
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;

-- Mentor profile policies
CREATE POLICY "Anyone can view mentor profiles" ON public.mentor_profiles FOR SELECT USING (is_available = true);
CREATE POLICY "Mentors can manage their own profile" ON public.mentor_profiles FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- MENTOR OFFERS - Mentor-project engagement system
-- ============================================================================
CREATE TABLE public.mentor_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  note TEXT,
  status mentor_offer_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(mentor_user_id, project_id)
);

-- Enable RLS for mentor offers
ALTER TABLE public.mentor_offers ENABLE ROW LEVEL SECURITY;

-- Mentor offer policies
CREATE POLICY "Mentors can view their offers" ON public.mentor_offers FOR SELECT USING (mentor_user_id = auth.uid());
CREATE POLICY "Project owners can view offers for their projects" ON public.mentor_offers FOR SELECT USING (
  project_id IN (SELECT id FROM public.projects WHERE owner_user_id = auth.uid())
);
CREATE POLICY "Mentors can create offers" ON public.mentor_offers FOR INSERT WITH CHECK (mentor_user_id = auth.uid());
CREATE POLICY "Mentors and project owners can update offers" ON public.mentor_offers FOR UPDATE USING (
  mentor_user_id = auth.uid() OR 
  project_id IN (SELECT id FROM public.projects WHERE owner_user_id = auth.uid())
);

-- ============================================================================
-- Q&A SYSTEM - Knowledge hub threads and posts
-- ============================================================================
CREATE TABLE public.qa_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status thread_status DEFAULT 'open',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  best_answer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.qa_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.qa_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_answer BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for best answer
ALTER TABLE public.qa_threads ADD CONSTRAINT qa_threads_best_answer_fkey 
  FOREIGN KEY (best_answer_id) REFERENCES public.qa_posts(id) ON DELETE SET NULL;

-- Enable RLS for Q&A
ALTER TABLE public.qa_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_posts ENABLE ROW LEVEL SECURITY;

-- Q&A policies
CREATE POLICY "Anyone can view Q&A threads" ON public.qa_threads FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create threads" ON public.qa_threads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Thread authors can update their threads" ON public.qa_threads FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Anyone can view Q&A posts" ON public.qa_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.qa_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Post authors can update their posts" ON public.qa_posts FOR UPDATE USING (author_id = auth.uid());

-- ============================================================================
-- REACTIONS - Upvotes, bookmarks, etc.
-- ============================================================================
CREATE TABLE public.reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'project', 'qa_thread', 'qa_post', etc.
  entity_id UUID NOT NULL,
  kind reaction_kind NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(actor_id, entity_type, entity_id, kind)
);

-- Enable RLS for reactions
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Reaction policies
CREATE POLICY "Anyone can view reactions" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Users can manage their own reactions" ON public.reactions FOR ALL USING (actor_id = auth.uid());

-- ============================================================================
-- ORACLE INDEX ITEMS - Vectorized content for semantic search
-- ============================================================================
CREATE TABLE public.oracle_index_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_type index_owner_type NOT NULL,
  owner_id UUID NOT NULL,
  text_content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 dimensions
  privacy index_privacy DEFAULT 'public',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for oracle index items
ALTER TABLE public.oracle_index_items ENABLE ROW LEVEL SECURITY;

-- Oracle index policies
CREATE POLICY "Users can view public index items" ON public.oracle_index_items FOR SELECT USING (privacy = 'public');
CREATE POLICY "Users can view their own index items" ON public.oracle_index_items FOR SELECT USING (
  owner_type = 'user' AND owner_id = auth.uid()
);
CREATE POLICY "Team members can view team index items" ON public.oracle_index_items FOR SELECT USING (
  privacy = 'team' AND (
    (owner_type = 'team' AND owner_id IN (
      SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid()
    )) OR
    (owner_type = 'project' AND owner_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.teams t ON t.project_id = p.id
      JOIN public.team_memberships tm ON tm.team_id = t.id
      WHERE tm.user_id = auth.uid()
    ))
  )
);
CREATE POLICY "System can manage all index items" ON public.oracle_index_items FOR ALL USING (true);

-- Create vector similarity search index
CREATE INDEX oracle_index_items_embedding_idx ON public.oracle_index_items 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers to all new tables
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_team_memberships_updated_at BEFORE UPDATE ON public.team_memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invites_updated_at BEFORE UPDATE ON public.invites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mentor_profiles_updated_at BEFORE UPDATE ON public.mentor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mentor_offers_updated_at BEFORE UPDATE ON public.mentor_offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_qa_threads_updated_at BEFORE UPDATE ON public.qa_threads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_qa_posts_updated_at BEFORE UPDATE ON public.qa_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_oracle_index_items_updated_at BEFORE UPDATE ON public.oracle_index_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create team membership when creating a team
CREATE OR REPLACE FUNCTION public.create_team_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the user who created the team from the profiles table
  INSERT INTO public.team_memberships (team_id, user_id, role)
  SELECT NEW.id, p.id, 'owner'::team_role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  ON CONFLICT (team_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-create team owner membership
CREATE TRIGGER create_team_owner_membership_trigger
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.create_team_owner_membership();

-- Function to handle invite acceptance and team joining
CREATE OR REPLACE FUNCTION public.accept_invite(invite_token TEXT)
RETURNS JSONB AS $$
DECLARE
  invite_record RECORD;
  result JSONB;
BEGIN
  -- Get the invite details
  SELECT * INTO invite_record FROM public.invites 
  WHERE token = invite_token 
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;
  
  -- Create team membership
  INSERT INTO public.team_memberships (team_id, user_id, role)
  VALUES (invite_record.team_id, auth.uid(), 'member'::team_role)
  ON CONFLICT (team_id, user_id) DO NOTHING;
  
  -- Update invite usage
  UPDATE public.invites 
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE id = invite_record.id;
  
  -- Mark as accepted if max uses reached
  IF invite_record.max_uses IS NOT NULL AND invite_record.current_uses + 1 >= invite_record.max_uses THEN
    UPDATE public.invites 
    SET status = 'accepted'::invite_status
    WHERE id = invite_record.id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'team_id', invite_record.team_id,
    'message', 'Successfully joined team'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;