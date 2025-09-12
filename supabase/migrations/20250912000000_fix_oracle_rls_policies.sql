-- Fix RLS policies to make Oracle commands functional
-- This migration fixes the overly restrictive RLS policies that were preventing Oracle commands from working

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Messages are viewable by team members" ON public.messages;
DROP POLICY IF EXISTS "Team members can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create their own updates" ON public.updates;
DROP POLICY IF EXISTS "Users can create oracle logs" ON public.oracle_logs;

-- Create more permissive policies for Oracle system to work

-- Messages policies - allow authenticated users to send messages
CREATE POLICY "Authenticated users can view messages" ON public.messages 
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can send messages" ON public.messages 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = sender_id::text);

-- Updates policies - allow authenticated users to create updates
CREATE POLICY "Authenticated users can view updates" ON public.updates 
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create updates" ON public.updates 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text);

-- Oracle logs policies - allow authenticated users to create logs
CREATE POLICY "Authenticated users can view oracle logs" ON public.oracle_logs 
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create oracle logs" ON public.oracle_logs 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text);

-- Also allow service role to create logs (for backend functions)
CREATE POLICY "Service role can create oracle logs" ON public.oracle_logs 
FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Allow service role to create messages and updates (for backend functions)
CREATE POLICY "Service role can create messages" ON public.messages 
FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can create updates" ON public.updates 
FOR INSERT WITH CHECK (auth.role() = 'service_role');
