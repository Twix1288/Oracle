-- 1) Add member_id to access_codes to link a code to a specific member (mentor)
ALTER TABLE public.access_codes
ADD COLUMN IF NOT EXISTS member_id uuid;

-- 2) Create FK from access_codes.member_id to members(id)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.access_codes
    ADD CONSTRAINT access_codes_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, do nothing
    NULL;
  END;
END$$;

-- 3) Ensure mentor_profiles.member_id references members(id) with cascade delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mentor_profiles_member_id_fkey'
  ) THEN
    ALTER TABLE public.mentor_profiles
    ADD CONSTRAINT mentor_profiles_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 4) Ensure teams.assigned_mentor_id references members(id) with set null on delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'teams_assigned_mentor_id_fkey'
  ) THEN
    ALTER TABLE public.teams
    ADD CONSTRAINT teams_assigned_mentor_id_fkey
    FOREIGN KEY (assigned_mentor_id) REFERENCES public.members(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 5) Allow DELETE on access_codes via RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'access_codes' AND policyname = 'Allow public delete access to access_codes'
  ) THEN
    CREATE POLICY "Allow public delete access to access_codes"
    ON public.access_codes
    FOR DELETE
    USING (true);
  END IF;
END$$;

-- 6) Trigger to delete associated mentor member when deleting mentor access code
CREATE OR REPLACE FUNCTION public.handle_access_code_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for mentor codes with linked member
  IF OLD.role = 'mentor' AND OLD.member_id IS NOT NULL THEN
    -- If no other codes reference this member, delete the member
    IF NOT EXISTS (
      SELECT 1 FROM public.access_codes
      WHERE member_id = OLD.member_id AND id <> OLD.id
    ) THEN
      DELETE FROM public.members WHERE id = OLD.member_id;
      -- teams.assigned_mentor_id will be nulled by FK; mentor_profiles will cascade
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_access_code_delete ON public.access_codes;
CREATE TRIGGER trg_access_code_delete
BEFORE DELETE ON public.access_codes
FOR EACH ROW
EXECUTE FUNCTION public.handle_access_code_delete();