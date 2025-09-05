-- Remove lead role - Handle function dependencies

-- Drop functions that depend on user_role enum
DROP FUNCTION IF EXISTS assign_user_role(uuid, user_role);

-- Drop all policies that depend on user_role columns
DROP POLICY IF EXISTS "Mentors can view team Oracle logs" ON oracle_logs;
DROP POLICY IF EXISTS "Team leads can manage their team" ON teams;
DROP POLICY IF EXISTS "Users can insert their own Oracle logs" ON oracle_logs;
DROP POLICY IF EXISTS "Users can update their own Oracle logs" ON oracle_logs;
DROP POLICY IF EXISTS "Users can view their own Oracle logs" ON oracle_logs;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON messages;
DROP POLICY IF EXISTS "Users can view their messages" ON messages;

-- First, update any existing lead roles to builder
UPDATE profiles SET role = 'builder' WHERE role = 'lead';
UPDATE members SET role = 'builder' WHERE role = 'lead';

-- Remove default constraints temporarily
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE members ALTER COLUMN role DROP DEFAULT;

-- Update user_role enum to remove lead
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('builder', 'mentor', 'guest', 'unassigned');

-- Update all tables to use new enum
ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING 
  CASE 
    WHEN role::text = 'lead' THEN 'builder'::user_role
    ELSE role::text::user_role 
  END;

ALTER TABLE members ALTER COLUMN role TYPE user_role USING 
  CASE 
    WHEN role::text = 'lead' THEN 'builder'::user_role
    ELSE role::text::user_role 
  END;

ALTER TABLE messages ALTER COLUMN sender_role TYPE user_role USING 
  CASE 
    WHEN sender_role::text = 'lead' THEN 'builder'::user_role
    ELSE sender_role::text::user_role 
  END;

ALTER TABLE messages ALTER COLUMN receiver_role TYPE user_role USING 
  CASE 
    WHEN receiver_role::text = 'lead' THEN 'builder'::user_role
    ELSE receiver_role::text::user_role 
  END;

ALTER TABLE oracle_logs ALTER COLUMN user_role TYPE user_role USING 
  CASE 
    WHEN user_role::text = 'lead' THEN 'builder'::user_role
    ELSE user_role::text::user_role 
  END;

ALTER TABLE role_assignments ALTER COLUMN assigned_role TYPE user_role USING 
  CASE 
    WHEN assigned_role::text = 'lead' THEN 'builder'::user_role
    ELSE assigned_role::text::user_role 
  END;

-- Restore defaults with new enum
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'unassigned'::user_role;
ALTER TABLE members ALTER COLUMN role SET DEFAULT 'builder'::user_role;

-- Drop old enum with cascade
DROP TYPE user_role_old CASCADE;

-- Add team_creator_id to teams table
ALTER TABLE teams ADD COLUMN team_creator_id uuid REFERENCES auth.users(id);

-- Update existing teams to set creator based on first builder member
UPDATE teams 
SET team_creator_id = (
  SELECT user_id 
  FROM members 
  WHERE team_id = teams.id 
  ORDER BY joined_at ASC 
  LIMIT 1
);

-- Recreate the assign_user_role function with new enum
CREATE OR REPLACE FUNCTION public.assign_user_role(p_user_id uuid, p_role user_role)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update user role
  UPDATE public.profiles 
  SET role = p_role, updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Recreate policies without lead references
CREATE POLICY "Mentors can view team Oracle logs" 
ON oracle_logs 
FOR SELECT 
USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'mentor'::user_role)))) AND (team_id IN ( SELECT m.team_id
   FROM (members m
     JOIN profiles p ON ((p.id = auth.uid())))
  WHERE (p.role = 'mentor'::user_role))));

CREATE POLICY "Users can insert their own Oracle logs" 
ON oracle_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Oracle logs" 
ON oracle_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own Oracle logs" 
ON oracle_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can send messages" 
ON messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages" 
ON messages 
FOR UPDATE 
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can view their messages" 
ON messages 
FOR SELECT 
USING ((auth.uid() = sender_id) OR (auth.uid() = receiver_id));

CREATE POLICY "Team creators can manage their team" 
ON teams 
FOR UPDATE 
USING (team_creator_id = auth.uid());