-- Phase 3: Drop functions with CASCADE to handle all dependencies
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.generate_team_access_code(uuid, user_role, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_access_codes_overview() CASCADE;
DROP FUNCTION IF EXISTS public.assign_user_role(uuid, user_role) CASCADE;
DROP FUNCTION IF EXISTS public.validate_access_code(text, user_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_team_member_profiles(uuid) CASCADE;

-- Update documents table role_visibility column
ALTER TABLE public.documents DROP COLUMN IF EXISTS role_visibility;

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

-- Drop the old enum
DROP TYPE public.user_role_old;