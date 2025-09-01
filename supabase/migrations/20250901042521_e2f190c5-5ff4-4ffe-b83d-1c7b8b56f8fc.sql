-- Add individual stage tracking to user profiles
ALTER TABLE public.profiles 
ADD COLUMN individual_stage team_stage DEFAULT 'ideation';

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.individual_stage IS 'Individual user stage selected during onboarding - determines where their personal dashboard starts';

-- Create function to update team stage based on highest member stage
CREATE OR REPLACE FUNCTION public.update_team_stage_from_members()
RETURNS TRIGGER AS $$
DECLARE
  team_record RECORD;
  highest_stage team_stage;
BEGIN
  -- Get the team ID (handle both INSERT and UPDATE cases)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Find the team this user belongs to
    SELECT team_id INTO team_record.team_id 
    FROM public.profiles 
    WHERE id = NEW.id AND team_id IS NOT NULL;
  ELSIF TG_OP = 'DELETE' THEN
    -- Find the team this user belonged to
    SELECT team_id INTO team_record.team_id 
    FROM public.profiles 
    WHERE id = OLD.id AND team_id IS NOT NULL;
  END IF;

  -- If user has/had a team, update team stage to highest member stage
  IF team_record.team_id IS NOT NULL THEN
    -- Get the highest stage among all team members
    SELECT COALESCE(MAX(individual_stage), 'ideation'::team_stage) INTO highest_stage
    FROM public.profiles 
    WHERE team_id = team_record.team_id 
    AND individual_stage IS NOT NULL;
    
    -- Update team stage
    UPDATE public.teams 
    SET stage = highest_stage, updated_at = NOW()
    WHERE id = team_record.team_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update team stage when user stages change
CREATE TRIGGER update_team_stage_on_profile_change
  AFTER INSERT OR UPDATE OF individual_stage, team_id OR DELETE
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_stage_from_members();

-- Create function to get user's dashboard starting stage
CREATE OR REPLACE FUNCTION public.get_user_dashboard_stage(p_user_id uuid)
RETURNS team_stage AS $$
DECLARE
  user_stage team_stage;
BEGIN
  SELECT COALESCE(individual_stage, 'ideation'::team_stage) INTO user_stage
  FROM public.profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(user_stage, 'ideation'::team_stage);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;