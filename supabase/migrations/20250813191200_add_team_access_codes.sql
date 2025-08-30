-- Add access_code column to teams table
ALTER TABLE public.teams
ADD COLUMN access_code TEXT UNIQUE;

-- Add function to generate random access codes
CREATE OR REPLACE FUNCTION generate_team_access_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    unique_code BOOLEAN := FALSE;
BEGIN
    WHILE NOT unique_code LOOP
        -- Generate a random 8-character code
        code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
        
        -- Check if code is unique
        SELECT NOT EXISTS (
            SELECT 1 FROM public.teams WHERE access_code = code
        ) INTO unique_code;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;
