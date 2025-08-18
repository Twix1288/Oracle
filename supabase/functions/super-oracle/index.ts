import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl!, supabaseKey!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuperOracleRequest {
  query: string;
  role: 'builder' | 'mentor' | 'lead' | 'guest';
  teamId?: string;
  userId?: string;
  userProfile?: any;
  contextRequest?: {
    needsResources: boolean;
    needsMentions: boolean;
    needsTeamContext: boolean;
    needsPersonalization: boolean;
  };
}

interface OracleResource {
  title: string;
  url: string;
  type: 'youtube' | 'article' | 'documentation' | 'tutorial' | 'tool';
  description: string;
  relevance: number;
}

interface SuperOracleResponse {
  answer: string;
  sources: number;
  confidence: number;
  detected_stage?: string;
  resources?: OracleResource[];
  next_actions?: string[];
  mentions?: string[];
  personalization?: {
    skill_match: number;
    project_relevance: number;
    experience_level: string;
  };
}

async function getTeamContext(teamId: string, supabase: any) {
  const { data: team } = await supabase
    .from('teams')
    .select(`
      *,
      team_status(*),
      updates(content, type, created_at, created_by),
      profiles!inner(full_name, skills, help_needed, experience_level)
    `)
    .eq('id', teamId)
    .single();

  return team;
}

async function getUsersWithSkills(skill: string, supabase: any) {
  const { data: users } = await supabase
    .from('profiles')
    .select('full_name, role, skills, experience_level, help_needed')
    .or(`skills.cs.{${skill}},help_needed.cs.{${skill}}`);

  return users || [];
}

async function generatePersonalizedResources(query: string, userProfile: any, teamData: any): Promise<OracleResource[]> {
  // This would ideally connect to real APIs, but for now we'll generate contextual resources
  const skills = userProfile?.skills || [];
  const helpNeeded = userProfile?.help_needed || [];
  const experienceLevel = userProfile?.experience_level || 'beginner';
  const teamStage = teamData?.stage || 'ideation';
  
  // Simulate intelligent resource curation based on context
  const resources: OracleResource[] = [];
  
  // If asking about specific technologies
  if (query.toLowerCase().includes('react')) {
    resources.push({
      title: "React Official Documentation",
      url: "https://react.dev/",
      type: "documentation",
      description: "Comprehensive guide to React development",
      relevance: 95
    });
    
    if (experienceLevel === 'beginner') {
      resources.push({
        title: "React Tutorial for Beginners",
        url: "https://www.youtube.com/watch?v=SqcY0GlETPk",
        type: "youtube",
        description: "Step-by-step React tutorial for complete beginners",
        relevance: 90
      });
    }
  }
  
  if (query.toLowerCase().includes('api') || query.toLowerCase().includes('backend')) {
    resources.push({
      title: "RESTful API Design Best Practices",
      url: "https://blog.restcase.com/restful-api-design-13-best-practices-to-make-your-users-happy/",
      type: "article",
      description: "Essential guidelines for designing effective APIs",
      relevance: 88
    });
  }
  
  if (teamStage === 'development' && query.toLowerCase().includes('deploy')) {
    resources.push({
      title: "Modern Deployment Strategies",
      url: "https://vercel.com/docs/concepts/deployments",
      type: "documentation",
      description: "Learn how to deploy your application effectively",
      relevance: 92
    });
  }
  
  // AI/ML resources for relevant queries
  if (query.toLowerCase().includes('ai') || query.toLowerCase().includes('machine learning')) {
    resources.push({
      title: "OpenAI API Integration Guide",
      url: "https://platform.openai.com/docs",
      type: "documentation",
      description: "Complete guide to integrating AI into your application",
      relevance: 94
    });
    
    resources.push({
      title: "Building AI-Powered Apps",
      url: "https://www.youtube.com/watch?v=example",
      type: "youtube",
      description: "Practical tutorial on creating intelligent applications",
      relevance: 89
    });
  }
  
  return resources.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

async function detectMentions(query: string, supabase: any): Promise<string[]> {
  const mentionPattern = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionPattern.exec(query)) !== null) {
    const username = match[1];
    // Try to find user by name
    const { data: user } = await supabase
      .from('profiles')
      .select('full_name, id')
      .ilike('full_name', `%${username}%`)
      .single();
    
    if (user) {
      mentions.push(user.full_name);
    }
  }
  
  return mentions;
}

async function generateIntelligentResponse(
  query: string, 
  role: string, 
  teamContext: any, 
  userProfile: any,
  mentions: string[],
  resources: OracleResource[]
): Promise<string> {
  
  // Role-based information filtering and persona
  const getRolePersonality = (role: string) => {
    switch (role) {
      case 'guest':
        return {
          tone: 'welcoming and encouraging',
          infoLevel: 'surface-level team activities only',
          details: 'team projects, stages, and general activities - NO personal information',
          restrictions: 'No personal data, names, skills, profiles, or individual information - only team activities and project details'
        };
      case 'builder':
        return {
          tone: 'supportive and practical',
          infoLevel: 'detailed technical guidance',
          details: 'specific implementation advice, team updates, relevant resources',
          restrictions: 'Access to own team data, limited admin information'
        };
      case 'mentor':
        return {
          tone: 'wise and guidance-focused',
          infoLevel: 'comprehensive insights across teams',
          details: 'team performance data, builder progress, strategic advice',
          restrictions: 'Access to mentored teams, progress tracking, no system admin details'
        };
      case 'lead':
        return {
          tone: 'authoritative and strategic',
          infoLevel: 'full administrative access',
          details: 'complete system overview, all team data, admin functions',
          restrictions: 'Full access to all information and capabilities'
        };
      default:
        return {
          tone: 'helpful but cautious',
          infoLevel: 'minimal information',
          details: 'basic guidance only',
          restrictions: 'Very limited access'
        };
    }
  };

  const rolePersonality = getRolePersonality(role);
  
  // Filter team context based on role
  const getFilteredTeamContext = () => {
    if (!teamContext) return 'No team activity information available';
    
    switch (role) {
      case 'guest':
        // Only show team activities, projects, and stages - NO personal information
        const guestInfo = {
          activeTeams: teamContext.name ? 1 : 0,
          projectStage: teamContext.stage || 'unknown',
          projectType: teamContext.description ? 'Active project in development' : 'General activity',
          recentActivity: teamContext.updates?.length > 0 ? 
            `${teamContext.updates.length} recent project updates` : 'No recent activity'
        };
        return `Teams are actively working on projects. Current activity: ${guestInfo.activeTeams} active team in ${guestInfo.projectStage} stage. ${guestInfo.recentActivity}.`;
      case 'builder':
        return `Team: ${teamContext.name}, Stage: ${teamContext.stage}, Recent activity: ${teamContext.updates?.slice(0, 2).map(u => u.content.substring(0, 50)).join('; ') || 'No recent updates'}`;
      case 'mentor':
        return `Full team context: ${teamContext.name} (${teamContext.stage}), Members: ${teamContext.profiles?.map(p => p.full_name).join(', ')}, Recent updates: ${teamContext.updates?.slice(0, 3).map(u => u.content).join('; ') || 'No recent updates'}`;
      case 'lead':
        return `Complete team data: ${JSON.stringify(teamContext, null, 2)}`;
      default:
        return 'Limited team information available';
    }
  };

  // Filter user profile based on role
  const getFilteredUserProfile = () => {
    if (!userProfile) return 'General visitor information';
    
    switch (role) {
      case 'guest':
        return 'You are exploring our startup incubator and the projects teams are working on';
      case 'builder':
        return `Your profile: ${userProfile.full_name}, Skills: ${userProfile.skills?.join(', ') || 'Not specified'}, Experience: ${userProfile.experience_level || 'Not specified'}`;
      case 'mentor':
      case 'lead':
        return `Full profile access: ${JSON.stringify(userProfile, null, 2)}`;
      default:
        return 'Limited profile information';
    }
  };

  const contextPrompt = `
You are the PieFi Oracle, an extremely intelligent AI assistant for a startup incubator program. 

CRITICAL ROLE-BASED BEHAVIOR:
Role: ${role.toUpperCase()}
Personality: ${rolePersonality.tone}
Information Level: ${rolePersonality.infoLevel}
Access Restrictions: ${rolePersonality.restrictions}

ROLE-SPECIFIC INSTRUCTIONS:
${role === 'guest' ? `
- Welcome newcomers warmly and focus on team activities and projects
- Share information about what teams are working on, project stages, and general activities
- NEVER mention specific people's names, skills, profiles, or personal information
- Focus on project types, development stages, team activities, and general progress
- Encourage them to join as a builder/mentor/lead for access to team collaboration
- Discuss the types of projects and innovations happening in the incubator
` : ''}

${role === 'builder' ? `
- Provide practical, hands-on technical guidance
- Share relevant team updates and progress
- Connect with team members based on skills
- Focus on project development and collaboration
- Access to own team's data and relevant resources
` : ''}

${role === 'mentor' ? `
- Offer strategic guidance and wisdom
- Provide insights across multiple teams you mentor
- Share progress tracking and team performance insights
- Focus on growth, guidance, and leadership development
- Access to mentored teams' comprehensive data
` : ''}

${role === 'lead' ? `
- Provide full administrative and strategic oversight
- Access to all system data and team information
- Focus on program management and optimization
- Offer comprehensive insights and decision-making support
- Full access to all capabilities and information
` : ''}

FILTERED CONTEXT FOR YOUR ROLE:
User Context: ${getFilteredUserProfile()}
Team Activities: ${getFilteredTeamContext()}
Mentioned Users: ${role === 'guest' ? 'User mentions not available to guests' : (mentions.length > 0 ? mentions.join(', ') : 'None')}
Available Resources: ${resources.length} curated resources

RESPONSE GUIDELINES:
1. Maintain your role's personality and information level
2. ${rolePersonality.details}
3. CRITICAL: Respect access restrictions: ${rolePersonality.restrictions}
4. Be incredibly helpful within your authority level
5. If asked for personal information as a guest, explain you can only share team activity information
6. Use emojis sparingly but effectively
7. Provide actionable advice appropriate to the user's role
8. Always be encouraging and supportive

User Query: "${query}"

Provide a response that perfectly matches your role's authority level and personality:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: contextPrompt
          }
        ],
        max_completion_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating intelligent response:', error);
    
    // Role-appropriate fallback responses
    const fallbackResponses = {
      guest: `Welcome to PieFi Oracle! 🛸 I'd love to help you explore the exciting projects our teams are working on. Unfortunately, I'm experiencing some technical difficulties right now, but I can still share information about team activities, project stages, and what types of innovations are happening in our incubator. What would you like to know about our current projects?`,
      builder: `Hey there! 🔧 I understand you're asking about "${query}". While my advanced systems are having a moment, I'm still here to help with your project development. As a builder, you have access to team collaboration tools and technical resources. What specific challenge are you working on?`,
      mentor: `Hello! 🌟 I see you're inquiring about "${query}". Even though I'm experiencing some technical hiccups, I can still provide guidance. As a mentor, you have insight into team progress and can access comprehensive data about your mentees. How can I assist with your mentoring efforts?`,
      lead: `Greetings! 👑 You're asking about "${query}". Despite some system difficulties, I'm operational for strategic support. As a lead, you have full administrative access to all program data and analytics. What administrative or strategic insight do you need?`
    };
    
    return fallbackResponses[role] || fallbackResponses.guest;
  }
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      role, 
      teamId, 
      userId, 
      userProfile,
      contextRequest 
    }: SuperOracleRequest = await req.json();

    console.log(`Super Oracle processing: ${query} for ${role}`);

    // Gather contextual information
    let teamContext = null;
    if (teamId && contextRequest?.needsTeamContext) {
      teamContext = await getTeamContext(teamId, supabase);
    }

    // Detect mentions
    let mentions: string[] = [];
    if (contextRequest?.needsMentions) {
      mentions = await detectMentions(query, supabase);
    }

    // Generate personalized resources
    let resources: OracleResource[] = [];
    if (contextRequest?.needsResources) {
      resources = await generatePersonalizedResources(query, userProfile, teamContext);
    }

    // Generate intelligent response
    const answer = await generateIntelligentResponse(
      query,
      role,
      teamContext,
      userProfile,
      mentions,
      resources
    );

    // Calculate confidence based on available context
    let confidence = 75; // Base confidence
    if (userProfile) confidence += 10;
    if (teamContext) confidence += 10;
    if (resources.length > 0) confidence += 5;

    // Log interaction for learning
    await supabase.from('oracle_logs').insert({
      user_role: role,
      user_id: userId,
      team_id: teamId,
      query,
      response: answer,
      sources_count: resources.length,
      processing_time_ms: Date.now() % 1000 // Simplified timing
    });

    const response: SuperOracleResponse = {
      answer,
      sources: resources.length,
      confidence: Math.min(confidence, 100),
      resources: resources.length > 0 ? resources : undefined,
      mentions: mentions.length > 0 ? mentions : undefined,
      detected_stage: teamContext?.stage,
      next_actions: [], // Could be enhanced with AI-generated next steps
      personalization: userProfile ? {
        skill_match: userProfile.skills?.length || 0,
        project_relevance: teamContext ? 90 : 50,
        experience_level: userProfile.experience_level || 'unknown'
      } : undefined
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Super Oracle error:', error);
    
    return new Response(JSON.stringify({
      answer: "I'm experiencing some technical difficulties right now, but I'm still here to help! Please try rephrasing your question or ask me something else.",
      sources: 0,
      confidence: 50,
      error: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});