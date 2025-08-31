-- Fix security warnings related to function search paths
-- This addresses the function search path mutable warnings

-- Update existing functions to have secure search_path
ALTER FUNCTION public.create_member_on_team_join() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';

-- Fix duplicate unique constraint warning
-- Add unique constraint on members table to prevent duplicates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'members_name_team_id_unique'
  ) THEN
    ALTER TABLE public.members 
    ADD CONSTRAINT members_name_team_id_unique UNIQUE (name, team_id);
  END IF;
END $$;