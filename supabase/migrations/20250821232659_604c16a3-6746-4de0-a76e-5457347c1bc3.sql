-- Create missing database function and improve bot integration
CREATE OR REPLACE FUNCTION public.find_or_create_discord_profile(p_discord_id text, p_discord_username text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_id uuid;
BEGIN
  -- Try to find existing profile by discord_id
  SELECT id INTO profile_id
  FROM public.profiles
  WHERE discord_id = p_discord_id;
  
  -- If not found, create new profile
  IF profile_id IS NULL THEN
    INSERT INTO public.profiles (discord_id, full_name, email, role)
    VALUES (p_discord_id, COALESCE(p_discord_username, 'Discord User'), p_discord_id || '@discord.local', 'guest')
    RETURNING id INTO profile_id;
  END IF;
  
  RETURN profile_id;
END;
$$;