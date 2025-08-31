import { supabase } from "@/integrations/supabase/client";
import type { OnboardingData } from "@/types/onboarding";

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

    // Store user preferences for quick access
    const { error: prefError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        communication_style: data.communicationStyle,
        work_style: data.workStyle,
        availability: data.availability,
        timezone: data.timezone,
        learning_goals: data.learningGoals,
        interests: data.interests
      });

    if (prefError) throw prefError;

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
      .from('members')
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

    // Get user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    return {
      profile: profile?.onboarding_data,
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
