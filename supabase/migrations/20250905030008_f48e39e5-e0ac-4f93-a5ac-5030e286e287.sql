-- Phase 3: Update user_role enum to remove 'lead'
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

-- Phase 4: Add team_creator_id to teams table
ALTER TABLE public.teams ADD COLUMN team_creator_id UUID REFERENCES auth.users(id);

-- Phase 5: Create join_requests table for community features
CREATE TABLE public.join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(requester_id, team_id)
);

-- Phase 6: Add project onboarding data to teams
ALTER TABLE public.teams ADD COLUMN project_type TEXT;
ALTER TABLE public.teams ADD COLUMN target_audience TEXT;
ALTER TABLE public.teams ADD COLUMN problem_statement TEXT;
ALTER TABLE public.teams ADD COLUMN solution_approach TEXT;
ALTER TABLE public.teams ADD COLUMN tech_requirements TEXT[];
ALTER TABLE public.teams ADD COLUMN timeline_months INTEGER;
ALTER TABLE public.teams ADD COLUMN team_size_needed INTEGER;
ALTER TABLE public.teams ADD COLUMN skills_needed TEXT[];
ALTER TABLE public.teams ADD COLUMN is_public BOOLEAN DEFAULT true;

-- Phase 7: Update access_codes for creator-based system
ALTER TABLE public.access_codes ADD COLUMN creator_id UUID REFERENCES auth.users(id);

-- Phase 8: Enable RLS on new tables
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;