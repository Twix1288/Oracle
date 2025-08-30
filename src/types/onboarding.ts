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
  projectGoal: string;
  currentStage: string;
  mentorshipNeeds: string;
  description: string;
  accessCode: string;
  skills?: UserSkill[];
  experienceLevel?: ExperienceLevel;
  interests?: string[];
  preferredTechnologies?: string[];
  githubUsername?: string;
  portfolioUrl?: string;
  learningGoals?: string[];
}

export interface InitialTask {
  title: string;
  description: string;
  type: 'setup' | 'development' | 'learning' | 'documentation';
  priority: 'low' | 'medium' | 'high';
  estimatedHours: number;
  dependencies?: string[];
  resources?: string[];
}
