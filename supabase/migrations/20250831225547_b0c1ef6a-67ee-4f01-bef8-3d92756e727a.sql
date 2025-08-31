-- Reset any existing profile to ensure clean state for testing
UPDATE profiles SET onboarding_completed = false, role = 'unassigned' WHERE onboarding_completed = true;