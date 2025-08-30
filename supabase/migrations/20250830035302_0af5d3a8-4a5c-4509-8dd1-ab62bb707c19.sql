-- Remove all Discord-related functionality

-- Drop Discord-related functions
DROP FUNCTION IF EXISTS public.find_or_create_discord_profile(text, text);
DROP FUNCTION IF EXISTS public.link_discord_account(text);

-- Drop Discord-related tables
DROP TABLE IF EXISTS public.discord_link_requests CASCADE;
DROP TABLE IF EXISTS public.discord_guilds CASCADE;

-- Remove Discord-related columns from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS discord_id;

-- Remove Discord-related columns from teams table
ALTER TABLE public.teams DROP COLUMN IF EXISTS discord_category_id;
ALTER TABLE public.teams DROP COLUMN IF EXISTS discord_general_channel_id;
ALTER TABLE public.teams DROP COLUMN IF EXISTS discord_progress_channel_id;