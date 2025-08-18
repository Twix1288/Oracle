-- Drop the problematic trigger and function first
DROP TRIGGER IF EXISTS access_code_cleanup ON public.access_codes;
DROP FUNCTION IF EXISTS public.handle_access_code_delete();

-- Clear all existing user accounts and related data
DELETE FROM public.messages;
DELETE FROM public.updates;
DELETE FROM public.team_status;
DELETE FROM public.role_assignments;
DELETE FROM public.access_codes;
DELETE FROM public.members;
DELETE FROM public.teams;
DELETE FROM public.profiles;