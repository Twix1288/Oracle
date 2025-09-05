-- Phase 6: Create essential RLS policies for creator-based system

-- Profiles policies (basic user management)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Mentors can view all profiles" ON public.profiles
  FOR SELECT USING (get_user_role(auth.uid()) = 'mentor'::public.user_role);

-- Teams policies (creator-based management)
CREATE POLICY "Authenticated users can view public teams" ON public.teams
  FOR SELECT USING (is_public = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Team creators can manage their teams" ON public.teams
  FOR ALL USING (team_creator_id = auth.uid());

CREATE POLICY "Team members can view their team" ON public.teams
  FOR SELECT USING (id IN (
    SELECT team_id FROM public.profiles 
    WHERE id = auth.uid() AND team_id IS NOT NULL
  ));

CREATE POLICY "Authenticated users can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Access codes policies (creator-based)
CREATE POLICY "Users can create access codes" ON public.access_codes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creators can manage their access codes" ON public.access_codes
  FOR ALL USING (creator_id = auth.uid());

CREATE POLICY "Users can validate access codes" ON public.access_codes
  FOR SELECT USING (
    is_active = true AND 
    (expires_at IS NULL OR expires_at > now()) AND
    auth.uid() IS NOT NULL
  );

-- Join requests policies
CREATE POLICY "Users can create join requests" ON public.join_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can view their join requests" ON public.join_requests
  FOR SELECT USING (requester_id = auth.uid());

CREATE POLICY "Team creators can manage join requests for their teams" ON public.join_requests
  FOR ALL USING (creator_id = auth.uid());

-- Members policies (team-based)
CREATE POLICY "Team members can view their team members" ON public.members
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.profiles 
      WHERE id = auth.uid() AND team_id IS NOT NULL
    ) OR get_user_role(auth.uid()) = 'mentor'::public.user_role
  );

CREATE POLICY "Users can manage member records" ON public.members
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Updates policies (team-based)
CREATE POLICY "Team members can view their team updates" ON public.updates
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.profiles 
      WHERE id = auth.uid() AND team_id IS NOT NULL
    ) OR get_user_role(auth.uid()) = 'mentor'::public.user_role
  );

CREATE POLICY "Authenticated users can create updates" ON public.updates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);