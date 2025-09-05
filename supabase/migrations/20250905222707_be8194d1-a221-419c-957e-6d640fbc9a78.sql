-- Add functions to store messages, updates, and oracle logs as documents

-- Function to store messages as documents for RAG
CREATE OR REPLACE FUNCTION public.store_message_as_document(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  message_record messages;
  sender_profile profiles;
  content_text text;
BEGIN
  -- Get message with sender info
  SELECT m.*, p.full_name, p.role, p.skills 
  INTO message_record, sender_profile.full_name, sender_profile.role, sender_profile.skills
  FROM messages m
  JOIN profiles p ON p.id = m.sender_id
  WHERE m.id = p_message_id;
  
  IF message_record IS NULL THEN
    RETURN;
  END IF;
  
  content_text := format(
    'Message from %s (%s): %s
    Sender Skills: %s
    Team Context: Team %s conversation',
    COALESCE(sender_profile.full_name, 'Unknown'),
    COALESCE(sender_profile.role::text, 'unassigned'),
    message_record.content,
    COALESCE(array_to_string(sender_profile.skills, ', '), ''),
    COALESCE(message_record.team_id::text, 'No Team')
  );
  
  INSERT INTO documents (content, content_type, source_id, source_table, metadata)
  VALUES (
    content_text,
    'message',
    message_record.team_id, -- Use team_id as source_id for team-scoped access
    'messages',
    jsonb_build_object(
      'message_id', p_message_id,
      'sender_id', message_record.sender_id,
      'sender_name', sender_profile.full_name,
      'sender_role', sender_profile.role,
      'team_id', message_record.team_id,
      'created_at', message_record.created_at
    )
  );
END;
$function$;

-- Function to store updates as documents for RAG
CREATE OR REPLACE FUNCTION public.store_update_as_document(p_update_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  update_record updates;
  creator_profile profiles;
  content_text text;
BEGIN
  -- Get update with creator info
  SELECT u.*, p.full_name, p.role 
  INTO update_record, creator_profile.full_name, creator_profile.role
  FROM updates u
  JOIN profiles p ON p.id = u.created_by
  WHERE u.id = p_update_id;
  
  IF update_record IS NULL THEN
    RETURN;
  END IF;
  
  content_text := format(
    'Team Update (%s) by %s (%s): %s',
    COALESCE(update_record.type::text, 'note'),
    COALESCE(creator_profile.full_name, 'Unknown'),
    COALESCE(creator_profile.role::text, 'unassigned'),
    update_record.content
  );
  
  INSERT INTO documents (content, content_type, source_id, source_table, metadata)
  VALUES (
    content_text,
    'update',
    update_record.team_id, -- Use team_id as source_id for team-scoped access
    'updates',
    jsonb_build_object(
      'update_id', p_update_id,
      'creator_id', update_record.created_by,
      'creator_name', creator_profile.full_name,
      'type', update_record.type,
      'team_id', update_record.team_id,
      'created_at', update_record.created_at
    )
  );
END;
$function$;

-- Function to store oracle interactions as documents for learning
CREATE OR REPLACE FUNCTION public.store_oracle_log_as_document(p_log_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  log_record oracle_logs;
  user_profile profiles;
  content_text text;
BEGIN
  -- Get oracle log with user info
  SELECT ol.*, p.full_name, p.role 
  INTO log_record, user_profile.full_name, user_profile.role
  FROM oracle_logs ol
  JOIN profiles p ON p.id = ol.user_id
  WHERE ol.id = p_log_id;
  
  IF log_record IS NULL THEN
    RETURN;
  END IF;
  
  content_text := format(
    'Oracle Query by %s (%s): %s
    Response: %s
    Query Type: %s
    User Satisfaction: %s',
    COALESCE(user_profile.full_name, 'Unknown'),
    COALESCE(user_profile.role::text, 'unassigned'),
    log_record.query,
    COALESCE(substring(log_record.response from 1 for 500), ''), -- Limit response length
    COALESCE(log_record.query_type, 'chat'),
    COALESCE(log_record.user_satisfaction::text, 'unrated')
  );
  
  INSERT INTO documents (content, content_type, source_id, source_table, metadata)
  VALUES (
    content_text,
    'oracle_log',
    COALESCE(log_record.team_id, log_record.user_id), -- Use team_id if available, otherwise user_id
    'oracle_logs',
    jsonb_build_object(
      'log_id', p_log_id,
      'user_id', log_record.user_id,
      'user_name', user_profile.full_name,
      'query_type', log_record.query_type,
      'team_id', log_record.team_id,
      'user_satisfaction', log_record.user_satisfaction,
      'created_at', log_record.created_at
    )
  );
END;
$function$;

-- Create triggers to automatically store messages, updates, and oracle logs
CREATE OR REPLACE FUNCTION public.auto_vectorize_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM store_message_as_document(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER message_auto_vectorize
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_vectorize_message();

CREATE OR REPLACE FUNCTION public.auto_vectorize_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM store_update_as_document(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_auto_vectorize
AFTER INSERT ON public.updates
FOR EACH ROW
EXECUTE FUNCTION public.auto_vectorize_update();

CREATE OR REPLACE FUNCTION public.auto_vectorize_oracle_log()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM store_oracle_log_as_document(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER oracle_log_auto_vectorize
AFTER INSERT ON public.oracle_logs
FOR EACH ROW
EXECUTE FUNCTION public.auto_vectorize_oracle_log();