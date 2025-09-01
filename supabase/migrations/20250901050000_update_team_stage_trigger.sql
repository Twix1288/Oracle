-- Idempotent trigger to keep teams.stage as the highest individual_stage among its members
-- Assumes enum public.team_stage is ordered: ideation < development < testing < launch < growth

CREATE OR REPLACE FUNCTION public.update_team_stage_from_members()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id uuid;
  v_highest public.team_stage;
BEGIN
  -- Determine affected team_id from NEW/OLD
  IF TG_OP IN ('INSERT','UPDATE') THEN
    SELECT team_id INTO v_team_id FROM public.profiles WHERE id = NEW.id;
  ELSE
    SELECT team_id INTO v_team_id FROM public.profiles WHERE id = OLD.id;
  END IF;

  IF v_team_id IS NOT NULL THEN
    -- Highest enum value among members becomes team.stage
    SELECT COALESCE(MAX(individual_stage), 'ideation'::public.team_stage)
      INTO v_highest
    FROM public.profiles
    WHERE team_id = v_team_id;

    UPDATE public.teams
      SET stage = v_highest, updated_at = NOW()
    WHERE id = v_team_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger safely
DROP TRIGGER IF EXISTS update_team_stage_on_profile_change ON public.profiles;
CREATE TRIGGER update_team_stage_on_profile_change
  AFTER INSERT OR UPDATE OF individual_stage, team_id OR DELETE
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_stage_from_members();


