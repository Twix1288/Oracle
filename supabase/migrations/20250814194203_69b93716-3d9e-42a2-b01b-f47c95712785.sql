-- Allow guests to view teams data
CREATE POLICY "Guests can view teams"
ON public.teams
FOR SELECT
TO anon
USING (true);

-- Allow guests to view updates data  
CREATE POLICY "Guests can view updates"
ON public.updates
FOR SELECT
TO anon
USING (true);

-- Allow guests to view members data
CREATE POLICY "Guests can view members"
ON public.members
FOR SELECT
TO anon
USING (true);

-- Allow guests to view team status data
CREATE POLICY "Guests can view team status"
ON public.team_status
FOR SELECT
TO anon
USING (true);