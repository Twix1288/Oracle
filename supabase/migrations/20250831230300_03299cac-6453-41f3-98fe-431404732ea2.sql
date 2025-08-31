-- Fix user profile with proper role assignment
UPDATE profiles 
SET role = 'builder', 
    onboarding_completed = false
WHERE id = '9a76f5ed-3ec1-432b-bc33-3e8e7b994f7e';

-- Ensure the teams table has proper descriptions
UPDATE teams 
SET description = 'AI-powered platform development team'
WHERE name = 'Oracle' AND description IS NULL;

UPDATE teams 
SET description = 'High-performance building team'
WHERE name = 'Bol' AND description IS NULL;

UPDATE teams 
SET description = 'Dynamic development collective'
WHERE name = 'Team Tremors' AND description IS NULL;