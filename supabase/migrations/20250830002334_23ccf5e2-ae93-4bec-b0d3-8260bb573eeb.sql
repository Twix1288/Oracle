-- Add discord_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN discord_id TEXT UNIQUE;

-- Create bot_commands_log table
CREATE TABLE public.bot_commands_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  command_name TEXT NOT NULL,
  user_id TEXT,
  guild_id TEXT,
  command_data JSONB,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bot_commands_log ENABLE ROW LEVEL SECURITY;

-- Create policies for bot_commands_log
CREATE POLICY "Bot can insert command logs" 
ON public.bot_commands_log 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own bot command logs" 
ON public.bot_commands_log 
FOR SELECT 
USING ((user_id IN (SELECT profiles.id::text FROM profiles WHERE profiles.id = auth.uid())) OR (get_user_role(auth.uid()) = ANY (ARRAY['lead'::user_role, 'mentor'::user_role])));

-- Create discord_link_requests table
CREATE TABLE public.discord_link_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  link_code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  linked_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discord_link_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "System can create link requests" 
ON public.discord_link_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update link requests" 
ON public.discord_link_requests 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can use link codes" 
ON public.discord_link_requests 
FOR SELECT 
USING ((auth.uid() IS NOT NULL) AND (expires_at > now()) AND (used_at IS NULL));