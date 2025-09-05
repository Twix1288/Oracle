-- Add user_types column to profiles table
ALTER TABLE public.profiles ADD COLUMN user_types text[];