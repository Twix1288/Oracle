-- Add Discord support to existing database schema

-- Discord guilds (servers) table
CREATE TABLE public.discord_guilds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id text NOT NULL UNIQUE,
  guild_name text NOT NULL,
  is_active boolean DEFAULT true,
  webhook_url text,
  system_channel_id text,
  setup_completed boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add Discord ID to profiles table
ALTER TABLE public.profiles ADD COLUMN discord_id text UNIQUE;

-- Bot commands log table
CREATE TABLE public.bot_commands_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  guild_id text REFERENCES public.discord_guilds(guild_id),
  command_name text NOT NULL,
  command_data jsonb,
  response_time_ms integer,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Discord channel mappings for teams
ALTER TABLE public.teams ADD COLUMN discord_category_id text;
ALTER TABLE public.teams ADD COLUMN discord_general_channel_id text;
ALTER TABLE public.teams ADD COLUMN discord_progress_channel_id text;

-- Enable RLS on new tables
ALTER TABLE public.discord_guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_commands_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for Discord guilds
CREATE POLICY "Leads can manage Discord guilds"
ON public.discord_guilds
FOR ALL
USING (get_user_role(auth.uid()) = 'lead');

CREATE POLICY "Users can view active Discord guilds"
ON public.discord_guilds
FOR SELECT
USING (is_active = true);

-- RLS policies for bot commands log
CREATE POLICY "Users can view their own bot command logs"
ON public.bot_commands_log
FOR SELECT
USING (user_id IN (
  SELECT id FROM public.profiles WHERE profiles.id = auth.uid()
) OR get_user_role(auth.uid()) = ANY(ARRAY['lead'::user_role, 'mentor'::user_role]));

CREATE POLICY "Bot can insert command logs"
ON public.bot_commands_log
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Add triggers for updated_at
CREATE TRIGGER update_discord_guilds_updated_at
BEFORE UPDATE ON public.discord_guilds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to find or create Discord profile
CREATE OR REPLACE FUNCTION public.find_or_create_discord_profile(
  p_discord_id text,
  p_discord_username text DEFAULT null
) RETURNS uuid
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