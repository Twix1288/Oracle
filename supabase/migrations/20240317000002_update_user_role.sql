-- Update your user role to lead
UPDATE public.members
SET role = 'lead'
WHERE id = '[YOUR_USER_ID]';  -- Replace with your user ID

-- If you don't know your user ID, you can use your email:
UPDATE public.members m
SET role = 'lead'
FROM auth.users u
WHERE u.email = '[YOUR_EMAIL]'  -- Replace with your email
AND m.id = u.id;

-- Also ensure you have the lead access code
UPDATE public.members m
SET access_code = 'LEAD2024'
FROM auth.users u
WHERE u.email = '[YOUR_EMAIL]'  -- Replace with your email
AND m.id = u.id;
