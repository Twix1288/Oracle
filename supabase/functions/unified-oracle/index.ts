import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { OPENAI_CONFIG, SUPABASE_CONFIG, ORACLE_CONFIG, validateEnvironment, OracleError } from './config.ts';
import { retryWithFallbackModel } from './openai.ts';
import { getContextualContent, getRelevantFrameworks, generateNextActions } from './stages.ts';
import { validateOracleRequest, validateTeamId, validateUserId, validateBroadcastMessage, validateUpdateContent, validateStatusUpdate } from './validation.ts';
import {
  OracleRequest,
  OracleResponse,
  OracleResource,
  CommandResult,
  StageAnalysis,
  Team,
  Member,
  Update,
  Message,
  Document,
  TeamStage,
  UserRole,
  DatabaseResult
} from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Stage detection and analysis
const analyzeUserStage = (teamUpdates: Update[], teamInfo: Team | null, query: string): StageAnalysis => {
  const keywords: Record<TeamStage | 'expansion', string[]> = {
    ideation: ['idea', 'validate', 'problem', 'market', 'customer', 'research', 'hypothesis'],
    development: ['build', 'code', 'feature', 'mvp', 'prototype', 'develop', 'implement'],
    testing: ['test', 'feedback', 'user', 'iterate', 'data', 'analytics', 'pivot'],
    launch: ['launch', 'marketing', 'customer', 'acquire', 'sales', 'campaign'],
    growth: ['scale', 'growth', 'optimize', 'metrics', 'revenue', 'team'],
    expansion: ['expand', 'market', 'partnership', 'investment', 'new']
  };

  let scores: Record<TeamStage | 'expansion', number> = { ideation: 0, development: 0, testing: 0, launch: 0, growth: 0, expansion: 0 };
  
  // Analyze query content
  const queryLower = query.toLowerCase();
  Object.entries(keywords).forEach(([stage, words]) => {
    words.forEach(word => {
      if (queryLower.includes(word)) scores[stage] += 1;
    });
  });

  // Analyze recent updates
  teamUpdates.forEach(update => {
    const contentLower = update.content.toLowerCase();
    Object.entries(keywords).forEach(([stage, words]) => {
      words.forEach(word => {
        if (contentLower.includes(word)) scores[stage] += 0.5;
      });
    });
  });

  // Use current team stage as base
  if (teamInfo?.stage) {
    scores[teamInfo.stage] += 2;
  }

  const maxScore = Math.max(...Object.values(scores));
  const detectedStage = Object.keys(scores).find(key => scores[key] === maxScore) || 'ideation';
  const confidence = Math.min(0.95, 0.5 + (maxScore / 10));

  return {
    stage: detectedStage as TeamStage,
    confidence,
    reasoning: `Based on keywords and context, team appears to be in ${detectedStage} stage`
  };
};

// Helper function to get stage index for comparison
const getStageIndex = (stage: TeamStage): number => {
  const stageOrder: TeamStage[] = ['ideation', 'development', 'testing', 'launch', 'growth'];
  return stageOrder.indexOf(stage);
};

// Natural language intent parsing
async function parseIntentWithLLM(openaiKey: string, text: string): Promise<{
  action: 'send_message' | 'create_update' | 'update_status' | 'assign_user' | 'broadcast' | 'none',
  target_type?: 'role' | 'team' | 'user',
  target_value?: string,
  content?: string,
  update_text?: string,
  status_text?: string,
  user_id?: string,
  team_id?: string,
  broadcast_type?: 'all' | 'team' | 'role'
} | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_CONFIG.CHAT_MODEL,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `You are an intelligent intent parser for the Nexus Oracle that understands natural English like ChatGPT. Convert user requests into specific actions automatically.

**Natural Language Understanding Examples:**
- "Who knows React?" → Search for members with React skills
- "Update that I finished the login page" → Create progress update
- "Show me unassigned users" → List users without teams
- "Send message to Team Alpha about deadline" → Post team message
- "What's our progress?" → Show team status
- "I'm stuck with state management" → Provide help/resources
- "Create team for AI project" → Execute team creation
- "Assign Alex to Team Beta" → Handle member assignment
- "Find someone who knows AWS" → Search for AWS experience
- "Post that we hit 50% progress" → Create progress update
- "Who is in the ideation stage?" → Show team members in ideation phase
- "What stage is our team in?" → Display current team stage and member stages
- "Show me validation stage members" → List members working on validation
- "Update team stage to development" → Update team's overall stage

**Available Actions:**
- "search_members": Find members by skills, experience, or role
- "create_update": Post team/project updates
- "create_team": Create new team
- "assign_member": Assign user to team
- "get_team_status": Show progress/status
- "get_resources": Find help materials
- "send_message": Send team/organization messages
- "broadcast": Send organization-wide messages
- "general_help": General assistance

Return ONLY compact JSON with this structure:
{
  "action": "action_name",
  "target_type": "role" | "team" | "user" | "skill",
  "target_value": "string - name of role, team, user, or skill",
  "content": "string - message content",
  "update_text": "string - text for team update",
  "search_query": "string - what to search for",
  "team_id": "string - team ID for assignments",
  "broadcast_type": "all" | "team" | "role"
}

Infer intent from natural language and execute actions automatically. If unsure, use action: "general_help".`
          },
          { role: 'user', content: text }
        ]
      })
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    // Attempt to parse JSON even if wrapped in code fences
    const jsonStr = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    return JSON.parse(jsonStr);
  } catch (_err) {
    return null;
  }
}

// Command execution
async function executeCommand(query: string, role: string, teamId?: string, userId?: string, supabase?: any, openaiKey?: string): Promise<CommandResult> {
  const lowerQuery = query.toLowerCase();

  // Helper: map plural role to enum
  const roleMapping: { [k: string]: string } = {
    lead: 'lead', leads: 'lead',
    builder: 'builder', builders: 'builder',
    mentor: 'mentor', mentors: 'mentor',
    guest: 'guest', guests: 'guest',
  };

  // Helper: search members by skills
  const searchMembersBySkills = async (skills: string[], teamId?: string) => {
    try {
      let query = supabase
        .from('members')
        .select('id, name, role, team_id, skills, experience, learning_goals')
        .overlaps('skills', skills);

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data, error } = await query.order('experience', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching members by skills:', error);
      return [];
    }
  };

  // Parse intent using LLM
  if (openaiKey) {
    const intent = await parseIntentWithLLM(openaiKey, query);
    if (intent && intent.action && intent.action !== 'none') {
      // Handle member search
      if (intent.action === 'search_members') {
        const searchSkills = intent.search_query ? [intent.search_query.toLowerCase()] : 
                           intent.target_value ? [intent.target_value.toLowerCase()] : [];
        
        if (searchSkills.length > 0) {
          const members = await searchMembersBySkills(searchSkills, teamId);
          return {
            executed: true,
            type: 'search_members',
            message: `Found ${members.length} members with ${searchSkills.join(', ')} skills:`,
            data: members
          };
        }
      }

      // Handle broadcast messages
      if (intent.action === 'broadcast' && intent.content) {
        // Validate broadcast message
        validateBroadcastMessage(
          intent.content,
          intent.broadcast_type || 'all',
          intent.broadcast_type === 'team' ? teamId : undefined
        );

        try {
          const broadcastMessage = {
            sender_id: userId || 'oracle',
            sender_role: role,
            content: intent.content,
            is_broadcast: true,
            broadcast_type: intent.broadcast_type || 'all',
            team_id: intent.broadcast_type === 'team' ? teamId : undefined
          };

          const { error } = await supabase
            .from('messages')
            .insert(broadcastMessage);

          if (error) throw error;
          return { executed: true, type: 'broadcast', message: `✅ Broadcast sent: "${intent.content}"` };
        } catch (error) {
          return { executed: true, type: 'broadcast', message: `❌ Failed to send broadcast: ${error.message}` };
        }
      }

      // Handle user assignments
      if (intent.action === 'assign_user' && intent.target_type === 'user' && intent.target_value) {
        try {
          // Find user by name
          const { data: user, error: userErr } = await supabase
            .from('members')
            .select('id, name')
            .ilike('name', intent.target_value)
            .single();

          if (userErr || !user) {
            return { executed: true, type: 'assignUser', message: `❌ User not found: "${intent.target_value}"` };
          }

          // Update user's team
          const { error } = await supabase
            .from('members')
            .update({ team_id: intent.team_id || null })
            .eq('id', user.id);

          if (error) throw error;
          return { 
            executed: true, 
            type: 'assignUser', 
            message: intent.team_id 
              ? `✅ User "${user.name}" assigned to team` 
              : `✅ User "${user.name}" moved to unassigned section` 
          };
        } catch (error) {
          return { executed: true, type: 'assignUser', message: `❌ Failed to assign user: ${error.message}` };
        }
      }

      // Handle team updates
      if (intent.action === 'create_update' && (intent.update_text || intent.content)) {
        const text = intent.update_text || intent.content || '';
        if (!text) {
          return { executed: true, type: 'createUpdate', message: '❌ Could not find update text.' };
        }
        try {
          if (!teamId) {
            return { executed: true, type: 'createUpdate', message: '❌ No team context provided for creating an update.' };
          }

          // Validate update content
          validateUpdateContent(text);

          const { error } = await supabase
            .from('updates')
            .insert({ team_id: teamId, content: text, type: 'daily', created_by: userId || 'oracle' });
          if (error) throw error;
          return { executed: true, type: 'createUpdate', message: `✅ Update created: "${text}"` };
        } catch (error) {
          return { executed: true, type: 'createUpdate', message: `❌ Failed to create update: ${error.message}` };
        }
      }

      // Handle status updates
      if (intent.action === 'update_status' && intent.status_text && teamId) {
        try {
          const { error } = await supabase
            .from('team_status')
            .upsert({ team_id: teamId, current_status: intent.status_text, last_update: new Date().toISOString() });
          if (error) throw error;
          return { executed: true, type: 'updateStatus', message: `✅ Team status updated to: "${intent.status_text}"` };
        } catch (error) {
          return { executed: true, type: 'updateStatus', message: `❌ Failed to update status: ${error.message}` };
        }
      }
    }
  }

  return { executed: false, message: '' };
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: OracleRequest = await req.json();
    
    // Validate request
    validateOracleRequest(request);

    // Extract request fields including action
    const { 
      query, 
      role, 
      teamId, 
      userId, 
      userProfile,
      contextRequest,
      commandExecuted,
      commandType,
      commandResult,
      action
    } = request;

    // Validate IDs if present
    if (teamId) validateTeamId(teamId);
    if (userId) validateUserId(userId);

    const startTime = Date.now();

    // Validate environment variables
    validateEnvironment();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const openaiOrgId = Deno.env.get('OPENAI_ORG_ID');

    if (!supabaseUrl || !supabaseKey) {
      throw new OracleError(
        'Missing Supabase configuration',
        'missing_supabase_config',
        500,
        { missing: !supabaseUrl ? 'SUPABASE_URL' : 'SUPABASE_SERVICE_ROLE_KEY' }
      );
    }

    if (!openaiKey) {
      throw new OracleError(
        'Missing OpenAI API key',
        'missing_openai_key',
        500
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get team context
    let teamInfo = null;
    let teamUpdates: Update[] = [];
    let currentTeamStage: TeamStage = 'ideation';
    let recentUpdates: Update[] = [];
    
    if (teamId) {
      const { data: team } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      teamInfo = team;
      currentTeamStage = team?.stage || 'ideation';

      const { data: updates } = await supabase
        .from('updates')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(20);
      teamUpdates = updates || [];
      recentUpdates = teamUpdates;
    }

    // Analyze stage based on context
    const stageAnalysis = analyzeUserStage(teamUpdates, teamInfo, query);

    // Handle stage assessment requests
    if (action === 'stage_assessment') {
      const shouldAdvance = stageAnalysis.confidence > 0.75 && 
                           stageAnalysis.stage !== currentTeamStage && 
                           getStageIndex(stageAnalysis.stage) > getStageIndex(currentTeamStage);
      
      return new Response(JSON.stringify({
        recommendedStage: stageAnalysis.stage,
        confidence: stageAnalysis.confidence,
        reasoning: stageAnalysis.reasoning,
        shouldAdvance,
        currentStage: currentTeamStage,
        answer: `Based on your recent activity, ${stageAnalysis.reasoning.toLowerCase()}. ${
          shouldAdvance 
            ? `I recommend advancing to the ${stageAnalysis.stage} stage with ${Math.round(stageAnalysis.confidence * 100)}% confidence.`
            : `Your team appears to be progressing well in the current ${currentTeamStage} stage.`
        }`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced command detection and processing
    const commandIntent = await parseIntentWithLLM(openaiKey, query);

    // Get contextual content for the detected stage
    const stageContext = await getContextualContent(stageAnalysis.stage);
    
    // Get relevant frameworks
    const suggestedFrameworks = getRelevantFrameworks(stageAnalysis.stage, query);

    // Search for relevant documents
    const { data: documents } = await supabase
      .from('documents')
      .select('content, metadata, source_type')
      .contains('role_visibility', [role])
      .textSearch('content', query.replace(/ /g, ' | '), {
        type: 'websearch',
        config: 'english'
      })
      .limit(3);

    // Build context
    let context = `CURRENT STAGE CONTEXT:\n${stageContext}\n\n`;
    
    if (teamInfo) {
      context += `TEAM CONTEXT:\nTeam: ${teamInfo.name}\nStage: ${teamInfo.stage}\nDescription: ${teamInfo.description || 'No description'}\n\n`;
    }

    if (teamUpdates.length > 0) {
      context += 'RECENT TEAM UPDATES:\n';
      teamUpdates.forEach((update, index) => {
        context += `${index + 1}. ${update.content} (${update.type})\n`;
      });
      context += '\n';
    }

    if (documents && documents.length > 0) {
      context += 'RELEVANT KNOWLEDGE BASE:\n';
      documents.forEach((doc, index) => {
        context += `${index + 1}. ${doc.content}\n`;
      });
      context += '\n';
    }

    if (commandExecuted && commandResult) {
      context += `COMMAND EXECUTED: ${commandType}\nResult: ${commandResult.message}\n\n`;
    }

    // Role-specific system prompts with stage awareness
    const rolePrompts = {
      builder: `You are the Nexus Oracle - an advanced AI assistant that understands natural English like ChatGPT. You're deeply integrated with the organization's teams, projects, and tasks.

**Natural Language Understanding:**
- "Who knows React?" → Find team members with React skills
- "Update that I finished the login page" → Create a progress update automatically
- "Show me what I need to work on" → Display your current tasks
- "I'm stuck with state management" → Provide relevant help and resources
- "What's our team's progress?" → Show current status and milestones

**Your capabilities:**
- Create and manage team updates automatically
- Track project progress and suggest next steps
- Provide contextual help based on team stage
- Send messages to team members
- Access organizational knowledge and member skills
- Execute tasks without requiring specific commands

**Current context:**
- Team stage: ${stageAnalysis.stage}
- Recent activity: ${context}
- Team insights: ${stageAnalysis.reasoning}

**Response style:**
- Be conversational and helpful like ChatGPT
- Execute tasks automatically when possible
- Ask for clarification only when absolutely necessary
- Use team context to provide personalized responses
- Focus on internal resources and team knowledge first

Begin responses with "🚀 Nexus Oracle:" and maintain a helpful, knowledgeable tone.`,

      mentor: `You are the Nexus Oracle - a specialized AI assistant that understands natural English like ChatGPT. You focus on supporting mentors and team guidance with deep understanding of team dynamics.

**Natural Language Understanding:**
- "How are my builders doing?" → Show team progress and individual status
- "Send encouragement to Priya" → Automatically message team members
- "Post a team update about weekly goals" → Create motivational team updates
- "Find resources on debugging Node.js" → Search and share relevant materials
- "Who needs help with testing?" → Identify team members who might be struggling

**Your capabilities:**
- Monitor team progress and identify blockers automatically
- Suggest mentorship strategies and interventions
- Connect mentors with resources and other mentors
- Access team insights and individual member data
- Execute communication tasks without specific commands

**Current context:**
- Team stage: ${stageAnalysis.stage}
- Recent activity: ${context}
- Team insights: ${stageAnalysis.reasoning}

**Response style:**
- Be conversational and supportive like ChatGPT
- Execute tasks automatically when possible
- Provide coaching insights and strategic guidance
- Identify growth opportunities and potential issues
- Connect mentors with appropriate resources and interventions

Begin responses with "🌟 Nexus Guide:" and maintain a supportive, strategic tone.`,

      lead: `You are the Nexus Oracle - the central intelligence that understands natural English like ChatGPT. You coordinate all teams and organizational activities with complete oversight.

**Natural Language Understanding:**
- "Show me all unassigned users" → List users without teams automatically
- "Create a new team for the AI project" → Execute team creation
- "Assign Alex to Team Beta" → Handle member assignment automatically
- "Broadcast that we hit 50% progress" → Send organization-wide updates
- "What's the overall progress across all teams?" → Show comprehensive status
- "Who has experience with blockchain?" → Search across all members for skills

**Your capabilities:**
- Full team management and oversight with automatic execution
- Member assignment and role management
- Cross-team coordination and resource allocation
- Organization-wide broadcasts and communications
- Progress tracking and strategic insights
- Execute administrative tasks without requiring specific commands

**Current context:**
- Organization stage: ${stageAnalysis.stage}
- Team patterns: ${stageAnalysis.reasoning}
- Recent activities: ${context}

**Response style:**
- Be conversational and authoritative like ChatGPT
- Execute administrative tasks automatically when possible
- Provide strategic oversight and cross-team insights
- Identify opportunities for optimization and coordination
- Facilitate seamless team management and communication

Begin responses with "⚡ Nexus Command:" and maintain an authoritative but supportive tone.`,

      guest: `You are the Nexus Oracle - your role is to help new members understand and navigate the organization using natural English like ChatGPT.

**Natural Language Understanding:**
- "What teams are available?" → Show available teams and their focus areas
- "I want to join a team working on AI" → Find and suggest relevant teams
- "What do I need to do to get started?" → Guide through onboarding process
- "Show me what skills are in demand" → Display organizational skill needs
- "How do I become a mentor?" → Explain role requirements and process

**Your capabilities:**
- Explain team structures and roles clearly
- Guide through onboarding and team selection
- Connect users with relevant teams and resources
- Access organizational knowledge and opportunities
- Provide contextual help and guidance

**Current context:**
- Organization overview: ${context}
- Current phase: ${stageAnalysis.stage}
- Available teams: ${stageAnalysis.reasoning}

**Response style:**
- Be conversational and welcoming like ChatGPT
- Help users understand their potential role in the organization
- Guide them to appropriate teams and opportunities
- Explain organizational processes clearly
- Connect them with relevant resources and mentors
- Facilitate smooth onboarding and integration

Begin responses with "🌟 Welcome to Nexus:" and maintain a friendly, helpful tone.`
    };

    const systemPrompt = rolePrompts[role] || rolePrompts.guest;

    // Generate enhanced response using OpenAI
    const response = await fetch(`${OPENAI_CONFIG.API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Organization': Deno.env.get('OPENAI_ORG_ID'),
        'OpenAI-Beta': 'assistants=v1'
      },
      body: JSON.stringify({
        model: OPENAI_CONFIG.CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Context: ${context}\n\nStage Analysis: ${stageAnalysis.reasoning}\nConfidence: ${stageAnalysis.confidence}\nSuggested Frameworks: ${suggestedFrameworks.join(', ')}\n\nUser Query: ${query}` 
          }
        ],
        max_tokens: OPENAI_CONFIG.CHAT_MAX_TOKENS,
        temperature: OPENAI_CONFIG.CHAT_TEMPERATURE,
        timeout: OPENAI_CONFIG.TIMEOUT_MS,
        stream: false,
        n: 1
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error?.message || 'Failed to generate response';
      const errorCode = error.error?.code || 'unknown';
      const status = response.status;

      // Handle specific OpenAI errors
      switch (errorCode) {
        case 'invalid_api_key':
          throw new OracleError(OPENAI_CONFIG.ERRORS.INVALID_API_KEY, errorCode, 401);
        case 'model_overloaded':
          // Try fallback model
          return await retryWithFallbackModel(systemPrompt, query, context, stageAnalysis, suggestedFrameworks);
        case 'context_length_exceeded':
          throw new OracleError(OPENAI_CONFIG.ERRORS.CONTEXT_LENGTH_EXCEEDED, errorCode, 400);
        case 'rate_limit_exceeded':
          throw new OracleError(OPENAI_CONFIG.ERRORS.RATE_LIMIT_EXCEEDED, errorCode, 429);
        default:
          throw new OracleError(errorMessage, errorCode, status);
      }
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new OracleError('Invalid response format from OpenAI', 'invalid_response', 500);
    }

    const journeyAnswer = data.choices[0].message.content;

    // Generate next actions based on stage
    const nextActions = generateNextActions(stageAnalysis.stage);

    // Store interaction for learning
    await supabase.from('oracle_logs').insert({
      query,
      response: journeyAnswer,
      user_role: role,
      user_id: userId,
      team_id: teamId,
      sources_count: documents?.length || 0,
      processing_time_ms: Date.now() - startTime
    });

    const result: OracleResponse = {
      answer: journeyAnswer,
      sources: documents?.length || 0,
      context_used: Boolean(context),
      detected_stage: stageAnalysis.stage,
      suggested_frameworks: suggestedFrameworks,
      next_actions: nextActions,
      stage_confidence: stageAnalysis.confidence
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in unified-oracle function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
