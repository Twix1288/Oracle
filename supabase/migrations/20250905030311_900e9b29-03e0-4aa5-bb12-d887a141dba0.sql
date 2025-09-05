-- Phase 4: Add new schema elements
-- Add team_creator_id to teams table
ALTER TABLE public.teams ADD COLUMN team_creator_id UUID REFERENCES auth.users(id);

-- Create join_requests table for community features
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

-- Add project onboarding data to teams
ALTER TABLE public.teams ADD COLUMN project_type TEXT;
ALTER TABLE public.teams ADD COLUMN target_audience TEXT;
ALTER TABLE public.teams ADD COLUMN problem_statement TEXT;
ALTER TABLE public.teams ADD COLUMN solution_approach TEXT;
ALTER TABLE public.teams ADD COLUMN tech_requirements TEXT[];
ALTER TABLE public.teams ADD COLUMN timeline_months INTEGER;
ALTER TABLE public.teams ADD COLUMN team_size_needed INTEGER;
ALTER TABLE public.teams ADD COLUMN skills_needed TEXT[];
ALTER TABLE public.teams ADD COLUMN is_public BOOLEAN DEFAULT true;

-- Update access_codes for creator-based system
ALTER TABLE public.access_codes ADD COLUMN creator_id UUID REFERENCES auth.users(id);

-- Add role_visibility back to documents with updated enum
ALTER TABLE public.documents ADD COLUMN role_visibility public.user_role[] DEFAULT ARRAY['builder'::public.user_role, 'mentor'::public.user_role, 'guest'::public.user_role, 'unassigned'::public.user_role];

-- Enable RLS on new tables
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- Phase 5: Recreate essential functions without lead role
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
 RETURNS public.user_role
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role_result public.user_role;
BEGIN
  SELECT role INTO user_role_result
  FROM public.profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(user_role_result, 'guest'::public.user_role);
END;
$function$;