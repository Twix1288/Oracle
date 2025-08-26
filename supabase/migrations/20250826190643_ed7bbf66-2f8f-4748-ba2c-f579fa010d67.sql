-- Clean up database - remove all extra access codes, teams, and members
-- Keep only the lead master code and user's profile

-- Remove all access codes except the lead master code
DELETE FROM public.access_codes 
WHERE code != 'PIEFI-LEAD-MASTER-2025';

-- Remove all teams (if any exist)
DELETE FROM public.teams;

-- Remove all members (if any exist) 
DELETE FROM public.members;

-- Remove all team status records
DELETE FROM public.team_status;

-- Remove all updates
DELETE FROM public.updates;

-- Remove all builder assignments
DELETE FROM public.builder_assignments;

-- Clear team_id from all profiles to reset them
UPDATE public.profiles 
SET team_id = NULL, role = 'guest' 
WHERE role != 'lead';