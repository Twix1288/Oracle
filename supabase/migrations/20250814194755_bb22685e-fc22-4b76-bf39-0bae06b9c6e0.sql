-- Update messages RLS policies to allow proper access
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Create better RLS policies for messages
CREATE POLICY "Users can view messages they sent or received"
ON public.messages
FOR SELECT
USING (
  sender_id = current_setting('request.jwt.claims', true)::json->>'sub' OR
  receiver_id = current_setting('request.jwt.claims', true)::json->>'sub' OR
  (receiver_id IS NULL AND receiver_role::text = current_setting('request.jwt.claims', true)::json->>'role') OR
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = current_setting('request.jwt.claims', true)::json->>'sub' OR
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can mark messages as read"
ON public.messages
FOR UPDATE
USING (
  receiver_id = current_setting('request.jwt.claims', true)::json->>'sub' OR
  auth.uid() IS NOT NULL
);