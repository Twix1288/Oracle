-- Add sample teams for onboarding testing
INSERT INTO public.teams (id, name, description, stage, access_code, created_by, tags)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Team Alpha', 'Building an AI-powered project management tool for startups', 'ideation', 'ALPHA123', NULL, ARRAY['AI', 'SaaS', 'Startup']),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Team Beta', 'Developing a decentralized finance lending platform', 'validation', 'BETA456', NULL, ARRAY['DeFi', 'Blockchain', 'Finance']),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Team Gamma', 'Creating an educational VR experience for K-12 students', 'development', 'GAMMA789', NULL, ARRAY['EdTech', 'VR', 'Education']),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Team Delta', 'Launching a sustainable e-commerce platform for local artisans', 'testing', 'DELTA012', NULL, ARRAY['eCommerce', 'Sustainability', 'Local']),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Team Epsilon', 'Researching quantum computing applications for drug discovery', 'launch', 'EPSILON345', NULL, ARRAY['Quantum', 'BioTech', 'Research'])
ON CONFLICT (id) DO NOTHING;

-- Add team statuses
INSERT INTO public.team_status (team_id, current_status, pending_actions)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Brainstorming core features and user experience', ARRAY['Conduct user research', 'Define MVP scope', 'Create wireframes']),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Validating market demand and user needs', ARRAY['Complete user interviews', 'Analyze competitor landscape', 'Define tokenomics']),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Building core VR environment and interactions', ARRAY['Implement user authentication', 'Create 3D models', 'Set up VR controls']),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Testing user flows and payment integration', ARRAY['Fix checkout bugs', 'Optimize mobile experience', 'Test payment gateways']),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Preparing for public beta launch', ARRAY['Finalize documentation', 'Set up monitoring', 'Prepare launch materials'])
ON CONFLICT (team_id) DO NOTHING;
