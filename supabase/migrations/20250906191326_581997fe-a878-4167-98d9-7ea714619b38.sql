-- Fix security warnings by setting search_path for the new functions
ALTER FUNCTION public.update_team_activity() SET search_path = public;
ALTER FUNCTION public.generate_oracle_project_summary() SET search_path = public;