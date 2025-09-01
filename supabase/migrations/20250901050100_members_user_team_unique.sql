-- Optional safer unique constraint for members identity across teams
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'members' AND c.conname = 'members_user_team_unique'
  ) THEN
    ALTER TABLE public.members
    ADD CONSTRAINT members_user_team_unique UNIQUE (user_id, team_id);
  END IF;
EXCEPTION WHEN duplicate_table THEN
  -- ignore
END $$;


