-- Fix Oracle team stage to match user's onboarding selection
-- User selected development/MVP stage but it's still showing ideation

UPDATE public.teams 
SET stage = 'development',
    description = 'AI-powered Oracle platform - Currently building MVP and core features',
    updated_at = now()
WHERE name = 'Oracle' AND stage = 'ideation';

-- Add better logging for team stage updates
CREATE OR REPLACE FUNCTION public.log_team_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log significant stage changes
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.updates (team_id, content, type, created_by)
    VALUES (
      NEW.id,
      '🎯 Team stage updated from "' || COALESCE(OLD.stage::text, 'none') || '" to "' || NEW.stage::text || '"',
      'milestone',
      'system'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

-- Create trigger for team stage changes
DROP TRIGGER IF EXISTS team_stage_change_trigger ON public.teams;
CREATE TRIGGER team_stage_change_trigger
  AFTER UPDATE OF stage ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.log_team_stage_change();