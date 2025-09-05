-- Phase 3: Drop functions that depend on user_role enum
DROP FUNCTION IF EXISTS public.generate_team_access_code(uuid, user_role, text);
DROP FUNCTION IF EXISTS public.get_access_codes_overview();
DROP FUNCTION IF EXISTS public.assign_user_role(uuid, user_role);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.validate_access_code(text, user_role);
DROP FUNCTION IF EXISTS public.get_team_member_profiles(uuid);

-- Drop remaining policies that reference user_role
DROP POLICY IF EXISTS "Users can view updates for their team" ON public.updates;
DROP POLICY IF EXISTS "Mentors can view onboarding data for their assigned teams" ON public.builder_onboarding;
DROP POLICY IF EXISTS "Mentors can view assignments for their assigned teams" ON public.builder_assignments;
DROP POLICY IF EXISTS "Mentors can manage assigned team status" ON public.team_status;
DROP POLICY IF EXISTS "Leads can manage teams" ON public.teams;

-- Update documents table role_visibility column
ALTER TABLE public.documents ALTER COLUMN role_visibility DROP DEFAULT;
ALTER TABLE public.documents DROP COLUMN role_visibility;

-- Now update user_role enum
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

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

-- Drop the old enum with CASCADE to handle remaining dependencies
DROP TYPE public.user_role_old CASCADE;