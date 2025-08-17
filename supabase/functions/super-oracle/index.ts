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
  
  const contextPrompt = `
You are the PieFi Oracle, an extremely intelligent AI assistant for a startup incubator program. You are more advanced than ChatGPT and provide incredibly helpful, contextual, and personalized responses.

CONTEXT:
- User Role: ${role}
- User Profile: ${JSON.stringify(userProfile, null, 2)}
- Team Context: ${JSON.stringify(teamContext, null, 2)}
- Mentioned Users: ${mentions.join(', ') || 'None'}
- Available Resources: ${resources.length} curated resources

USER PERSONALITY & CONTEXT:
${userProfile ? `
- Name: ${userProfile.full_name}
- Skills: ${userProfile.skills?.join(', ') || 'Not specified'}
- Help Needed: ${userProfile.help_needed?.join(', ') || 'Not specified'}
- Experience Level: ${userProfile.experience_level || 'Not specified'}
- Role: ${userProfile.role}
` : 'Limited profile information available'}

TEAM CONTEXT:
${teamContext ? `
- Team: ${teamContext.name}
- Stage: ${teamContext.stage}
- Description: ${teamContext.description}
- Recent Updates: ${teamContext.updates?.slice(0, 3).map(u => u.content).join('; ') || 'No recent updates'}
- Team Members: ${teamContext.profiles?.map(p => `${p.full_name} (${p.skills?.join(', ')})`).join(', ') || 'No team members found'}
` : 'No team context available'}

INSTRUCTIONS:
1. Be extremely helpful, intelligent, and contextual in your responses
2. Reference specific user skills, needs, and team context when relevant
3. Provide actionable advice tailored to their role and experience level
4. If resources are available, mention them naturally in your response
5. Address mentioned users appropriately
6. Use emojis sparingly but effectively
7. Be encouraging and supportive while being technically accurate
8. If the user needs to connect with someone, suggest specific team members based on skills
9. For project-specific questions, reference their team's current stage and recent updates
10. Provide next steps and actionable advice

Remember: You have access to real-time team data, user profiles, and curated resources. Use this information to provide incredibly personalized and helpful responses that feel like you truly understand their context and needs.

User Query: "${query}"

Provide a comprehensive, intelligent response that showcases your advanced capabilities:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: contextPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating intelligent response:', error);
    return `I understand you're asking about "${query}". While I'm experiencing some technical difficulties with my advanced processing systems, I can still help you based on the context I have available. Please let me know if you'd like me to try a different approach to your question.`;
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