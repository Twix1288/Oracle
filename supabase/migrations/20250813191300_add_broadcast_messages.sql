-- Add broadcast support to messages table
ALTER TABLE public.messages
ADD COLUMN is_broadcast BOOLEAN DEFAULT FALSE,
ADD COLUMN broadcast_type TEXT CHECK (broadcast_type IN ('all', 'team', 'role')),
ADD COLUMN broadcast_target TEXT; -- For storing team_id or role for targeted broadcasts

-- Create index for faster broadcast queries
CREATE INDEX idx_messages_broadcast ON public.messages (is_broadcast, broadcast_type, broadcast_target);

-- Create function to get broadcast messages for a user
CREATE OR REPLACE FUNCTION get_user_broadcasts(
  p_user_id UUID,
  p_role TEXT,
  p_team_id UUID
) RETURNS SETOF messages AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM messages
  WHERE is_broadcast = TRUE
  AND (
    broadcast_type = 'all'
    OR (broadcast_type = 'team' AND broadcast_target = p_team_id::TEXT)
    OR (broadcast_type = 'role' AND broadcast_target = p_role)
  )
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;
