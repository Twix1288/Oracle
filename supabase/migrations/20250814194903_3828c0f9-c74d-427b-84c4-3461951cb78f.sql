-- Insert some test members if they don't exist
INSERT INTO public.members (name, role, team_id, assigned_by) 
SELECT 'Test Builder', 'builder', '2161a5fb-5cc0-4648-9f31-a6db205746f3', 'system'
WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE name = 'Test Builder' AND role = 'builder');

-- Make sure the mentor exists and is assigned
UPDATE public.teams SET assigned_mentor_id = '782e64c4-7a7f-4a4d-86d6-ca9103014415' 
WHERE id = '2161a5fb-5cc0-4648-9f31-a6db205746f3';

-- Insert a test update to show activity
INSERT INTO public.updates (team_id, content, type, created_by)
SELECT '2161a5fb-5cc0-4648-9f31-a6db205746f3', 'Making good progress on the AI assistant features. Working on better query handling.', 'daily', 'Test Builder'
WHERE NOT EXISTS (
  SELECT 1 FROM public.updates 
  WHERE team_id = '2161a5fb-5cc0-4648-9f31-a6db205746f3' 
  AND created_at > NOW() - INTERVAL '1 day'
);