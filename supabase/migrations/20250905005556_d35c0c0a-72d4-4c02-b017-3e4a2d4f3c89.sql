-- Clear all existing data for fresh start
DELETE FROM bot_commands_log;
DELETE FROM builder_onboarding;
DELETE FROM role_assignments;
DELETE FROM oracle_logs;
DELETE FROM messages;
DELETE FROM team_status;
DELETE FROM builder_assignments;
DELETE FROM mentor_requests;
DELETE FROM access_codes;
DELETE FROM members;
DELETE FROM updates;
DELETE FROM profiles;
DELETE FROM teams;

-- Reset sequences if any
-- This ensures clean slate for testing