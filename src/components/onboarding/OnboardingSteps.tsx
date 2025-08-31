import { UserSkill, ExperienceLevel } from "@/types/onboarding";

export const SKILLS: { value: UserSkill; label: string; description: string }[] = [
  { value: 'frontend', label: 'Frontend Development', description: 'Building user interfaces and web applications' },
  { value: 'backend', label: 'Backend Development', description: 'Server-side logic and APIs' },
  { value: 'fullstack', label: 'Full Stack Development', description: 'End-to-end application development' },
  { value: 'ui_ux', label: 'UI/UX Design', description: 'User interface and experience design' },
  { value: 'devops', label: 'DevOps', description: 'Infrastructure and deployment automation' },
  { value: 'mobile', label: 'Mobile Development', description: 'iOS, Android, and cross-platform apps' },
  { value: 'data', label: 'Data Engineering', description: 'Data pipelines and analytics' },
  { value: 'ai_ml', label: 'AI/ML', description: 'Artificial Intelligence and Machine Learning' },
  { value: 'blockchain', label: 'Blockchain', description: 'Distributed ledger technologies' },
  { value: 'security', label: 'Security', description: 'Application and infrastructure security' }
];

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: 'beginner', label: 'Beginner', description: '0-2 years of experience' },
  { value: 'intermediate', label: 'Intermediate', description: '2-5 years of experience' },
  { value: 'advanced', label: 'Advanced', description: '5-8 years of experience' },
  { value: 'expert', label: 'Expert', description: '8+ years of experience' }
];

export const ONBOARDING_STEPS = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Tell us about yourself',
    fields: [
      { name: 'name', label: 'Full Name', type: 'text', required: true },
      { name: 'bio', label: 'Bio', type: 'textarea', required: true },
      { name: 'githubUsername', label: 'GitHub Username', type: 'text', required: false },
      { name: 'portfolioUrl', label: 'Portfolio URL', type: 'url', required: false }
    ]
  },
  {
    id: 'skills',
    title: 'Skills & Experience',
    description: 'Share your technical background',
    fields: [
      { name: 'skills', label: 'Skills', type: 'multi-select', options: SKILLS, required: true },
      { name: 'experienceLevel', label: 'Experience Level', type: 'select', options: EXPERIENCE_LEVELS, required: true },
      { name: 'preferredTechnologies', label: 'Preferred Technologies', type: 'tags', required: true },
      { name: 'learningGoals', label: 'Learning Goals', type: 'textarea', required: true }
    ]
  },
  {
    id: 'role-team',
    title: 'Role & Team',
    description: 'Choose your role and team',
    fields: [
      { name: 'role', label: 'Role', type: 'role-select', required: true },
      { name: 'teamId', label: 'Team', type: 'team-select', required: false },
      { name: 'projectGoal', label: 'Project Goal', type: 'textarea', required: false },
      { name: 'mentorshipNeeds', label: 'Mentorship Needs', type: 'textarea', required: false }
    ]
  },
  {
    id: 'preferences',
    title: 'Work Preferences',
    description: 'Help us understand how you work best',
    fields: [
      { name: 'communicationStyle', label: 'Communication Style', type: 'textarea', required: true },
      { name: 'workStyle', label: 'Work Style', type: 'textarea', required: true },
      { name: 'availability', label: 'Availability', type: 'text', required: true },
      { name: 'timezone', label: 'Timezone', type: 'timezone-select', required: true }
    ]
  },
  {
    id: 'interests',
    title: 'Interests & Goals',
    description: 'Share your interests and aspirations',
    fields: [
      { name: 'interests', label: 'Interests', type: 'tags', required: true }
    ]
  }
];
