-- First, let's modify the access_codes table to support team-specific codes
ALTER TABLE public.access_codes ADD COLUMN team_id uuid REFERENCES public.teams(id);
ALTER TABLE public.access_codes ADD COLUMN expires_at timestamp with time zone;
ALTER TABLE public.access_codes ADD COLUMN generated_by text;

-- Add indexes for better performance
CREATE INDEX idx_access_codes_team_role ON public.access_codes(team_id, role);
CREATE INDEX idx_access_codes_active ON public.access_codes(is_active, expires_at);

-- Update existing codes to be global (no team_id)
UPDATE public.access_codes SET expires_at = now() + interval '1 year' WHERE expires_at IS NULL;

-- Add some sample team-specific codes
INSERT INTO public.access_codes (code, role, team_id, description, generated_by) 
SELECT 
  'team' || (ROW_NUMBER() OVER()) || '_build2024' as code,
  'builder' as role,
  teams.id as team_id,
  'Team-specific builder access for ' || teams.name as description,
  'system' as generated_by
FROM public.teams
LIMIT 5;

-- Create a function to generate team-specific access codes
CREATE OR REPLACE FUNCTION public.generate_team_access_code(
  p_team_id uuid,
  p_role user_role,
  p_generated_by text DEFAULT 'system'
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  team_name text;
BEGIN
  -- Get team name for code generation
  SELECT name INTO team_name FROM public.teams WHERE id = p_team_id;
  
  -- Generate a unique code
  new_code := lower(replace(team_name, ' ', '')) || '_' || p_role || '_' || 
              to_char(now(), 'YYYY') || '_' || 
              substr(md5(random()::text), 1, 4);
  
  -- Insert the new access code
  INSERT INTO public.access_codes (code, role, team_id, description, generated_by, expires_at)
  VALUES (
    new_code,
    p_role,
    p_team_id,
    'Team access code for ' || team_name || ' (' || p_role || ')',
    p_generated_by,
    now() + interval '1 year'
  );
  
  RETURN new_code;
END;
$$;

-- Create a table for tracking builder team assignments
CREATE TABLE public.builder_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_name text NOT NULL,
  team_id uuid NOT NULL REFERENCES public.teams(id),
  access_code text NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on builder_assignments
ALTER TABLE public.builder_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for builder_assignments
CREATE POLICY "Allow public read access to builder_assignments"
ON public.builder_assignments
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to builder_assignments"
ON public.builder_assignments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access to builder_assignments"
ON public.builder_assignments
FOR UPDATE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_builder_assignments_updated_at
BEFORE UPDATE ON public.builder_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();