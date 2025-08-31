-- Fix member tracking when users join teams through access codes
-- This ensures member counts are accurate and teams show proper membership

-- 1. Create function to automatically create member records when profiles are updated with team_id
CREATE OR REPLACE FUNCTION public.create_member_on_team_join()
RETURNS TRIGGER AS $$
BEGIN
  -- If team_id was added/changed and user has a role other than unassigned
  IF (OLD.team_id IS NULL OR OLD.team_id != NEW.team_id) AND NEW.team_id IS NOT NULL AND NEW.role != 'unassigned' THEN
    -- Insert or update member record
    INSERT INTO public.members (name, role, team_id, assigned_by)
    VALUES (NEW.full_name, NEW.role, NEW.team_id, 'auto_join')
    ON CONFLICT (name, team_id) DO UPDATE SET
      role = NEW.role,
      updated_at = now();
  END IF;
  
  -- If user left team, remove member record
  IF OLD.team_id IS NOT NULL AND NEW.team_id IS NULL THEN
    DELETE FROM public.members 
    WHERE name = OLD.full_name AND team_id = OLD.team_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger to automatically manage member records
DROP TRIGGER IF EXISTS profile_team_change_trigger ON public.profiles;
CREATE TRIGGER profile_team_change_trigger
  AFTER UPDATE OF team_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_member_on_team_join();

-- 3. Backfill existing member records for users who already have teams
INSERT INTO public.members (name, role, team_id, assigned_by)
SELECT 
  p.full_name,
  p.role,
  p.team_id,
  'backfill'
FROM public.profiles p
WHERE p.team_id IS NOT NULL 
  AND p.role != 'unassigned'
  AND p.full_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.members m 
    WHERE m.name = p.full_name AND m.team_id = p.team_id
  );