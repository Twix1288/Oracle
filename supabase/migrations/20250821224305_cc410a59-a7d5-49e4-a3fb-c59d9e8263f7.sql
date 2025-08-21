-- First create a test team
INSERT INTO teams (
  name, 
  description, 
  stage
) VALUES (
  'Test Team Alpha', 
  'Demo team for testing builder dashboard access', 
  'ideation'
);

-- Update the access code to assign it to this team
UPDATE access_codes 
SET team_id = (SELECT id FROM teams WHERE name = 'Test Team Alpha')
WHERE code = 'BUILD-TEST-2025';