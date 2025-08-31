import { supabase } from "@/integrations/supabase/client";
import type { OnboardingData, UserSkill, ExperienceLevel } from "@/types/onboarding";

// Convert onboarding data to a context string for embedding
const createContextString = (data: OnboardingData): string => {
  return `
User Profile:
- Name: ${data.name}
- Role: ${data.role}
- Experience Level: ${data.experienceLevel}
- Skills: ${data.skills.join(', ')}
- Preferred Technologies: ${data.preferredTechnologies.join(', ')}
- Learning Goals: ${data.learningGoals}

Background:
${data.bio}

Work Style:
- Communication: ${data.communicationStyle}
- Work Preferences: ${data.workStyle}
- Availability: ${data.availability}
- Timezone: ${data.timezone}

Interests & Goals:
- Interests: ${data.interests.join(', ')}
- Project Goals: ${data.projectGoal || 'Not specified'}
- Mentorship Needs: ${data.mentorshipNeeds || 'Not specified'}

Links:
${data.githubUsername ? `- GitHub: ${data.githubUsername}` : ''}
${data.portfolioUrl ? `- Portfolio: ${data.portfolioUrl}` : ''}
`.trim();
};

// Store user context in the RAG system
export const storeUserContext = async (userId: string, data: OnboardingData): Promise<void> => {
  try {
    const contextString = createContextString(data);

    // Store in documents table for RAG
    const { error: docError } = await supabase
      .from('documents')
      .insert({
        content: contextString,
        metadata: {
          type: 'user_profile',
          user_id: userId,
          role: data.role,
          team_id: data.teamId,
          skills: data.skills,
          experience_level: data.experienceLevel
        },
        source_type: 'user_profile',
        role_visibility: ['lead', 'mentor', data.role],
        team_visibility: data.teamId ? [data.teamId] : []
      });

    if (docError) throw docError;

    // Store preferences in profile instead of separate table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        availability: data.availability,
        bio: data.bio || ''
      })
      .eq('id', userId);

    if (profileError) throw profileError;

  } catch (error) {
    console.error('Error storing user context:', error);
    throw error;
  }
};

// Get user context for Oracle
export const getUserContext = async (userId: string): Promise<{
  profile?: OnboardingData;
  recentUpdates: any[];
  teamContext: any;
  preferences: any;
}> => {
  try {
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, teams(*)')
      .eq('id', userId)
      .single();

    // Get recent updates
    const { data: updates } = await supabase
      .from('updates')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get team context if user is in a team
    const { data: teamContext } = profile?.team_id ? await supabase
      .from('teams')
      .select(`
        *,
        members(*),
        updates(*)
      `)
      .eq('id', profile.team_id)
      .single() : { data: null };

    // Get user preferences from profile
    const preferences = profile ? {
      communication_style: profile.bio?.includes('communication') ? 'collaborative' : 'direct',
      learning_goals: profile.personal_goals || [],
      interests: profile.skills || []
    } : null;

    return {
      profile: profile && profile.role !== 'unassigned' ? {
        name: profile.full_name || '',
        role: profile.role as 'builder' | 'mentor' | 'lead' | 'guest',
        experienceLevel: (profile.experience_level || 'beginner') as ExperienceLevel,
        skills: (profile.skills || []).filter((skill: string) => 
          ['frontend', 'backend', 'fullstack', 'ui_ux', 'devops', 'mobile', 'data', 'ai_ml', 'blockchain', 'security'].includes(skill)
        ) as UserSkill[],
        learningGoals: profile.personal_goals || [],
        bio: profile.bio || '',
        availability: profile.availability || '',
        timezone: profile.timezone || '',
        preferredTechnologies: profile.skills || [],
        interests: profile.skills || [],
        communicationStyle: 'collaborative',
        workStyle: 'flexible',
        onboardingCompleted: profile.onboarding_completed || false,
        lastUpdated: profile.updated_at
      } : undefined,
      recentUpdates: updates || [],
      teamContext: teamContext || null,
      preferences: preferences || null
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return {
      recentUpdates: [],
      teamContext: null,
      preferences: null
    };
  }
};

// Generate Oracle prompt with user context
export const generateOraclePrompt = async (userId: string, query: string): Promise<string> => {
  const context = await getUserContext(userId);
  const { profile, recentUpdates, teamContext, preferences } = context;

  if (!profile) return query;

  return `
[User Context]
Role: ${profile.role}
Experience: ${profile.experienceLevel} developer
Skills: ${profile.skills.join(', ')}
Current Focus: ${profile.learningGoals}
Work Style: ${profile.workStyle}
Availability: ${profile.availability} (${profile.timezone})

${teamContext ? `[Team Context]
Team: ${teamContext.name}
Stage: ${teamContext.stage}
Recent Updates:
${recentUpdates.map(u => `- ${u.content}`).join('\n')}` : ''}

[Preferences]
Communication: ${preferences?.communication_style || profile.communicationStyle}
Learning Goals: ${preferences?.learning_goals || profile.learningGoals}
Interests: ${preferences?.interests?.join(', ') || profile.interests.join(', ')}

User Query: ${query}

Based on the user's context, provide a personalized response that:
1. Matches their technical level (${profile.experienceLevel})
2. Aligns with their learning goals
3. Considers their work style and preferences
4. References their team context when relevant
5. Uses their preferred communication style
`.trim();
};