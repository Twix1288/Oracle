-- Update super-oracle edge function to work with new project-based system
-- Create a comprehensive function that works with existing and new schema

-- First, let's add some sample data to the existing tables to support the Oracle
INSERT INTO documents (content, source_type, metadata) VALUES
-- Project management resources
('Project Planning and Management Guide: Define clear project goals, create realistic timelines, break down work into manageable tasks, track progress regularly, communicate with stakeholders, manage risks proactively, and adapt to changes. Use tools like Gantt charts, Kanban boards, and regular check-ins to stay organized.', 'guide', '{"title": "Project Management Best Practices", "category": "management", "tags": ["project", "planning", "management"]}'),

-- Team collaboration resources  
('Effective Team Collaboration: Establish clear communication channels, define roles and responsibilities, create shared goals, foster psychological safety, encourage diverse perspectives, use collaborative tools effectively, and maintain regular team retrospectives. Focus on building trust and open communication.', 'guide', '{"title": "Team Collaboration Guide", "category": "teamwork", "tags": ["collaboration", "communication", "teamwork"]}'),

-- Innovation and development resources
('Innovation Process Framework: Start with problem identification, conduct user research, brainstorm solutions, create prototypes, test with users, iterate based on feedback, and scale successful solutions. Embrace failure as learning opportunities and maintain a user-centric approach.', 'guide', '{"title": "Innovation Framework", "category": "innovation", "tags": ["innovation", "development", "process"]}'),

-- Mentorship resources
('Mentorship Best Practices: Listen actively, ask powerful questions, provide constructive feedback, share experiences without prescribing solutions, help mentees set goals, connect them with resources and networks, be consistent and reliable, and support their growth journey.', 'guide', '{"title": "Mentorship Guide", "category": "mentorship", "tags": ["mentorship", "guidance", "coaching"]}'),

-- Technical development resources
('Software Development Lifecycle: Requirements gathering, system design, implementation, testing, deployment, and maintenance. Use version control, write clean code, implement automated testing, conduct code reviews, and follow security best practices throughout the process.', 'guide', '{"title": "Software Development Guide", "category": "technical", "tags": ["development", "software", "lifecycle"]}'),

-- Startup and business resources
('Startup Success Framework: Validate your idea through customer interviews, build a minimum viable product, measure key metrics, learn from user feedback, pivot when necessary, focus on product-market fit, build a strong team, and manage cash flow carefully.', 'guide', '{"title": "Startup Success Guide", "category": "business", "tags": ["startup", "business", "entrepreneurship"]}');

-- Add some Oracle command examples and responses
INSERT INTO oracle_logs (user_role, query, response, sources_count) VALUES
('builder', 'How do I start a new project?', 'To start a new project: 1) Define your problem and target users, 2) Research existing solutions, 3) Create a project plan with milestones, 4) Set up your development environment, 5) Build an MVP, 6) Test with real users, 7) Iterate based on feedback. Focus on solving a real problem that people care about.', 3),
('mentor', 'Best practices for guiding builders?', 'Effective mentoring involves: Active listening, asking open-ended questions, sharing experiences without prescribing solutions, helping set realistic goals, providing constructive feedback, connecting mentees with resources, and supporting their growth journey. Focus on empowerment over instruction.', 2),
('lead', 'How to manage multiple teams effectively?', 'Managing multiple teams requires: Clear communication channels, defined roles and responsibilities, regular check-ins with team leads, consistent processes across teams, proper resource allocation, conflict resolution skills, and maintaining visibility into each teams progress and blockers.', 4);

-- Create a simple function to enhance Oracle responses
CREATE OR REPLACE FUNCTION enhance_oracle_response(
  query_text TEXT,
  user_role TEXT,
  response_text TEXT
) RETURNS JSONB AS $$
BEGIN
  -- Return enhanced response with metadata
  RETURN jsonb_build_object(
    'answer', response_text,
    'role_context', user_role,
    'query', query_text,
    'suggestions', CASE 
      WHEN user_role = 'builder' THEN jsonb_build_array(
        'Consider breaking your project into smaller milestones',
        'Research similar solutions and identify differentiation',
        'Start with user interviews to validate assumptions'
      )
      WHEN user_role = 'mentor' THEN jsonb_build_array(
        'Focus on asking questions rather than giving answers',
        'Connect builders with relevant resources and examples',
        'Help them think through problems systematically'
      )
      WHEN user_role = 'lead' THEN jsonb_build_array(
        'Monitor team health and productivity metrics',
        'Facilitate cross-team collaboration and knowledge sharing',
        'Ensure teams have clear goals and adequate resources'
      )
      ELSE jsonb_build_array(
        'Explore different roles to find your best fit',
        'Learn from others experiences and best practices',
        'Start with small experiments to test ideas'
      )
    END,
    'resources', jsonb_build_array(
      jsonb_build_object('title', 'Project Management Guide', 'type', 'guide'),
      jsonb_build_object('title', 'Team Collaboration Best Practices', 'type', 'guide'),
      jsonb_build_object('title', 'Innovation Framework', 'type', 'framework')
    ),
    'commands', jsonb_build_array(
      '/resources - View available guides and resources',
      '/examples - See practical examples for your role',
      '/connect - Find relevant team members or mentors',
      '/plan - Get help creating project roadmaps'
    )
  );
END;
$$ LANGUAGE plpgsql;