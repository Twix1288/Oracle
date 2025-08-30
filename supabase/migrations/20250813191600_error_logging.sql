-- Create enum types for error logging
CREATE TYPE error_type AS ENUM (
  'validation',
  'authentication',
  'authorization',
  'database',
  'external_service',
  'rate_limit',
  'internal'
);

CREATE TYPE error_severity AS ENUM (
  'info',
  'warning',
  'error',
  'critical'
);

-- Create error logs table
CREATE TABLE public.error_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type error_type NOT NULL,
    severity error_severity NOT NULL,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
    resolution_notes TEXT
);

-- Create index for faster error log queries
CREATE INDEX idx_error_logs_type_severity ON public.error_logs(type, severity);
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at);

-- Create function to clean up old error logs
CREATE OR REPLACE FUNCTION cleanup_error_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.error_logs
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND severity != 'critical'
    AND resolved_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get error statistics
CREATE OR REPLACE FUNCTION get_error_stats(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    error_type error_type,
    error_severity error_severity,
    error_count BIGINT,
    resolved_count BIGINT,
    avg_resolution_time INTERVAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.type,
        e.severity,
        COUNT(*) as error_count,
        COUNT(e.resolved_at) as resolved_count,
        AVG(e.resolved_at - e.created_at) as avg_resolution_time
    FROM error_logs e
    WHERE e.created_at BETWEEN start_date AND end_date
    GROUP BY e.type, e.severity
    ORDER BY e.severity DESC, error_count DESC;
END;
$$;

-- Create function to mark error as resolved
CREATE OR REPLACE FUNCTION resolve_error(
    p_error_id UUID,
    p_resolver_id UUID,
    p_notes TEXT
)
RETURNS error_logs
LANGUAGE plpgsql
AS $$
DECLARE
    updated_error error_logs;
BEGIN
    UPDATE error_logs
    SET
        resolved_at = NOW(),
        resolved_by = p_resolver_id,
        resolution_notes = p_notes
    WHERE id = p_error_id
    RETURNING * INTO updated_error;
    
    RETURN updated_error;
END;
$$;

-- Create view for unresolved critical errors
CREATE OR REPLACE VIEW unresolved_critical_errors AS
SELECT
    e.*,
    m.name as reported_by,
    m.role as reporter_role,
    age(NOW(), e.created_at) as error_age
FROM error_logs e
LEFT JOIN members m ON m.id = e.context->>'userId'
WHERE e.severity = 'critical'
AND e.resolved_at IS NULL
ORDER BY e.created_at DESC;
