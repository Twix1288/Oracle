-- Drop the problematic function with CASCADE
DROP FUNCTION IF EXISTS public.handle_access_code_delete() CASCADE;

-- Clear all data in proper order (dependent tables first)
DELETE FROM public.messages;
DELETE FROM public.updates;
DELETE FROM public.team_status;
DELETE FROM public.role_assignments;
DELETE FROM public.access_codes;
DELETE FROM public.builder_assignments;
DELETE FROM public.builder_onboarding;
DELETE FROM public.oracle_logs;
DELETE FROM public.mentor_profiles;
DELETE FROM public.members;
DELETE FROM public.teams;
DELETE FROM public.profiles;