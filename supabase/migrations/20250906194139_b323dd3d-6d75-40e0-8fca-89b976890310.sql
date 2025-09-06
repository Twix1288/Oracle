-- Fix remaining trigger functions that might be missing search_path

-- Fix all trigger functions to ensure they have proper search_path
CREATE OR REPLACE FUNCTION public.update_team_activity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE teams SET last_activity = now() WHERE id = NEW.team_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_oracle_project_summary()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- Mark team for Oracle processing (will be handled by Oracle system)
  UPDATE teams 
  SET oracle_summary = 'Pending Oracle analysis...',
      last_activity = now()
  WHERE id = NEW.team_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_vectorize_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- Call function to store onboarding data as searchable documents
  PERFORM store_onboarding_as_documents(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_vectorize_team()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  PERFORM store_team_as_document(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_vectorize_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  PERFORM store_update_as_document(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_vectorize_oracle_log()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  PERFORM store_oracle_log_as_document(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_vectorize_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  PERFORM store_message_as_document(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_oracle_interaction_stats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- Update user's Oracle interaction count and timestamp
  UPDATE profiles 
  SET 
    oracle_interaction_count = COALESCE(oracle_interaction_count, 0) + 1,
    oracle_last_interaction = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$function$;