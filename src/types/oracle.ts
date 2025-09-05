export type UserRole = 'builder' | 'mentor' | 'lead' | 'guest' | 'unassigned';

export type TeamStage = 'ideation' | 'development' | 'testing' | 'launch' | 'growth';

export type UpdateType = 'daily' | 'milestone' | 'mentor_meeting';

// Enhanced Oracle Types for Industry-Level Features
export interface OracleContext {
  userProfile: UserProfile;
  teamContext: TeamContext;
  learningJourney: LearningJourney;
  interactionHistory: InteractionHistory;
  preferences: UserPreferences;
  expertise: ExpertiseProfile;
  goals: UserGoals;
  challenges: UserChallenges;
  opportunities: UserOpportunities;
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  skills: string[];
  preferredTechnologies: string[];
  learningGoals: string[];
  bio: string;
  availability: string;
  timezone: string;
  communicationStyle: string;
  workStyle: string;
  githubUsername?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  expertise: string[];
  interests: string[];
  projectGoal?: string;
  mentorshipNeeds?: string;
  onboardingCompleted: boolean;
  lastUpdated: string;
}

export interface TeamContext {
  id: string;
  name: string;
  stage: TeamStage;
  description?: string;
  tags?: string[];
  assignedMentorId?: string;
  members: TeamMember[];
  recentUpdates: TeamUpdate[];
  currentChallenges: string[];
  nextMilestones: string[];
  resources: TeamResource[];
  mentorGuidance: MentorGuidance[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: UserRole;
  skills: string[];
  currentFocus: string;
  availability: string;
  expertise: string[];
}

export interface TeamUpdate {
  id: string;
  content: string;
  type: UpdateType;
  createdBy: string;
  createdAt: string;
  impact: 'low' | 'medium' | 'high';
  category: 'progress' | 'challenge' | 'achievement' | 'learning';
}

export interface TeamResource {
  id: string;
  title: string;
  type: 'document' | 'tool' | 'link' | 'video' | 'course';
  url: string;
  description: string;
  relevance: number;
  tags: string[];
}

export interface MentorGuidance {
  id: string;
  mentorId: string;
  mentorName: string;
  advice: string;
  category: 'technical' | 'business' | 'strategy' | 'personal';
  createdAt: string;
  actionable: boolean;
}

export interface LearningJourney {
  currentPhase: 'onboarding' | 'skill-building' | 'project-work' | 'mentorship' | 'leadership';
  completedMilestones: string[];
  currentMilestone: string;
  nextMilestone: string;
  skillProgress: SkillProgress[];
  learningPath: LearningPath[];
  achievements: Achievement[];
  challenges: LearningChallenge[];
}

export interface SkillProgress {
  skill: string;
  currentLevel: number; // 0-100
  targetLevel: number;
  resources: string[];
  practiceExercises: string[];
  nextSteps: string[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  outcomes: string[];
  resources: string[];
  completed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'skill' | 'project' | 'leadership' | 'innovation';
  earnedAt: string;
  impact: 'personal' | 'team' | 'organization';
}

export interface LearningChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'technical' | 'conceptual' | 'practical';
  resources: string[];
  mentorSupport: boolean;
  completed: boolean;
}

export interface InteractionHistory {
  recentQueries: OracleQuery[];
  frequentTopics: string[];
  preferredQueryTypes: string[];
  responseSatisfaction: number;
  learningPatterns: LearningPattern[];
  improvementAreas: string[];
}

export interface OracleQuery {
  id: string;
  query: string;
  response: string;
  queryType: 'chat' | 'resources' | 'connect' | 'analyze' | 'graph' | 'multi_model';
  modelUsed: string;
  confidence: number;
  sources: number;
  processingTime: number;
  userSatisfaction?: number;
  followUpQuestions?: string[];
  createdAt: string;
  contextUsed: boolean;
  graphData?: any;
  multiModelInsights?: any;
  resources?: any[];
  connections?: any[];
}

export interface LearningPattern {
  pattern: string;
  frequency: number;
  effectiveness: number;
  recommendations: string[];
}

export interface UserPreferences {
  communicationStyle: 'direct' | 'collaborative' | 'visual' | 'detailed';
  learningStyle: 'hands-on' | 'theoretical' | 'social' | 'independent';
  responseDetail: 'concise' | 'detailed' | 'comprehensive';
  preferredFormats: ('text' | 'visual' | 'interactive' | 'video')[];
  technicalDepth: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  timeConstraints: 'quick' | 'standard' | 'thorough';
}

export interface ExpertiseProfile {
  primaryDomain: string;
  secondaryDomains: string[];
  yearsOfExperience: number;
  certifications: string[];
  projects: Project[];
  publications: Publication[];
  speakingEngagements: SpeakingEngagement[];
  mentorshipExperience: MentorshipExperience[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  role: string;
  impact: string;
  duration: string;
  completed: boolean;
}

export interface Publication {
  id: string;
  title: string;
  type: 'article' | 'paper' | 'blog' | 'tutorial';
  url: string;
  publishedAt: string;
  audience: string;
}

export interface SpeakingEngagement {
  id: string;
  title: string;
  event: string;
  audience: string;
  date: string;
  topic: string;
}

export interface MentorshipExperience {
  id: string;
  menteeCount: number;
  focusAreas: string[];
  successStories: string[];
  approach: string;
}

export interface UserGoals {
  shortTerm: Goal[];
  mediumTerm: Goal[];
  longTerm: Goal[];
  careerAspirations: string[];
  skillTargets: SkillTarget[];
  projectObjectives: ProjectObjective[];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  progress: number;
  milestones: string[];
  successCriteria: string[];
  priority: 'low' | 'medium' | 'high';
}

export interface SkillTarget {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  timeline: string;
  resources: string[];
  practicePlan: string[];
}

export interface ProjectObjective {
  id: string;
  title: string;
  description: string;
  successMetrics: string[];
  timeline: string;
  dependencies: string[];
  riskFactors: string[];
}

export interface UserChallenges {
  current: Challenge[];
  resolved: Challenge[];
  recurring: string[];
  supportNeeded: SupportNeed[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: 'technical' | 'business' | 'personal' | 'team';
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  attemptedSolutions: string[];
  mentorSupport: boolean;
  resources: string[];
  status: 'active' | 'resolved' | 'escalated';
  createdAt: string;
  resolvedAt?: string;
}

export interface SupportNeed {
  type: 'mentorship' | 'resources' | 'collaboration' | 'guidance';
  description: string;
  urgency: 'low' | 'medium' | 'high';
  preferredMentor?: string;
  timeline: string;
}

export interface UserOpportunities {
  current: Opportunity[];
  upcoming: Opportunity[];
  recommendations: OpportunityRecommendation[];
  networking: NetworkingOpportunity[];
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: 'learning' | 'collaboration' | 'leadership' | 'innovation';
  value: string;
  requirements: string[];
  timeline: string;
  effort: 'low' | 'medium' | 'high';
  mentorSupport: boolean;
  teamCollaboration: boolean;
}

export interface OpportunityRecommendation {
  id: string;
  opportunity: Opportunity;
  reason: string;
  fitScore: number;
  nextSteps: string[];
  mentorGuidance: string[];
}

export interface NetworkingOpportunity {
  id: string;
  title: string;
  description: string;
  type: 'event' | 'meetup' | 'conference' | 'workshop';
  date: string;
  location: string;
  attendees: string[];
  value: string;
  preparation: string[];
}

// Enhanced RAG and AI Types
export interface RAGDocument {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  role_visibility: UserRole[];
  source_type?: string;
  source_reference?: string;
  created_at: string;
  updated_at: string;
  embedding?: number[];
  relevance_score?: number;
  context_relationships?: string[];
  user_feedback?: UserFeedback[];
}

export interface UserFeedback {
  userId: string;
  rating: number; // 1-5
  comment?: string;
  helpful: boolean;
  createdAt: string;
}

export interface KnowledgeGraph {
  entities: GraphEntity[];
  relationships: GraphRelationship[];
  context: GraphContext;
  confidence: number;
  lastUpdated: string;
  learningRate: number;
}

export interface GraphEntity {
  id: string;
  name: string;
  type: 'person' | 'company' | 'technology' | 'concept' | 'project' | 'skill';
  relevance: number;
  description: string;
  metadata: Record<string, any>;
  connections: string[];
  confidence: number;
  lastSeen: string;
  userContext: string[];
}

export interface GraphRelationship {
  id: string;
  source: string;
  target: string;
  type: string;
  confidence: number;
  description: string;
  metadata: Record<string, any>;
  bidirectional: boolean;
  strength: number;
}

export interface GraphContext {
  nodes: GraphEntity[];
  edges: GraphRelationship[];
  clusters: GraphCluster[];
  insights: GraphInsight[];
}

export interface GraphCluster {
  id: string;
  name: string;
  entities: string[];
  theme: string;
  relevance: number;
  description: string;
}

export interface GraphInsight {
  id: string;
  type: 'pattern' | 'trend' | 'opportunity' | 'risk';
  description: string;
  confidence: number;
  evidence: string[];
  actionable: boolean;
  recommendations: string[];
}

// Multi-Model AI Types
export interface MultiModelResponse {
  primaryResponse: AIResponse;
  modelInsights: ModelInsight[];
  consensus: ModelConsensus;
  confidence: number;
  synthesis: ResponseSynthesis;
}

export interface AIResponse {
  model: string;
  response: string;
  confidence: number;
  reasoning: string;
  strengths: string[];
  limitations: string[];
  metadata: Record<string, any>;
}

export interface ModelInsight {
  model: string;
  insight: string;
  confidence: number;
  relevance: number;
  context: string;
}

export interface ModelConsensus {
  agreement: number;
  conflictingViews: string[];
  commonThemes: string[];
  recommendations: string[];
}

export interface ResponseSynthesis {
  finalResponse: string;
  synthesisMethod: string;
  confidence: number;
  reasoning: string;
  sources: string[];
}

// Advanced Oracle Response Types
export interface OracleResponse {
  answer: string;
  sources: number;
  context_used: boolean;
  model_used: string;
  confidence: number;
  processing_time: number;
  graph_data?: KnowledgeGraph;
  multi_model_insights?: MultiModelResponse;
  resources?: OracleResource[];
  connections?: OracleConnection[];
  entities?: GraphEntity[];
  relationships?: GraphRelationship[];
  search_strategy: string;
  fallback_used: boolean;
  personalization: PersonalizationMetrics;
  learning: LearningMetrics;
  nextActions: NextAction[];
  followUpQuestions: string[];
  userContext: UserContextSummary;
}

export interface OracleResource {
  id: string;
  title: string;
  url: string;
  type: 'document' | 'video' | 'tool' | 'course' | 'article' | 'tutorial';
  description: string;
  relevance: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  author: string;
  source: 'internal' | 'external' | 'ai_generated';
  tags: string[];
  userRating?: number;
  contextMatch: number;
  learningPath: string[];
}

export interface OracleConnection {
  id: string;
  name: string;
  title: string;
  company: string;
  expertise: string[];
  relevance: number;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  availability: string;
  mentorshipOffered: boolean;
  connectionStrength: number;
  mutualInterests: string[];
  introductionMessage?: string;
}

export interface PersonalizationMetrics {
  userContextMatch: number;
  skillLevelAlignment: number;
  learningStyleFit: number;
  goalRelevance: number;
  challengeAddressment: number;
  overallPersonalization: number;
}

export interface LearningMetrics {
  knowledgeGained: number;
  skillImprovement: number;
  confidenceBoost: number;
  nextStepsClarity: number;
  resourceUtilization: number;
}

export interface NextAction {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  dependencies: string[];
  resources: string[];
  mentorSupport: boolean;
  successCriteria: string[];
}

export interface UserContextSummary {
  role: UserRole;
  experienceLevel: string;
  currentFocus: string;
  teamStage: TeamStage;
  recentProgress: string[];
  currentChallenges: string[];
  learningGoals: string[];
  preferredCommunication: string;
  timeAvailability: string;
}

// Existing Types (keeping for backward compatibility)
export interface Team {
  id: string;
  name: string;
  description?: string;
  stage: TeamStage;
  tags?: string[];
  ai_summary?: string;
  assigned_mentor_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  name: string;
  role: UserRole;
  team_id?: string;
  user_id?: string;
  assigned_by?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Update {
  id: string;
  team_id: string;
  content: string;
  type: UpdateType;
  created_by?: string;
  created_at: string;
  updated_at: string;
  teams?: Team;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  tags?: string[];
  attendance?: string[];
  created_at: string;
  updated_at: string;
}

export interface TeamStatus {
  id: string;
  team_id: string;
  current_status?: string;
  last_update?: string;
  pending_actions?: string[];
  created_at: string;
  updated_at: string;
}

export interface AccessCode {
  id: string;
  code: string;
  team_id?: string;
  team_name?: string;
  description?: string;
  is_active: boolean;
  expires_at?: string;
  max_uses?: number;
  current_uses?: number;
  generated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BuilderAssignment {
  id: string;
  builder_name: string;
  team_id: string;
  access_code: string;
  assigned_at: string;
  assigned_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamColors {
  primary: string;
  secondary: string;
  accent: string;
  icon: string;
}