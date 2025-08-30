-- Clean up all existing user data to start fresh
DELETE FROM public.profiles;
DELETE FROM public.access_codes;
DELETE FROM public.teams;
DELETE FROM public.members;
DELETE FROM public.updates;
DELETE FROM public.messages;
DELETE FROM public.role_assignments;

-- Clean up auth users (this will cascade to profiles due to foreign key)
-- Note: This requires careful handling and should be done with caution