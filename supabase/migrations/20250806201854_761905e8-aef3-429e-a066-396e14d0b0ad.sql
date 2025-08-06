-- Clean up all data for fresh testing in correct order
-- Delete dependent records first
DELETE FROM public.builder_assignments;
DELETE FROM public.updates;
DELETE FROM public.team_status;
DELETE FROM public.members;
DELETE FROM public.messages;
DELETE FROM public.oracle_logs;
DELETE FROM public.documents;

-- Delete all access codes except the lead code
DELETE FROM public.access_codes WHERE code != 'lead2025';

-- Finally delete teams
DELETE FROM public.teams;