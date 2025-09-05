-- Remove lead role and update structure for creator-based teams

-- First, update any existing lead roles to builder
UPDATE profiles SET role = 'builder' WHERE role = 'lead';

-- Update user_role enum to remove lead
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('builder', 'mentor', 'guest', 'unassigned');

-- Update all tables to use new enum
ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::text::user_role;
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

-- Update the create_team_with_project_data function to work with creators
CREATE OR REPLACE FUNCTION public.create_team_with_project_data(
  p_name text,
  p_description text DEFAULT NULL,
  p_project_name text DEFAULT NULL,
  p_project_description text DEFAULT NULL,
  p_tech_stack text[] DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_problem_statement text DEFAULT NULL,
  p_solution_approach text DEFAULT NULL,
  p_target_audience text DEFAULT NULL,
  p_project_type text DEFAULT NULL,
  p_skills_needed text[] DEFAULT NULL,
  p_tech_requirements text[] DEFAULT NULL,
  p_team_size_needed integer DEFAULT 3,
  p_timeline_months integer DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_team teams;
  new_member members;
BEGIN
  -- Insert team with comprehensive data
  INSERT INTO public.teams (
    name, 
    description, 
    project_name,
    project_description,
    tech_stack,
    problem_statement,
    solution_approach,
    target_audience,
    project_type,
    skills_needed,
    tech_requirements,
    team_size_needed,
    timeline_months,
    team_creator_id,
    access_code
  ) VALUES (
    p_name,
    p_description,
    p_project_name,
    p_project_description,
    p_tech_stack,
    p_problem_statement,
    p_solution_approach,
    p_target_audience,
    p_project_type,
    p_skills_needed,
    p_tech_requirements,
    p_team_size_needed,
    p_timeline_months,
    p_user_id,
    generate_access_code()
  ) RETURNING * INTO new_team;
  
  -- Add creator as team member if user_id provided
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.members (user_id, team_id, role)
    VALUES (p_user_id, new_team.id, 'builder')
    RETURNING * INTO new_member;
    
    -- Update user's team_id in profile
    UPDATE public.profiles 
    SET team_id = new_team.id 
    WHERE id = p_user_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'team', row_to_json(new_team),
    'member', row_to_json(new_member)
  );
END;
$$;

-- Update RLS policies to work with team creators instead of leads
DROP POLICY IF EXISTS "Team leads can manage their team" ON teams;
CREATE POLICY "Team creators can manage their team" 
ON teams 
FOR UPDATE 
USING (team_creator_id = auth.uid());

-- Update access code generation function for creators
CREATE OR REPLACE FUNCTION public.generate_team_access_code(p_team_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code text;
  team_creator uuid;
BEGIN
  -- Check if user is the team creator
  SELECT team_creator_id INTO team_creator FROM teams WHERE id = p_team_id;
  
  IF team_creator != p_user_id THEN
    RAISE EXCEPTION 'Only team creators can generate access codes';
  END IF;
  
  -- Generate new access code
  new_code := generate_access_code();
  
  -- Update team access code
  UPDATE teams SET access_code = new_code WHERE id = p_team_id;
  
  RETURN new_code;
END;
$$;