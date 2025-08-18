-- Fix critical security vulnerability: Remove overly permissive message access
-- The current policies have fallback conditions allowing any authenticated user to access all messages

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

-- Create secure policies that only allow actual participants to access messages

-- Users can only view messages they are directly involved in
CREATE POLICY "Users can view their own messages" 
ON public.messages 
FOR SELECT 
TO authenticated
USING (
  -- Direct participant (sender or receiver)
  sender_id = auth.uid()::text 
  OR receiver_id = auth.uid()::text
  -- OR broadcast messages to their role (where receiver_id is NULL and role matches)
  OR (
    receiver_id IS NULL 
    AND receiver_role::text = (
      SELECT role::text FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Users can only send messages as themselves
CREATE POLICY "Users can send messages as themselves" 
ON public.messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  sender_id = auth.uid()::text
);

-- Users can only mark messages as read if they are the receiver
CREATE POLICY "Users can mark their received messages as read" 
ON public.messages 
FOR UPDATE 
TO authenticated
USING (
  receiver_id = auth.uid()::text
)
WITH CHECK (
  receiver_id = auth.uid()::text
);

-- Allow leads to view all messages for moderation purposes
CREATE POLICY "Leads can view all messages for moderation" 
ON public.messages 
FOR SELECT 
TO authenticated
USING (
  get_user_role(auth.uid()) = 'lead'
);

-- Allow leads to manage messages (for moderation)
CREATE POLICY "Leads can manage messages for moderation" 
ON public.messages 
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'lead')
WITH CHECK (get_user_role(auth.uid()) = 'lead');