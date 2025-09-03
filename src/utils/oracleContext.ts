import { supabase } from "@/integrations/supabase/client";
import type { 
  OnboardingData, 
  UserSkill, 
  ExperienceLevel,
  OracleContext,
  UserProfile,
  TeamContext,
  LearningJourney,
  InteractionHistory,
  UserPreferences,
  ExpertiseProfile,
  UserGoals,
  UserChallenges,
  UserOpportunities,
  KnowledgeGraph,
  OracleResponse,
  PersonalizationMetrics,
  LearningMetrics,
  NextAction
} from "@/types/oracle";

// Enhanced Oracle Context Service - Industry Level Personalization
export class OracleContextService {
  private static instance: OracleContextService;
  private userContextCache: Map<string, OracleContext> = new Map();
  private knowledgeGraphCache: Map<string, KnowledgeGraph> = new Map();

  static getInstance(): OracleContextService {
    if (!OracleContextService.instance) {
      OracleContextService.instance = new OracleContextService();
    }
    return OracleContextService.instance;
  }

  // Store comprehensive user context for Oracle personalization
  async storeUserContext(userId: string, data: OnboardingData): Promise<void> {
    try {
      const contextString = this.createComprehensiveContextString(data);
      const enhancedMetadata = this.createEnhancedMetadata(data);

      // Store in documents table for RAG with enhanced context
      const { error: docError } = await supabase
        .from('documents')
        .insert({
          content: contextString,
          metadata: enhancedMetadata,
          source_type: 'user_profile_enhanced',
          role_visibility: ['lead', 'mentor', data.role],
          team_visibility: data.teamId ? [data.teamId] : [],
          embedding: await this.generateContextEmbedding(contextString)
        });

      if (docError) throw docError;

      // Store enhanced profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          availability: data.availability,
          bio: data.bio || '',
          skills: data.skills,
          experience_level: data.experienceLevel,
          learning_goals: data.learningGoals,
          preferred_technologies: data.preferredTechnologies,
          communication_style: data.communicationStyle,
          work_style: data.workStyle,
          timezone: data.timezone,
          onboarding_completed: true,
          oracle_personalization: true
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Create learning journey tracking
      await this.createLearningJourney(userId, data);

      // Initialize interaction history
      await this.initializeInteractionHistory(userId);

      console.log(`Enhanced user context stored for user: ${userId}`);

    } catch (error) {
      console.error('Error storing enhanced user context:', error);
      throw error;
    }
  }

  // Create comprehensive context string for deep personalization
  private createComprehensiveContextString(data: OnboardingData): string {
    return `
# Enhanced User Profile for Oracle Personalization

## Personal Information
- **Name**: ${data.name}
- **Role**: ${data.role}
- **Experience Level**: ${data.experienceLevel}
- **Bio**: ${data.bio}

## Technical Expertise
- **Primary Skills**: ${data.skills.join(', ')}
- **Preferred Technologies**: ${data.preferredTechnologies.join(', ')}
- **Learning Goals**: ${data.learningGoals.join(', ')}
- **Project Goal**: ${data.projectGoal || 'Not specified'}

## Work Style & Preferences
- **Communication Style**: ${data.communicationStyle}
- **Work Style**: ${data.workStyle}
- **Availability**: ${data.availability}
- **Timezone**: ${data.timezone}

## Professional Development
- **Mentorship Needs**: ${data.mentorshipNeeds || 'Not specified'}
- **Interests**: ${data.interests.join(', ')}
- **Career Aspirations**: ${this.inferCareerAspirations(data)}
- **Learning Preferences**: ${this.inferLearningPreferences(data)}

## Context & Relationships
- **Team Context**: ${data.teamId ? 'Assigned to team' : 'No team assignment'}
- **GitHub**: ${data.githubUsername || 'Not provided'}
- **Portfolio**: ${data.portfolioUrl || 'Not provided'}

## Oracle Personalization Preferences
- **Response Detail**: ${this.inferResponseDetail(data)}
- **Technical Depth**: ${this.inferTechnicalDepth(data)}
- **Learning Approach**: ${this.inferLearningApproach(data)}
- **Communication Tone**: ${this.inferCommunicationTone(data)}
`.trim();
  }

  // Create enhanced metadata for better RAG retrieval
  private createEnhancedMetadata(data: OnboardingData): Record<string, any> {
    return {
      type: 'user_profile_enhanced',
      user_id: data.id,
      role: data.role,
      team_id: data.teamId,
      skills: data.skills,
      experience_level: data.experienceLevel,
      learning_goals: data.learningGoals,
      preferred_technologies: data.preferredTechnologies,
      communication_style: data.communicationStyle,
      work_style: data.workStyle,
      availability: data.availability,
      timezone: data.timezone,
      interests: data.interests,
      project_goal: data.projectGoal,
      mentorship_needs: data.mentorshipNeeds,
      onboarding_completed: true,
      oracle_personalization: true,
      expertise_domains: this.categorizeExpertise(data.skills),
      learning_style: this.analyzeLearningStyle(data),
      career_stage: this.analyzeCareerStage(data),
      team_dynamics: this.analyzeTeamDynamics(data),
      challenge_areas: this.identifyChallengeAreas(data),
      opportunity_areas: this.identifyOpportunityAreas(data)
    };
  }

  // Infer career aspirations based on user data
  private inferCareerAspirations(data: OnboardingData): string {
    const aspirations = [];
    
    if (data.role === 'builder' && data.experienceLevel === 'expert') {
      aspirations.push('Technical leadership', 'Architecture design', 'Team mentoring');
    } else if (data.role === 'builder' && data.experienceLevel === 'advanced') {
      aspirations.push('Senior development', 'Technical specialization', 'Project leadership');
    } else if (data.role === 'mentor') {
      aspirations.push('Expert mentorship', 'Knowledge sharing', 'Community building');
    } else if (data.role === 'lead') {
      aspirations.push('Strategic leadership', 'Team management', 'Business growth');
    }

    if (data.skills.includes('ai_ml')) {
      aspirations.push('AI/ML specialization', 'Research & development', 'Innovation leadership');
    }
    if (data.skills.includes('blockchain')) {
      aspirations.push('Blockchain expertise', 'DeFi innovation', 'Web3 leadership');
    }

    return aspirations.length > 0 ? aspirations.join(', ') : 'Career growth and skill development';
  }

  // Infer learning preferences
  private inferLearningPreferences(data: OnboardingData): string {
    const preferences = [];
    
    if (data.communicationStyle.includes('visual')) {
      preferences.push('Visual learning', 'Interactive tutorials', 'Video content');
    }
    if (data.workStyle.includes('hands-on')) {
      preferences.push('Practical projects', 'Real-world applications', 'Experiential learning');
    }
    if (data.availability.includes('flexible')) {
      preferences.push('Self-paced learning', 'Modular content', 'On-demand resources');
    }

    return preferences.length > 0 ? preferences.join(', ') : 'Structured learning with practical application';
  }

  // Infer response detail preference
  private inferResponseDetail(data: OnboardingData): string {
    if (data.experienceLevel === 'beginner') return 'detailed';
    if (data.experienceLevel === 'intermediate') return 'comprehensive';
    if (data.experienceLevel === 'advanced') return 'detailed';
    return 'comprehensive';
  }

  // Infer technical depth preference
  private inferTechnicalDepth(data: OnboardingData): string {
    if (data.experienceLevel === 'beginner') return 'beginner';
    if (data.experienceLevel === 'intermediate') return 'intermediate';
    if (data.experienceLevel === 'advanced') return 'advanced';
    return 'expert';
  }

  // Infer learning approach
  private inferLearningApproach(data: OnboardingData): string {
    if (data.workStyle.includes('collaborative')) return 'social';
    if (data.workStyle.includes('independent')) return 'independent';
    if (data.workStyle.includes('hands-on')) return 'hands-on';
    return 'balanced';
  }

  // Infer communication tone
  private inferCommunicationTone(data: OnboardingData): string {
    if (data.communicationStyle.includes('direct')) return 'professional';
    if (data.communicationStyle.includes('collaborative')) return 'encouraging';
    if (data.communicationStyle.includes('detailed')) return 'comprehensive';
    return 'supportive';
  }

  // Categorize expertise domains
  private categorizeExpertise(skills: UserSkill[]): string[] {
    const domains = [];
    
    if (skills.includes('frontend') || skills.includes('ui_ux')) {
      domains.push('frontend_development', 'user_experience', 'interface_design');
    }
    if (skills.includes('backend') || skills.includes('fullstack')) {
      domains.push('backend_development', 'api_design', 'system_architecture');
    }
    if (skills.includes('ai_ml')) {
      domains.push('artificial_intelligence', 'machine_learning', 'data_science');
    }
    if (skills.includes('blockchain')) {
      domains.push('blockchain_technology', 'decentralized_systems', 'cryptocurrency');
    }
    if (skills.includes('devops')) {
      domains.push('infrastructure', 'deployment', 'automation');
    }

    return domains;
  }

  // Analyze learning style
  private analyzeLearningStyle(data: OnboardingData): string {
    const indicators = [];
    
    if (data.communicationStyle.includes('visual')) indicators.push('visual');
    if (data.workStyle.includes('hands-on')) indicators.push('kinesthetic');
    if (data.workStyle.includes('collaborative')) indicators.push('social');
    if (data.workStyle.includes('independent')) indicators.push('solitary');
    
    return indicators.length > 0 ? indicators.join('_') : 'balanced';
  }

  // Analyze career stage
  private analyzeCareerStage(data: OnboardingData): string {
    if (data.experienceLevel === 'beginner') return 'early_career';
    if (data.experienceLevel === 'intermediate') return 'mid_career';
    if (data.experienceLevel === 'advanced') return 'senior_level';
    if (data.experienceLevel === 'expert') return 'expert_level';
    return 'developing';
  }

  // Analyze team dynamics
  private analyzeTeamDynamics(data: OnboardingData): string {
    if (data.role === 'lead') return 'leadership';
    if (data.role === 'mentor') return 'mentorship';
    if (data.role === 'builder') return 'collaboration';
    return 'individual';
  }

  // Identify challenge areas
  private identifyChallengeAreas(data: OnboardingData): string[] {
    const challenges = [];
    
    if (data.experienceLevel === 'beginner') {
      challenges.push('technical_foundations', 'best_practices', 'industry_knowledge');
    }
    if (data.role === 'builder' && data.experienceLevel === 'intermediate') {
      challenges.push('system_design', 'architecture_patterns', 'performance_optimization');
    }
    if (data.skills.includes('ai_ml')) {
      challenges.push('mathematical_foundations', 'model_selection', 'ethical_considerations');
    }
    if (data.skills.includes('blockchain')) {
      challenges.push('cryptography', 'smart_contract_security', 'scalability');
    }

    return challenges;
  }

  // Identify opportunity areas
  private identifyOpportunityAreas(data: OnboardingData): string[] {
    const opportunities = [];
    
    if (data.experienceLevel === 'intermediate') {
      opportunities.push('technical_leadership', 'mentorship', 'specialization');
    }
    if (data.role === 'builder') {
      opportunities.push('project_leadership', 'architecture_design', 'team_mentoring');
    }
    if (data.skills.includes('ai_ml')) {
      opportunities.push('research_opportunities', 'industry_innovation', 'academic_collaboration');
    }
    if (data.skills.includes('blockchain')) {
      opportunities.push('decentralized_applications', 'defi_innovation', 'web3_leadership');
    }

    return opportunities;
  }

  // Generate context embedding for vector search
  private async generateContextEmbedding(context: string): Promise<number[]> {
    try {
      // This would integrate with OpenAI embeddings API
      // For now, return a placeholder
      return new Array(1536).fill(0.1);
    } catch (error) {
      console.error('Error generating context embedding:', error);
      return new Array(1536).fill(0.1);
    }
  }

  // Create learning journey tracking
  private async createLearningJourney(userId: string, data: OnboardingData): Promise<void> {
    try {
      const journey = {
        user_id: userId,
        current_phase: 'onboarding',
        current_milestone: 'Profile Setup Complete',
        next_milestone: 'First Project Assignment',
        skills_progress: data.skills.map(skill => ({
          skill,
          current_level: 25,
          target_level: 75
        })),
        learning_path: this.generateInitialLearningPath(data),
        achievements: [],
        challenges: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('learning_journeys')
        .insert(journey);

      if (error) throw error;

    } catch (error) {
      console.error('Error creating learning journey:', error);
    }
  }

  // Generate initial learning path
  private generateInitialLearningPath(data: OnboardingData): any[] {
    const paths = [];
    
    if (data.skills.includes('frontend')) {
      paths.push({
        title: 'Frontend Fundamentals',
        description: 'Master HTML, CSS, and JavaScript basics',
        duration: '2-3 weeks',
        difficulty: 'beginner',
        prerequisites: [],
        outcomes: ['Build responsive layouts', 'Implement interactive features', 'Understand modern CSS'],
        resources: ['MDN Web Docs', 'CSS-Tricks', 'JavaScript.info'],
        completed: false
      });
    }

    if (data.skills.includes('ai_ml')) {
      paths.push({
        title: 'AI/ML Foundations',
        description: 'Learn machine learning fundamentals and Python',
        duration: '4-6 weeks',
        difficulty: 'intermediate',
        prerequisites: ['Python basics', 'Mathematics fundamentals'],
        outcomes: ['Understand ML algorithms', 'Build simple models', 'Evaluate model performance'],
        resources: ['Coursera ML Course', 'Fast.ai', 'Kaggle Learn'],
        completed: false
      });
    }

    return paths;
  }

  // Initialize interaction history
  private async initializeInteractionHistory(userId: string): Promise<void> {
    try {
      const history = {
        user_id: userId,
        recent_queries: [],
        frequent_topics: [],
        preferred_query_types: [],
        response_satisfaction: 0,
        learning_patterns: [],
        improvement_areas: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('interaction_histories')
        .insert(history);

      if (error) throw error;

    } catch (error) {
      console.error('Error initializing interaction history:', error);
    }
  }

  // Get comprehensive user context for Oracle
  async getUserContext(userId: string): Promise<OracleContext> {
    try {
      // Check cache first
      if (this.userContextCache.has(userId)) {
        return this.userContextCache.get(userId)!;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, teams(*)')
        .eq('id', userId)
        .single();

      if (!profile) {
        throw new Error('User profile not found');
      }

      // Get team context
      const teamContext = await this.getTeamContext(profile.team_id);

      // Get learning journey
      const learningJourney = await this.getLearningJourney(userId);

      // Get interaction history
      const interactionHistory = await this.getInteractionHistory(userId);

      // Build comprehensive context
      const oracleContext: OracleContext = {
        userProfile: this.buildUserProfile(profile),
        teamContext,
        learningJourney,
        interactionHistory,
        preferences: this.buildUserPreferences(profile),
        expertise: this.buildExpertiseProfile(profile),
        goals: this.buildUserGoals(profile),
        challenges: await this.buildUserChallenges(userId),
        opportunities: await this.buildUserOpportunities(userId)
      };

      // Cache the context
      this.userContextCache.set(userId, oracleContext);

      return oracleContext;

    } catch (error) {
      console.error('Error getting user context:', error);
      throw error;
    }
  }

  // Build user profile from database data
  private buildUserProfile(profile: any): UserProfile {
    return {
      id: profile.id,
      name: profile.full_name || '',
      role: profile.role as any,
      experienceLevel: (profile.experience_level || 'beginner') as ExperienceLevel,
      skills: (profile.skills || []).filter((skill: string) => 
        ['frontend', 'backend', 'fullstack', 'ui_ux', 'devops', 'mobile', 'data', 'ai_ml', 'blockchain', 'security'].includes(skill)
      ) as UserSkill[],
      preferredTechnologies: profile.preferred_technologies || [],
      learningGoals: profile.learning_goals || [],
      bio: profile.bio || '',
      availability: profile.availability || '',
      timezone: profile.timezone || '',
      communicationStyle: profile.communication_style || 'collaborative',
      workStyle: profile.work_style || 'flexible',
      githubUsername: profile.github_username,
      portfolioUrl: profile.portfolio_url,
      linkedinUrl: profile.linkedin_url,
      expertise: profile.skills || [],
      interests: profile.skills || [],
      projectGoal: profile.project_goal,
      mentorshipNeeds: profile.mentorship_needs,
      onboardingCompleted: profile.onboarding_completed || false,
      lastUpdated: profile.updated_at
    };
  }

  // Get team context
  private async getTeamContext(teamId?: string): Promise<TeamContext | null> {
    if (!teamId) return null;

    try {
      const { data: team } = await supabase
        .from('teams')
        .select(`
          *,
          members(*),
          updates(*)
        `)
        .eq('id', teamId)
        .single();

      if (!team) return null;

      return {
        id: team.id,
        name: team.name,
        stage: team.stage,
        description: team.description,
        tags: team.tags,
        assignedMentorId: team.assigned_mentor_id,
        members: team.members?.map((m: any) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          skills: m.skills || [],
          currentFocus: m.current_focus || '',
          availability: m.availability || '',
          expertise: m.expertise || []
        })) || [],
        recentUpdates: team.updates?.map((u: any) => ({
          id: u.id,
          content: u.content,
          type: u.type,
          createdBy: u.created_by,
          createdAt: u.created_at,
          impact: this.analyzeUpdateImpact(u.content),
          category: this.categorizeUpdate(u.content)
        })) || [],
        currentChallenges: [],
        nextMilestones: [],
        resources: [],
        mentorGuidance: []
      };

    } catch (error) {
      console.error('Error getting team context:', error);
      return null;
    }
  }

  // Get learning journey
  private async getLearningJourney(userId: string): Promise<LearningJourney> {
    try {
      const { data: journey } = await supabase
        .from('learning_journeys')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!journey) {
        return this.createDefaultLearningJourney();
      }

      return {
        currentPhase: journey.current_phase as any,
        completedMilestones: journey.completed_milestones || [],
        currentMilestone: journey.current_milestone || '',
        nextMilestone: journey.next_milestone || '',
        skillProgress: journey.skills_progress || [],
        learningPath: journey.learning_path || [],
        achievements: journey.achievements || [],
        challenges: journey.challenges || []
      };

    } catch (error) {
      console.error('Error getting learning journey:', error);
      return this.createDefaultLearningJourney();
    }
  }

  // Get interaction history
  private async getInteractionHistory(userId: string): Promise<InteractionHistory> {
    try {
      const { data: history } = await supabase
        .from('interaction_histories')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!history) {
        return this.createDefaultInteractionHistory();
      }

      return {
        recentQueries: history.recent_queries || [],
        frequentTopics: history.frequent_topics || [],
        preferredQueryTypes: history.preferred_query_types || [],
        responseSatisfaction: history.response_satisfaction || 0,
        learningPatterns: history.learning_patterns || [],
        improvementAreas: history.improvement_areas || []
      };

    } catch (error) {
      console.error('Error getting interaction history:', error);
      return this.createDefaultInteractionHistory();
    }
  }

  // Build user preferences
  private buildUserPreferences(profile: any): UserPreferences {
    return {
      communicationStyle: profile.communication_style === 'direct' ? 'direct' : 'collaborative',
      learningStyle: profile.work_style?.includes('hands-on') ? 'hands-on' : 'theoretical',
      responseDetail: profile.experience_level === 'beginner' ? 'detailed' : 'comprehensive',
      preferredFormats: ['text', 'visual'],
      technicalDepth: (profile.experience_level || 'beginner') as any,
      timeConstraints: 'standard'
    };
  }

  // Build expertise profile
  private buildExpertiseProfile(profile: any): ExpertiseProfile {
    return {
      primaryDomain: profile.skills?.[0] || 'general',
      secondaryDomains: profile.skills?.slice(1) || [],
      yearsOfExperience: this.calculateYearsOfExperience(profile.experience_level),
      certifications: [],
      projects: [],
      publications: [],
      speakingEngagements: [],
      mentorshipExperience: []
    };
  }

  // Build user goals
  private buildUserGoals(profile: any): UserGoals {
    return {
      shortTerm: [],
      mediumTerm: [],
      longTerm: [],
      careerAspirations: [],
      skillTargets: (profile.skills || []).map(skill => ({
        skill,
        currentLevel: 25,
        targetLevel: 75,
        timeline: '3 months',
        resources: [],
        practicePlan: []
      })),
      projectObjectives: []
    };
  }

  // Build user challenges
  private async buildUserChallenges(userId: string): Promise<UserChallenges> {
    // This would integrate with a challenges system
    return {
      current: [],
      resolved: [],
      recurring: [],
      supportNeeded: []
    };
  }

  // Build user opportunities
  private async buildUserOpportunities(userId: string): Promise<UserOpportunities> {
    // This would integrate with an opportunities system
    return {
      current: [],
      upcoming: [],
      recommendations: [],
      networking: []
    };
  }

  // Create default learning journey
  private createDefaultLearningJourney(): LearningJourney {
    return {
      currentPhase: 'onboarding',
      completedMilestones: [],
      currentMilestone: 'Getting Started',
      nextMilestone: 'First Project',
      skillProgress: [],
      learningPath: [],
      achievements: [],
      challenges: []
    };
  }

  // Create default interaction history
  private createDefaultInteractionHistory(): InteractionHistory {
    return {
      recentQueries: [],
      frequentTopics: [],
      preferredQueryTypes: [],
      responseSatisfaction: 0,
      learningPatterns: [],
      improvementAreas: []
    };
  }

  // Analyze update impact
  private analyzeUpdateImpact(content: string): 'low' | 'medium' | 'high' {
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('completed') || contentLower.includes('finished') || contentLower.includes('launched')) {
      return 'high';
    }
    if (contentLower.includes('progress') || contentLower.includes('working') || contentLower.includes('implementing')) {
      return 'medium';
    }
    return 'low';
  }

  // Categorize update
  private categorizeUpdate(content: string): 'progress' | 'challenge' | 'achievement' | 'learning' {
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('challenge') || contentLower.includes('problem') || contentLower.includes('issue')) {
      return 'challenge';
    }
    if (contentLower.includes('completed') || contentLower.includes('finished') || contentLower.includes('achieved')) {
      return 'achievement';
    }
    if (contentLower.includes('learned') || contentLower.includes('discovered') || contentLower.includes('understood')) {
      return 'learning';
    }
    return 'progress';
  }

  // Calculate years of experience
  private calculateYearsOfExperience(level: string): number {
    switch (level) {
      case 'beginner': return 1;
      case 'intermediate': return 3;
      case 'advanced': return 6;
      case 'expert': return 10;
      default: return 2;
    }
  }

  // Generate Oracle prompt with deep personalization
  async generateOraclePrompt(userId: string, query: string): Promise<string> {
    const context = await this.getUserContext(userId);
    const { userProfile, teamContext, learningJourney, interactionHistory, preferences, expertise, goals, challenges, opportunities } = context;

    return `
# Oracle Personalization Context

## User Profile
- **Role**: ${userProfile.role}
- **Experience**: ${userProfile.experienceLevel} developer
- **Skills**: ${userProfile.skills.join(', ')}
- **Current Focus**: ${userProfile.learningGoals.join(', ')}
- **Work Style**: ${userProfile.workStyle}
- **Availability**: ${userProfile.availability} (${userProfile.timezone})

## Learning Journey
- **Current Phase**: ${learningJourney.currentPhase}
- **Current Milestone**: ${learningJourney.currentMilestone}
- **Next Milestone**: ${learningJourney.nextMilestone}
- **Skill Progress**: ${learningJourney.skillProgress.map(s => `${s.skill}: ${s.currentLevel}%`).join(', ')}

## Team Context
${teamContext ? `
- **Team**: ${teamContext.name}
- **Stage**: ${teamContext.stage}
- **Recent Updates**:
${teamContext.recentUpdates.map(u => `  - ${u.content} (${u.category}, ${u.impact} impact)`).join('\n')}
` : 'No team assignment'}

## User Preferences
- **Communication**: ${preferences.communicationStyle}
- **Learning Style**: ${preferences.learningStyle}
- **Response Detail**: ${preferences.responseDetail}
- **Technical Depth**: ${preferences.technicalDepth}

## Expertise & Goals
- **Primary Domain**: ${expertise.primaryDomain}
- **Years Experience**: ${expertise.yearsOfExperience}
- **Short-term Goals**: ${goals.shortTerm.map(g => g.title).join(', ')}
- **Skill Targets**: ${goals.skillTargets.map(s => `${s.skill}: ${s.currentLevel}→${s.targetLevel}`).join(', ')}

## Current Challenges
${challenges.current.map(c => `- ${c.title}: ${c.description}`).join('\n')}

## Opportunities
${opportunities.current.map(o => `- ${o.title}: ${o.description}`).join('\n')}

## Interaction History
- **Frequent Topics**: ${interactionHistory.frequentTopics.join(', ')}
- **Preferred Query Types**: ${interactionHistory.preferredQueryTypes.join(', ')}
- **Response Satisfaction**: ${interactionHistory.responseSatisfaction}/5

## User Query
${query}

## Oracle Response Guidelines
Based on the user's context, provide a response that:

1. **Matches Technical Level**: Use ${userProfile.experienceLevel}-appropriate language and concepts
2. **Aligns with Learning Goals**: Connect to their current focus: ${userProfile.learningGoals.join(', ')}
3. **Considers Work Style**: Adapt to their ${userProfile.workStyle} approach
4. **References Team Context**: Leverage team stage (${teamContext?.stage || 'individual'}) when relevant
5. **Uses Preferred Communication**: Match their ${preferences.communicationStyle} style
6. **Addresses Current Challenges**: Provide solutions for: ${challenges.current.map(c => c.title).join(', ')}
7. **Highlights Opportunities**: Suggest relevant opportunities from: ${opportunities.current.map(o => o.title).join(', ')}
8. **Builds on Previous Interactions**: Consider their learning patterns and frequent topics
9. **Provides Actionable Next Steps**: Give concrete, achievable actions
10. **Maintains Engagement**: Use their preferred response detail (${preferences.responseDetail})

Remember: This user is in the ${learningJourney.currentPhase} phase of their journey, working on ${learningJourney.currentMilestone}. Every response should advance them toward ${learningJourney.nextMilestone}.
`.trim();
  }

  // Update interaction history after Oracle response
  async updateInteractionHistory(userId: string, query: string, response: OracleResponse, satisfaction?: number): Promise<void> {
    try {
      const { data: history } = await supabase
        .from('interaction_histories')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!history) return;

      // Add new query
      const newQuery = {
        id: Date.now().toString(),
        query,
        response: response.answer,
        queryType: response.search_strategy.includes('graph') ? 'graph' : 'chat',
        modelUsed: response.model_used,
        confidence: response.confidence,
        sources: response.sources,
        processingTime: response.processing_time,
        userSatisfaction: satisfaction,
        followUpQuestions: response.followUpQuestions || [],
        createdAt: new Date().toISOString(),
        contextUsed: response.context_used,
        graphData: response.graph_data,
        multiModelInsights: response.multi_model_insights,
        resources: response.resources,
        connections: response.connections
      };

      // Update history
      const updatedHistory = {
        ...history,
        recent_queries: [newQuery, ...(history.recent_queries || []).slice(0, 9)],
        response_satisfaction: satisfaction ? (history.response_satisfaction + satisfaction) / 2 : history.response_satisfaction,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('interaction_histories')
        .update(updatedHistory)
        .eq('user_id', userId);

      if (error) throw error;

      // Update cache
      if (this.userContextCache.has(userId)) {
        const cached = this.userContextCache.get(userId)!;
        cached.interactionHistory.recentQueries = [newQuery, ...cached.interactionHistory.recentQueries.slice(0, 9)];
        if (satisfaction) {
          cached.interactionHistory.responseSatisfaction = (cached.interactionHistory.responseSatisfaction + satisfaction) / 2;
        }
      }

    } catch (error) {
      console.error('Error updating interaction history:', error);
    }
  }

  // Clear cache for a user
  clearUserCache(userId: string): void {
    this.userContextCache.delete(userId);
    this.knowledgeGraphCache.delete(userId);
  }

  // Clear all caches
  clearAllCaches(): void {
    this.userContextCache.clear();
    this.knowledgeGraphCache.clear();
  }
}

// Export singleton instance
export const oracleContextService = OracleContextService.getInstance();

// Legacy functions for backward compatibility
export const storeUserContext = async (userId: string, data: OnboardingData): Promise<void> => {
  return oracleContextService.storeUserContext(userId, data);
};

export const getUserContext = async (userId: string): Promise<{
  profile?: OnboardingData;
  recentUpdates: any[];
  teamContext: any;
  preferences: any;
}> => {
  const context = await oracleContextService.getUserContext(userId);
  
  return {
    profile: {
      name: context.userProfile.name,
      bio: context.userProfile.bio,
      role: context.userProfile.role,
      experienceLevel: context.userProfile.experienceLevel,
      skills: context.userProfile.skills,
      preferredTechnologies: context.userProfile.preferredTechnologies,
      learningGoals: context.userProfile.learningGoals,
      communicationStyle: context.userProfile.communicationStyle,
      workStyle: context.userProfile.workStyle,
      availability: context.userProfile.availability,
      timezone: context.userProfile.timezone,
      interests: context.userProfile.interests,
      projectGoal: context.userProfile.projectGoal,
      mentorshipNeeds: context.userProfile.mentorshipNeeds,
      onboardingCompleted: context.userProfile.onboardingCompleted,
      lastUpdated: context.userProfile.lastUpdated
    },
    recentUpdates: context.teamContext?.recentUpdates || [],
    teamContext: context.teamContext,
    preferences: context.preferences
  };
};

export const generateOraclePrompt = async (userId: string, query: string): Promise<string> => {
  return oracleContextService.generateOraclePrompt(userId, query);
};