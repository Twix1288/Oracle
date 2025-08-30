-- Create enum types for tasks
CREATE TYPE task_type AS ENUM (
  'feature',
  'bug',
  'documentation',
  'testing',
  'design',
  'research',
  'maintenance'
);

CREATE TYPE task_status AS ENUM (
  'todo',
  'in_progress',
  'completed',
  'blocked'
);

CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type task_type NOT NULL,
    status task_status NOT NULL DEFAULT 'todo',
    priority task_priority NOT NULL DEFAULT 'medium',
    assigned_to UUID REFERENCES public.members(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours FLOAT,
    actual_hours FLOAT,
    tags TEXT[],
    dependencies UUID[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task comments table
CREATE TABLE public.task_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task history table
CREATE TABLE public.task_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster task queries
CREATE INDEX idx_tasks_team ON public.tasks(team_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX idx_task_history_task ON public.task_history(task_id);

-- Create function to auto-assign task
CREATE OR REPLACE FUNCTION auto_assign_task(
    p_task_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_team_id UUID;
    v_assigned_to UUID;
BEGIN
    -- Get task's team
    SELECT team_id INTO v_team_id
    FROM tasks
    WHERE id = p_task_id;

    -- Find least loaded team member
    SELECT m.id INTO v_assigned_to
    FROM members m
    LEFT JOIN tasks t ON t.assigned_to = m.id AND t.status != 'completed'
    WHERE m.team_id = v_team_id
    AND m.role = 'builder'
    GROUP BY m.id
    ORDER BY COUNT(t.id) ASC
    LIMIT 1;

    -- Update task
    UPDATE tasks
    SET 
        assigned_to = v_assigned_to,
        updated_at = NOW()
    WHERE id = p_task_id;

    RETURN v_assigned_to;
END;
$$ LANGUAGE plpgsql;

-- Create function to track task changes
CREATE OR REPLACE FUNCTION track_task_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Track status changes
        IF NEW.status != OLD.status THEN
            INSERT INTO task_history (
                task_id,
                changed_by,
                field_name,
                old_value,
                new_value
            ) VALUES (
                NEW.id,
                COALESCE(current_setting('app.current_user_id', true), NEW.assigned_to::text)::uuid,
                'status',
                OLD.status::text,
                NEW.status::text
            );
        END IF;

        -- Track assignment changes
        IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
            INSERT INTO task_history (
                task_id,
                changed_by,
                field_name,
                old_value,
                new_value
            ) VALUES (
                NEW.id,
                COALESCE(current_setting('app.current_user_id', true), NEW.assigned_to::text)::uuid,
                'assigned_to',
                OLD.assigned_to::text,
                NEW.assigned_to::text
            );
        END IF;

        -- Track priority changes
        IF NEW.priority != OLD.priority THEN
            INSERT INTO task_history (
                task_id,
                changed_by,
                field_name,
                old_value,
                new_value
            ) VALUES (
                NEW.id,
                COALESCE(current_setting('app.current_user_id', true), NEW.assigned_to::text)::uuid,
                'priority',
                OLD.priority::text,
                NEW.priority::text
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task changes
CREATE TRIGGER task_changes_trigger
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION track_task_changes();

-- Create function to get task statistics
CREATE OR REPLACE FUNCTION get_task_stats(
    p_team_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    task_type task_type,
    total_count BIGINT,
    completed_count BIGINT,
    blocked_count BIGINT,
    avg_completion_time INTERVAL,
    avg_actual_vs_estimated FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.type,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE t.status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE t.status = 'blocked') as blocked_count,
        AVG(
            CASE 
                WHEN t.status = 'completed' 
                THEN age(
                    (SELECT created_at 
                     FROM task_history 
                     WHERE task_id = t.id 
                     AND field_name = 'status' 
                     AND new_value = 'completed' 
                     ORDER BY created_at DESC 
                     LIMIT 1),
                    t.created_at
                )
            END
        ) as avg_completion_time,
        CASE
            WHEN SUM(t.estimated_hours) > 0
            THEN SUM(t.actual_hours) / SUM(t.estimated_hours)
            ELSE NULL
        END as avg_actual_vs_estimated
    FROM tasks t
    WHERE t.team_id = p_team_id
    AND t.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY t.type
    ORDER BY total_count DESC;
END;
$$;

-- Create view for task overview
CREATE OR REPLACE VIEW task_overview AS
SELECT
    t.*,
    m.name as assignee_name,
    m.role as assignee_role,
    c.name as creator_name,
    tm.name as team_name,
    (
        SELECT COUNT(*)
        FROM task_comments tc
        WHERE tc.task_id = t.id
    ) as comment_count,
    (
        SELECT COUNT(*)
        FROM task_history th
        WHERE th.task_id = t.id
    ) as change_count,
    (
        SELECT string_agg(d.title, ', ')
        FROM tasks d
        WHERE d.id = ANY(t.dependencies)
    ) as dependency_names
FROM tasks t
LEFT JOIN members m ON m.id = t.assigned_to
LEFT JOIN members c ON c.id = t.created_by
LEFT JOIN teams tm ON tm.id = t.team_id;
