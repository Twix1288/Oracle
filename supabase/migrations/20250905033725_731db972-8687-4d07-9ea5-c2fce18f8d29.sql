-- Create enum types
CREATE TYPE public.user_role AS ENUM ('builder', 'mentor', 'lead', 'guest', 'unassigned');
CREATE TYPE public.update_type AS ENUM ('progress', 'milestone', 'issue', 'note');
CREATE TYPE public.individual_stage AS ENUM ('ideation', 'development', 'testing', 'launch', 'growth');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  personal_goals TEXT[],
  project_vision TEXT,
  skills TEXT[],
  help_needed TEXT[],
  experience_level TEXT,
  availability TEXT,
  timezone TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  team_id UUID,
  individual_stage individual_stage DEFAULT 'ideation',
  role user_role NOT NULL DEFAULT 'unassigned',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_name TEXT,
  project_description TEXT,
  tech_stack TEXT[],
  stage TEXT DEFAULT 'formation',
  max_members INTEGER DEFAULT 5,
  access_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'builder',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- Create updates table
CREATE TABLE public.updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type update_type DEFAULT 'note',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_status table
CREATE TABLE public.team_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role user_role NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  receiver_role user_role NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_assignments table
CREATE TABLE public.role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_role user_role NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

-- Add foreign key constraint for team_id in profiles
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_team FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- Create basic RLS policies
-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Teams policies
CREATE POLICY "Everyone can view teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Team members can update team" ON public.teams FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.members WHERE team_id = id AND user_id = auth.uid())
);

-- Members policies
CREATE POLICY "Everyone can view members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join teams" ON public.members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave teams" ON public.members FOR DELETE USING (auth.uid() = user_id);

-- Updates policies
CREATE POLICY "Everyone can view updates" ON public.updates FOR SELECT USING (true);
CREATE POLICY "Team members can create updates" ON public.updates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.members WHERE team_id = updates.team_id AND user_id = auth.uid())
);

-- Team status policies
CREATE POLICY "Everyone can view team status" ON public.team_status FOR SELECT USING (true);
CREATE POLICY "Team members can update status" ON public.team_status FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.members WHERE team_id = team_status.team_id AND user_id = auth.uid())
);
CREATE POLICY "Team members can insert status" ON public.team_status FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.members WHERE team_id = team_status.team_id AND user_id = auth.uid())
);

-- Messages policies
CREATE POLICY "Users can view their messages" ON public.messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their received messages" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Role assignments policies
CREATE POLICY "Everyone can view role assignments" ON public.role_assignments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create role assignments" ON public.role_assignments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create functions
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS TEXT AS $$
BEGIN
  RETURN upper(substring(md5(random()::text) from 1 for 6));
END;
$$ LANGUAGE plpgsql;

-- Function to create team with project data
CREATE OR REPLACE FUNCTION public.create_team_with_project_data(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_project_name TEXT DEFAULT NULL,
  p_project_description TEXT DEFAULT NULL,
  p_tech_stack TEXT[] DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  new_team public.teams;
  new_member public.members;
BEGIN
  -- Insert team
  INSERT INTO public.teams (name, description, project_name, project_description, tech_stack, access_code)
  VALUES (p_name, p_description, p_project_name, p_project_description, p_tech_stack, generate_access_code())
  RETURNING * INTO new_team;
  
  -- Add creator as team member if user_id provided
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.members (user_id, team_id, role)
    VALUES (p_user_id, new_team.id, 'lead')
    RETURNING * INTO new_member;
    
    -- Update user's team_id in profile
    UPDATE public.profiles 
    SET team_id = new_team.id 
    WHERE id = p_user_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'team', row_to_json(new_team),
    'member', row_to_json(new_member)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join team with code
CREATE OR REPLACE FUNCTION public.join_team_with_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS JSON AS $$
DECLARE
  target_team public.teams;
  new_member public.members;
  member_count INTEGER;
BEGIN
  -- Find team by access code
  SELECT * INTO target_team FROM public.teams WHERE access_code = p_code;
  
  IF target_team IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid access code');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM public.members WHERE user_id = p_user_id AND team_id = target_team.id) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this team');
  END IF;
  
  -- Check team capacity
  SELECT COUNT(*) INTO member_count FROM public.members WHERE team_id = target_team.id;
  
  IF member_count >= target_team.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Team is full');
  END IF;
  
  -- Add user to team
  INSERT INTO public.members (user_id, team_id, role)
  VALUES (p_user_id, target_team.id, 'builder')
  RETURNING * INTO new_member;
  
  -- Update user's team_id in profile
  UPDATE public.profiles 
  SET team_id = target_team.id 
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'team', row_to_json(target_team),
    'member', row_to_json(new_member)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign user role
CREATE OR REPLACE FUNCTION public.assign_user_role(
  p_user_id UUID,
  p_role user_role
)
RETURNS JSON AS $$
BEGIN
  -- Update user role
  UPDATE public.profiles 
  SET role = p_role, updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_status_updated_at
  BEFORE UPDATE ON public.team_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();