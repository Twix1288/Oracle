-- Clear all user data and related information
-- Delete in order to respect foreign key constraints

-- Clear messages
DELETE FROM messages;

-- Clear oracle logs
DELETE FROM oracle_logs;

-- Clear role assignments
DELETE FROM role_assignments;

-- Clear builder onboarding data
DELETE FROM builder_onboarding;

-- Clear builder assignments
DELETE FROM builder_assignments;

-- Clear mentor profiles
DELETE FROM mentor_profiles;

-- Clear team status
DELETE FROM team_status;

-- Clear updates
DELETE FROM updates;

-- Clear members
DELETE FROM members;

-- Clear access codes
DELETE FROM access_codes;

-- Clear profiles (this will cascade to related auth.users)
DELETE FROM profiles;

-- Clear teams
DELETE FROM teams;

-- Clear events
DELETE FROM events;

-- Clear documents
DELETE FROM documents;