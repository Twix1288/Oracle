-- Fix remaining security vulnerabilities by setting search_path on remaining functions

-- Fix generate_access_code function
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN upper(substring(md5(random()::text) from 1 for 6));
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix update_oracle_interaction_stats function
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

-- Fix auto_vectorize_profile function
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