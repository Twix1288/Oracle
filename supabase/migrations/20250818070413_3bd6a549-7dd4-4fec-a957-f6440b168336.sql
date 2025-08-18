-- Clear all existing user accounts and profiles
DELETE FROM public.profiles;
DELETE FROM public.access_codes WHERE member_id IS NOT NULL;
DELETE FROM public.members;
DELETE FROM public.teams;
DELETE FROM public.team_status;
DELETE FROM public.role_assignments;
DELETE FROM public.messages;
DELETE FROM public.updates;