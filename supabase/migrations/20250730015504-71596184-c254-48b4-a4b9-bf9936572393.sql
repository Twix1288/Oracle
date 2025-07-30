-- Insert sample data for demonstration
INSERT INTO public.teams (name, description, stage, tags) VALUES
('EcoTech Solutions', 'Sustainable technology for environmental monitoring', 'development', ARRAY['sustainability', 'iot', 'monitoring']),
('HealthTrack AI', 'AI-powered personal health tracking and recommendations', 'testing', ARRAY['ai', 'health', 'mobile']),
('EduConnect', 'Platform connecting students with personalized tutors', 'ideation', ARRAY['education', 'platform', 'matching']);

-- Insert sample members
INSERT INTO public.members (name, role, team_id) 
SELECT 'Alex Chen', 'builder', id FROM public.teams WHERE name = 'EcoTech Solutions';

INSERT INTO public.members (name, role, team_id) 
SELECT 'Sarah Johnson', 'builder', id FROM public.teams WHERE name = 'HealthTrack AI';

INSERT INTO public.members (name, role, team_id) 
SELECT 'Mike Rodriguez', 'builder', id FROM public.teams WHERE name = 'EduConnect';

INSERT INTO public.members (name, role) VALUES
('Dr. Lisa Wang', 'mentor'),
('James Thompson', 'mentor'),
('Rachel Kim', 'lead');

-- Insert sample updates
INSERT INTO public.updates (team_id, content, type, created_by)
SELECT t.id, 'Completed MVP for sensor data collection. Working on cloud integration next.', 'daily', 'Alex Chen'
FROM public.teams t WHERE t.name = 'EcoTech Solutions';

INSERT INTO public.updates (team_id, content, type, created_by)
SELECT t.id, 'Beta testing phase started with 50 users. Initial feedback very positive!', 'milestone', 'Sarah Johnson'
FROM public.teams t WHERE t.name = 'HealthTrack AI';

INSERT INTO public.updates (team_id, content, type, created_by)
SELECT t.id, 'Had productive mentor meeting. Refined business model and identified key partnerships.', 'mentor_meeting', 'Mike Rodriguez'
FROM public.teams t WHERE t.name = 'EduConnect';

-- Insert sample knowledge base documents
INSERT INTO public.documents (content, metadata, source_type, role_visibility) VALUES
('How to conduct effective user interviews: Start with open-ended questions, avoid leading questions, and focus on understanding user behavior rather than opinions.', '{"category": "user_research", "tags": ["interviews", "research"]}', 'faq', ARRAY['builder'::user_role, 'mentor'::user_role, 'lead'::user_role]),

('Mentor best practices: Regular check-ins, active listening, asking powerful questions, providing honest feedback, and connecting teams with relevant resources.', '{"category": "mentoring", "tags": ["best_practices", "coaching"]}', 'faq', ARRAY['mentor'::user_role, 'lead'::user_role]),

('Incubator program overview: 12-week intensive program supporting early-stage startups with mentorship, resources, and funding opportunities.', '{"category": "program_info", "tags": ["overview", "public"]}', 'faq', ARRAY['builder'::user_role, 'mentor'::user_role, 'lead'::user_role, 'guest'::user_role]);