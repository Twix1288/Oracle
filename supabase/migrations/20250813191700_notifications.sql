-- Create enum types for notifications
CREATE TYPE notification_type AS ENUM (
  'team_update',
  'task_assigned',
  'task_completed',
  'mention',
  'broadcast',
  'milestone',
  'alert'
);

CREATE TYPE notification_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type notification_type NOT NULL,
    priority notification_priority NOT NULL DEFAULT 'medium',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    recipient_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    recipient_role user_role,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification broadcasts table for realtime
CREATE TABLE public.notification_broadcasts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster notification queries
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, read);
CREATE INDEX idx_notifications_team ON public.notifications(team_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- Create function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_notifications(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.notifications
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND read = TRUE
    AND type NOT IN ('milestone', 'alert');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.notifications
    SET
        read = TRUE,
        read_at = NOW()
    WHERE recipient_id = p_user_id
    AND read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get notification statistics
CREATE OR REPLACE FUNCTION get_notification_stats(
    p_user_id UUID,
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    notification_type notification_type,
    notification_priority notification_priority,
    total_count BIGINT,
    unread_count BIGINT,
    team_related_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.type,
        n.priority,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE NOT n.read) as unread_count,
        COUNT(*) FILTER (WHERE n.team_id IS NOT NULL) as team_related_count
    FROM notifications n
    WHERE n.recipient_id = p_user_id
    AND n.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY n.type, n.priority
    ORDER BY n.priority DESC, total_count DESC;
END;
$$;

-- Create view for user notification summary
CREATE OR REPLACE VIEW user_notification_summary AS
SELECT
    n.recipient_id,
    m.name as recipient_name,
    m.role as recipient_role,
    COUNT(*) FILTER (WHERE NOT n.read) as unread_count,
    COUNT(*) FILTER (WHERE n.priority = 'urgent' AND NOT n.read) as urgent_unread_count,
    MAX(n.created_at) as latest_notification,
    jsonb_object_agg(
        n.type,
        jsonb_build_object(
            'total', COUNT(*) FILTER (WHERE n.type = n.type),
            'unread', COUNT(*) FILTER (WHERE n.type = n.type AND NOT n.read)
        )
    ) as notification_breakdown
FROM notifications n
JOIN members m ON m.id = n.recipient_id
WHERE n.created_at > NOW() - INTERVAL '30 days'
GROUP BY n.recipient_id, m.name, m.role;
