-- Fix all security issues by enabling RLS and adding proper policies

-- Enable RLS on all tables that need it
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_onboarding ENABLE ROW LEVEL SECURITY;

-- Teams table policies - only team members can access
CREATE POLICY "Users can view teams they are members of" 
ON public.teams 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.members 
    WHERE members.team_id = teams.id 
    AND members.user_id = auth.uid()
  )
);

CREATE POLICY "Team members can update their team" 
ON public.teams 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.members 
    WHERE members.team_id = teams.id 
    AND members.user_id = auth.uid()
  )
);

-- Members table policies - only team members can view other members
CREATE POLICY "Users can view members of their teams" 
ON public.members 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.members m2 
    WHERE m2.team_id = members.team_id 
    AND m2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert themselves as members" 
ON public.members 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Updates table policies - only team members can view updates
CREATE POLICY "Users can view updates for their teams" 
ON public.updates 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.members 
    WHERE members.team_id = updates.team_id 
    AND members.user_id = auth.uid()
  )
);

CREATE POLICY "Team members can create updates" 
ON public.updates 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.members 
    WHERE members.team_id = updates.team_id 
    AND members.user_id = auth.uid()
  )
);

-- Team status policies - only team members can access
CREATE POLICY "Users can view status of their teams" 
ON public.team_status 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.members 
    WHERE members.team_id = team_status.team_id 
    AND members.user_id = auth.uid()
  )
);

CREATE POLICY "Team members can update team status" 
ON public.team_status 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.members 
    WHERE members.team_id = team_status.team_id 
    AND members.user_id = auth.uid()
  )
);

-- Builder assignments policies - only the assigned builder can view
CREATE POLICY "Users can view their own builder assignments" 
ON public.builder_assignments 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own builder assignments" 
ON public.builder_assignments 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Builder onboarding policies - only the builder can view their onboarding
CREATE POLICY "Users can view their own onboarding data" 
ON public.builder_onboarding 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own onboarding data" 
ON public.builder_onboarding 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own onboarding data" 
ON public.builder_onboarding 
FOR UPDATE 
USING (user_id = auth.uid());

-- Fix function search path issues by setting explicit search_path
ALTER FUNCTION public.validate_access_code(text) SET search_path = public;
ALTER FUNCTION public.get_access_codes_overview() SET search_path = public;