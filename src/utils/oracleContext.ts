import { createClient } from '@supabase/supabase-js';
import { OnboardingData, UserSkill, ExperienceLevel } from "@/types/onboarding";

// Types that match the actual database schema
interface OracleContext {
  userId: string;
  teamId?: string;
  profile?: {
    id: string;
    email: string;
    full_name?: string;
    bio?: string;
    personal_goals?: string[];
    project_vision?: string;
    skills?: string[];
    help_needed?: string[];
    experience_level?: string;
    availability?: string;
    timezone?: string;
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
    team_id?: string;
    onboarding_completed?: boolean;
  };
  team?: {
    id: string;
    name: string;
    stage?: string;
    description?: string;
  };
  recentUpdates?: Array<{
    id: string;
    content: string;
    type: string;
    created_at: string;
  }>;
}

export class OracleContextService {
  private static instance: OracleContextService;
  private supabase: any;
  private contextCache: Map<string, OracleContext> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  static getInstance(): OracleContextService {
    if (!OracleContextService.instance) {
      OracleContextService.instance = new OracleContextService();
    }
    return OracleContextService.instance;
  }

  async storeUserContext(userId: string, data: OnboardingData): Promise<void> {
    try {
      console.log('Storing user context for:', userId);
      
      // Update the profiles table with onboarding data
      const { error: profileError } = await this.supabase
        .from('profiles')
        .update({
          full_name: data.name,
          bio: data.bio,
          personal_goals: data.learningGoals,
          project_vision: data.projectGoal,
          skills: data.skills,
          experience_level: data.experienceLevel,
          availability: data.availability,
          timezone: data.timezone,
          linkedin_url: data.portfolioUrl,
          github_url: data.githubUsername,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }

      // If teamId is provided, update the team_id
      if (data.teamId) {
        const { error: teamError } = await this.supabase
          .from('profiles')
          .update({ team_id: data.teamId })
          .eq('id', userId);

        if (teamError) {
          console.error('Error updating team_id:', teamError);
        }
      }

      // Clear cache for this user
      this.contextCache.delete(userId);
      this.cacheExpiry.delete(userId);

      console.log('User context stored successfully');
    } catch (error) {
      console.error('Error storing user context:', error);
      throw error;
    }
  }

  private createComprehensiveContextString(data: OnboardingData): string {
    const contextParts = [
      `Name: ${data.name}`,
      `Role: ${data.role}`,
      `Experience Level: ${data.experienceLevel}`,
      `Skills: ${data.skills.join(', ')}`,
      `Learning Goals: ${data.learningGoals.join(', ')}`,
      `Preferred Technologies: ${data.preferredTechnologies.join(', ')}`,
      `Communication Style: ${data.communicationStyle}`,
      `Work Style: ${data.workStyle}`,
      `Availability: ${data.availability}`,
      `Timezone: ${data.timezone}`
    ];

    if (data.projectGoal) {
      contextParts.push(`Project Goal: ${data.projectGoal}`);
    }

    if (data.mentorshipNeeds) {
      contextParts.push(`Mentorship Needs: ${data.mentorshipNeeds}`);
    }

    if (data.interests && data.interests.length > 0) {
      contextParts.push(`Interests: ${data.interests.join(', ')}`);
    }

    return contextParts.join('\n');
  }

  private createEnhancedMetadata(data: OnboardingData): any {
    return {
      role: data.role,
      experience_level: data.experienceLevel,
      skills: data.skills,
      learning_goals: data.learningGoals,
      preferred_technologies: data.preferredTechnologies,
      communication_style: data.communicationStyle,
      work_style: data.workStyle,
      availability: data.availability,
      timezone: data.timezone,
      project_goal: data.projectGoal,
      mentorship_needs: data.mentorshipNeeds,
      interests: data.interests,
      onboarding_completed: true,
      last_updated: new Date().toISOString()
    };
  }

  async getUserContext(userId: string): Promise<OracleContext> {
    try {
      // Check cache first
      const cached = this.contextCache.get(userId);
      const expiry = this.cacheExpiry.get(userId);
      
      if (cached && expiry && Date.now() < expiry) {
        console.log('Returning cached context for:', userId);
        return cached;
      }

      console.log('Fetching fresh context for:', userId);

      // Get user profile
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }

      let team = null;
      let recentUpdates: any[] = [];

      // Get team information if user has a team
      if (profile.team_id) {
        const { data: teamData, error: teamError } = await this.supabase
          .from('teams')
          .select('id, name, stage, description')
          .eq('id', profile.team_id)
          .single();

        if (!teamError && teamData) {
          team = teamData;

          // Get recent team updates
          const { data: updates, error: updatesError } = await this.supabase
            .from('updates')
            .select('id, content, type, created_at')
            .eq('team_id', profile.team_id)
            .order('created_at', { ascending: false })
            .limit(5);

          if (!updatesError && updates) {
            recentUpdates = updates;
          }
        }
      }

      const context: OracleContext = {
        userId,
        teamId: profile.team_id,
        profile,
        team,
        recentUpdates
      };

      // Cache the context
      this.contextCache.set(userId, context);
      this.cacheExpiry.set(userId, Date.now() + this.CACHE_DURATION);

      console.log('Context fetched successfully for:', userId);
      return context;
    } catch (error) {
      console.error('Error getting user context:', error);
      // Return minimal context on error
      return {
        userId,
        profile: { id: userId, email: '', onboarding_completed: false }
      };
    }
  }

  async updateInteractionHistory(userId: string, query: string, response: any, satisfaction?: number): Promise<void> {
    try {
      // Log to oracle_logs table (which exists)
      const { error } = await this.supabase
        .from('oracle_logs')
        .insert({
          user_id: userId,
          query: query.substring(0, 500),
          response: typeof response === 'string' ? response.substring(0, 500) : JSON.stringify(response).substring(0, 500),
          sources_count: response.sources || 0,
          processing_time_ms: response.processing_time || 0,
          model_used: response.model_used || 'unknown',
          search_strategy: response.search_strategy || 'unknown',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging interaction:', error);
      }
    } catch (error) {
      console.error('Error updating interaction history:', error);
    }
  }

  async generateOraclePrompt(userId: string, query: string): Promise<string> {
    try {
      const context = await this.getUserContext(userId);
      
      let prompt = `You are an AI assistant helping a user with their query. `;
      
      if (context.profile) {
        prompt += `\n\nUser Context:\n`;
        prompt += `- Name: ${context.profile.full_name || 'Not specified'}\n`;
        prompt += `- Experience Level: ${context.profile.experience_level || 'Not specified'}\n`;
        
        if (context.profile.skills && context.profile.skills.length > 0) {
          prompt += `- Skills: ${context.profile.skills.join(', ')}\n`;
        }
        
        if (context.profile.personal_goals && context.profile.personal_goals.length > 0) {
          prompt += `- Learning Goals: ${context.profile.personal_goals.join(', ')}\n`;
        }
        
        if (context.profile.project_vision) {
          prompt += `- Project Vision: ${context.profile.project_vision}\n`;
        }
      }

      if (context.team) {
        prompt += `\nTeam Context:\n`;
        prompt += `- Team: ${context.team.name}\n`;
        prompt += `- Stage: ${context.team.stage || 'Not specified'}\n`;
        if (context.team.description) {
          prompt += `- Description: ${context.team.description}\n`;
        }
      }

      if (context.recentUpdates && context.recentUpdates.length > 0) {
        prompt += `\nRecent Team Updates:\n`;
        context.recentUpdates.forEach((update, index) => {
          prompt += `${index + 1}. [${update.type}] ${update.content}\n`;
        });
      }

      prompt += `\n\nQuery: ${query}\n\nPlease provide a helpful, relevant response based on the user's context and query. Be concise but informative.`;
      
      return prompt;
    } catch (error) {
      console.error('Error generating Oracle prompt:', error);
      return `You are an AI assistant. Please help with this query: ${query}`;
    }
  }

  // Helper method to clear cache for a specific user
  clearUserCache(userId: string): void {
    this.contextCache.delete(userId);
    this.cacheExpiry.delete(userId);
  }

  // Helper method to clear all cache
  clearAllCache(): void {
    this.contextCache.clear();
    this.cacheExpiry.clear();
  }

  // Helper method to get cache status
  getCacheStatus(): { size: number; entries: number } {
    return {
      size: this.contextCache.size,
      entries: this.contextCache.size
    };
  }
}

// Direct export for backward compatibility
export const storeUserContext = async (userId: string, data: OnboardingData): Promise<void> => {
  return OracleContextService.getInstance().storeUserContext(userId, data);
};
