-- Clean up all data for fresh testing
-- Delete all teams (this will cascade to related data)
DELETE FROM public.teams;

-- Delete all updates
DELETE FROM public.updates;

-- Delete all team statuses
DELETE FROM public.team_status;

-- Delete all members
DELETE FROM public.members;

-- Delete all builder assignments
DELETE FROM public.builder_assignments;

-- Delete all messages
DELETE FROM public.messages;

-- Delete all oracle logs
DELETE FROM public.oracle_logs;

-- Delete all documents
DELETE FROM public.documents;

-- Delete all access codes except the lead code
DELETE FROM public.access_codes WHERE code != 'lead2025';