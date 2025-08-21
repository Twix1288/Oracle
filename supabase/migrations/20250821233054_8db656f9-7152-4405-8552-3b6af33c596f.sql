-- Create table for Discord account linking requests
CREATE TABLE public.discord_link_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  link_code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NULL,
  linked_user_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discord_link_requests ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to use linking codes
CREATE POLICY "Authenticated users can use link codes" 
ON public.discord_link_requests 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND expires_at > now() AND used_at IS NULL);

-- Policy for system to insert link requests
CREATE POLICY "System can create link requests" 
ON public.discord_link_requests 
FOR INSERT 
WITH CHECK (true);

-- Policy for system to update link requests
CREATE POLICY "System can update link requests" 
ON public.discord_link_requests 
FOR UPDATE 
USING (true);

-- Function to link Discord account to authenticated user
CREATE OR REPLACE FUNCTION public.link_discord_account(p_link_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link_request RECORD;
  v_existing_profile RECORD;
BEGIN
  -- Find valid link request
  SELECT * INTO v_link_request 
  FROM public.discord_link_requests 
  WHERE link_code = p_link_code 
    AND expires_at > now() 
    AND used_at IS NULL
    AND linked_user_id IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired link code');
  END IF;
  
  -- Check if Discord account is already linked to another user
  SELECT * INTO v_existing_profile
  FROM public.profiles
  WHERE discord_id = v_link_request.discord_id 
    AND id != auth.uid();
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Discord account already linked to another user');
  END IF;
  
  -- Update user's profile with Discord info
  UPDATE public.profiles 
  SET 
    discord_id = v_link_request.discord_id,
    updated_at = now()
  WHERE id = auth.uid();
  
  -- Mark link request as used
  UPDATE public.discord_link_requests
  SET 
    used_at = now(),
    linked_user_id = auth.uid()
  WHERE id = v_link_request.id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Discord account linked successfully',
    'discord_username', v_link_request.discord_username
  );
END;
$$;