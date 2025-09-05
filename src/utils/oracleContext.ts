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
    user_types?: string[];
    skills?: string[];
    looking_for_skills?: string[];
    interests?: string[];
    personal_goals?: string[];
    project_vision?: string;
    help_needed?: string[];
    experience_level?: string;
    availability?: string;
    timezone?: string;
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
    team_id?: string;
    role?: string;
    individual_stage?: string;
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
    // Initialize supabase client when methods are called
    this.initSupabase();
  }

  private async initSupabase() {
    if (!this.supabase) {
      const { supabase } = await import('@/integrations/supabase/client');
      this.supabase = supabase;
    }
    return this.supabase;
  }

  static getInstance(): OracleContextService {
    if (!OracleContextService.instance) {
      OracleContextService.instance = new OracleContextService();
    }
    return OracleContextService.instance;
  }

  async storeUserContext(userId: string, data: any): Promise<void> {
    try {
      console.log('Storing user context for:', userId);
      
      // Ensure supabase is initialized
      const supabase = await this.initSupabase();
      
      // Update the profiles table with new onboarding data structure
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          user_types: data.user_types,
          skills: data.skills,
          looking_for_skills: data.looking_for_skills,
          interests: data.interests,
          bio: data.bio,
          onboarding_completed: data.onboarding_completed,
          role: data.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }

      // If teamId is provided, update the team_id
      if (data.teamId) {
        const { error: teamError } = await supabase
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

      // Ensure supabase is initialized
      const supabase = await this.initSupabase();

      // Get user profile
      const { data: profile, error: profileError } = await supabase
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
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('id, name, stage, description')
          .eq('id', profile.team_id)
          .single();

        if (!teamError && teamData) {
          team = teamData;

          // Get recent team updates
          const { data: updates, error: updatesError } = await supabase
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
      // Ensure supabase is initialized
      const supabase = await this.initSupabase();
      
      // Log to oracle_logs table with correct fields
      const { error } = await supabase
        .from('oracle_logs')
        .insert({
          user_id: userId,
          query: query.substring(0, 500),
          response: typeof response === 'string' ? response.substring(0, 500) : JSON.stringify(response).substring(0, 500),
          sources_count: response.sources || 0,
          processing_time_ms: response.processing_time || 0,
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
        prompt += `- Role: ${context.profile.role || 'Not specified'}\n`;
        
        if (context.profile.user_types && context.profile.user_types.length > 0) {
          prompt += `- User Types: ${context.profile.user_types.join(', ')}\n`;
        }
        
        if (context.profile.skills && context.profile.skills.length > 0) {
          prompt += `- Skills: ${context.profile.skills.join(', ')}\n`;
        }
        
        if (context.profile.looking_for_skills && context.profile.looking_for_skills.length > 0) {
          prompt += `- Looking for Skills: ${context.profile.looking_for_skills.join(', ')}\n`;
        }
        
        if (context.profile.interests && context.profile.interests.length > 0) {
          prompt += `- Interests: ${context.profile.interests.join(', ')}\n`;
        }
        
        if (context.profile.bio) {
          prompt += `- Bio: ${context.profile.bio}\n`;
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
export const storeUserContext = async (userId: string, data: any): Promise<void> => {
  return OracleContextService.getInstance().storeUserContext(userId, data);
};
