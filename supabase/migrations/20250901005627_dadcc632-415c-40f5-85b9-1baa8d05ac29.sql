-- Fix members table to support multiple members in same team
-- The unique constraint should be on user_id + team_id, not name + team_id
-- This allows multiple people to join the same team

-- First, add user_id column to members table if it doesn't exist
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop the problematic unique constraint that prevents multiple members per team
-- (Fixed syntax)
ALTER TABLE public.members 
DROP CONSTRAINT IF EXISTS members_name_team_id_unique;

-- Create a proper unique constraint on user_id and team_id
-- This prevents the same user from joining the same team multiple times
-- but allows multiple different users to join the same team
ALTER TABLE public.members 
ADD CONSTRAINT members_user_id_team_id_unique UNIQUE (user_id, team_id);

-- Add team_visibility column to documents table to fix context storage
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS team_visibility UUID[] DEFAULT NULL;