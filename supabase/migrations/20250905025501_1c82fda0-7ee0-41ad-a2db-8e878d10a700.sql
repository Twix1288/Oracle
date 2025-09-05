-- Phase 1: Clean existing data for fresh start
TRUNCATE TABLE public.oracle_logs CASCADE;
TRUNCATE TABLE public.messages CASCADE;
TRUNCATE TABLE public.mentor_requests CASCADE;
TRUNCATE TABLE public.builder_assignments CASCADE;
TRUNCATE TABLE public.updates CASCADE;
TRUNCATE TABLE public.members CASCADE;
TRUNCATE TABLE public.access_codes CASCADE;
TRUNCATE TABLE public.team_status CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
TRUNCATE TABLE public.teams CASCADE;
TRUNCATE TABLE public.documents CASCADE;
TRUNCATE TABLE public.role_assignments CASCADE;
TRUNCATE TABLE public.builder_onboarding CASCADE;
TRUNCATE TABLE public.mentor_profiles CASCADE;
TRUNCATE TABLE public.events CASCADE;
TRUNCATE TABLE public.bot_commands_log CASCADE;

-- Phase 2: Fix default values before updating enum
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- Update user_role enum to remove 'lead'
ALTER TYPE public.user_role RENAME TO user_role_old;
CREATE TYPE public.user_role AS ENUM ('builder', 'mentor', 'guest', 'unassigned');

-- Update all columns that use the old enum
ALTER TABLE public.profiles ALTER COLUMN role TYPE public.user_role USING role::text::public.user_role;
ALTER TABLE public.oracle_logs ALTER COLUMN user_role TYPE public.user_role USING user_role::text::public.user_role;
ALTER TABLE public.messages ALTER COLUMN sender_role TYPE public.user_role USING sender_role::text::public.user_role;
ALTER TABLE public.messages ALTER COLUMN receiver_role TYPE public.user_role USING receiver_role::text::public.user_role;
ALTER TABLE public.access_codes ALTER COLUMN role TYPE public.user_role USING role::text::public.user_role;
ALTER TABLE public.members ALTER COLUMN role TYPE public.user_role USING role::text::public.user_role;
ALTER TABLE public.role_assignments ALTER COLUMN assigned_role TYPE public.user_role USING assigned_role::text::public.user_role;

-- Set new default value
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'unassigned'::public.user_role;

-- Drop the old enum
DROP TYPE public.user_role_old;