-- Clear all data from tables to prepare for deployment
DELETE FROM bot_commands_log;
DELETE FROM oracle_logs;
DELETE FROM messages;
DELETE FROM mentor_requests;
DELETE FROM builder_onboarding;
DELETE FROM mentor_profiles;
DELETE FROM role_assignments;
DELETE FROM builder_assignments;
DELETE FROM updates;
DELETE FROM team_status;
DELETE FROM members;
DELETE FROM profiles WHERE id != auth.uid(); -- Keep current user if any
DELETE FROM teams;
DELETE FROM access_codes;
DELETE FROM events;
DELETE FROM documents;
DELETE FROM discord_link_requests;
DELETE FROM discord_guilds;
DELETE FROM journey_stages;