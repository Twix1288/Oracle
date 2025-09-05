-- Remove lead role and update structure for creator-based teams (fixed)

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

-- Drop old enum
DROP TYPE user_role_old;

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