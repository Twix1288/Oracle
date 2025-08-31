export type UserSkill = 
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'ui_ux'
  | 'devops'
  | 'mobile'
  | 'data'
  | 'ai_ml'
  | 'blockchain'
  | 'security';

export type ExperienceLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export interface OnboardingData {
  // Basic Info
  name: string;
  bio: string;
  githubUsername?: string;
  portfolioUrl?: string;

  // Skills & Experience
  skills: UserSkill[];
  experienceLevel: ExperienceLevel;
  preferredTechnologies: string[];
  learningGoals: string[];

  // Role & Team
  role: 'builder' | 'mentor' | 'lead' | 'guest';
  teamId?: string;
  projectGoal?: string;
  mentorshipNeeds?: string;

  // Additional Context
  interests: string[];
  communicationStyle: string;
  workStyle: string;
  availability: string;
  timezone: string;

  // System Fields
  accessCode?: string;
  onboardingCompleted: boolean;
  lastUpdated: string;
}