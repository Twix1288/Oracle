-- Add access_code column to teams table
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE;

-- Add function to generate unique access codes
CREATE OR REPLACE FUNCTION generate_unique_access_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 8-character code (uppercase letters and numbers)
        new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
        
        -- Check if code already exists
        SELECT EXISTS (
            SELECT 1 
            FROM public.teams 
            WHERE access_code = new_code
        ) INTO code_exists;
        
        -- If code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$;

-- Add trigger to automatically generate access code for new teams
CREATE OR REPLACE FUNCTION set_team_access_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.access_code IS NULL THEN
        NEW.access_code := generate_unique_access_code();
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER team_access_code_trigger
    BEFORE INSERT ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION set_team_access_code();

-- Generate access codes for existing teams that don't have one
UPDATE public.teams
SET access_code = generate_unique_access_code()
WHERE access_code IS NULL;
