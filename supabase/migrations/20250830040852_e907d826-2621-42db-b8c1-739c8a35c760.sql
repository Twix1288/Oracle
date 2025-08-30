-- First, let's add the unassigned value to the enum in a separate transaction
DO $$
BEGIN
    -- Add 'unassigned' to user_role enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'unassigned' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
        ALTER TYPE user_role ADD VALUE 'unassigned';
    END IF;
END $$;

-- Commit this first
COMMIT;

-- Now update the default in a separate transaction
BEGIN;

-- Update default role for new profiles
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'unassigned'::user_role;

COMMIT;