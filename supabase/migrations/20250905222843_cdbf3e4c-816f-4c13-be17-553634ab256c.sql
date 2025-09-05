-- Fix security warnings by setting search_path for the new functions

ALTER FUNCTION public.store_message_as_document(uuid) SET search_path = public;
ALTER FUNCTION public.store_update_as_document(uuid) SET search_path = public;
ALTER FUNCTION public.store_oracle_log_as_document(uuid) SET search_path = public;
ALTER FUNCTION public.auto_vectorize_message() SET search_path = public;
ALTER FUNCTION public.auto_vectorize_update() SET search_path = public;
ALTER FUNCTION public.auto_vectorize_oracle_log() SET search_path = public;