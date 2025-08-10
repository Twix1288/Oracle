-- Generalize cleanup to all roles and ensure it runs on delete
CREATE OR REPLACE FUNCTION public.handle_access_code_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If this access code is linked to a member, clean it up for any role
  IF OLD.member_id IS NOT NULL THEN
    -- If no other access codes reference this member, delete the member
    IF NOT EXISTS (
      SELECT 1 FROM public.access_codes
      WHERE member_id = OLD.member_id AND id <> OLD.id
    ) THEN
      DELETE FROM public.members WHERE id = OLD.member_id;
      -- teams.assigned_mentor_id will be nulled by FK if applicable; related profiles can cascade
    END IF;
  END IF;
  RETURN OLD;
END;
$function$;

-- Ensure trigger exists to call the cleanup function on access_codes deletions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_access_codes_after_delete_cleanup'
  ) THEN
    CREATE TRIGGER trg_access_codes_after_delete_cleanup
    AFTER DELETE ON public.access_codes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_access_code_delete();
  END IF;
END$$;

-- Ensure FKs used by cleanup side-effects exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teams_assigned_mentor_id_fkey'
  ) THEN
    ALTER TABLE public.teams
      ADD CONSTRAINT teams_assigned_mentor_id_fkey
      FOREIGN KEY (assigned_mentor_id)
      REFERENCES public.members(id)
      ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mentor_profiles_member_id_fkey'
  ) THEN
    ALTER TABLE public.mentor_profiles
      ADD CONSTRAINT mentor_profiles_member_id_fkey
      FOREIGN KEY (member_id)
      REFERENCES public.members(id)
      ON DELETE CASCADE;
  END IF;
END$$;