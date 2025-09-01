-- Add unique constraint to members table to fix the ON CONFLICT error
-- This constraint prevents duplicate members with the same name in the same team
ALTER TABLE public.members 
ADD CONSTRAINT members_name_team_id_unique 
UNIQUE (name, team_id);