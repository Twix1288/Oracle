-- Drop the problematic function with CASCADE to remove all dependent triggers
DROP FUNCTION IF EXISTS public.handle_access_code_delete() CASCADE;

-- Clear all existing user accounts and related data
DELETE FROM public.messages;
DELETE FROM public.updates;
DELETE FROM public.team_status;
DELETE FROM public.role_assignments;
DELETE FROM public.access_codes;
DELETE FROM public.members;
DELETE FROM public.teams;
DELETE FROM public.profiles;