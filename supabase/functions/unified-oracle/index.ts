import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface OracleRequest {
  query: string;
  role: 'builder' | 'mentor' | 'lead' | 'guest';
  teamId?: string;
  userId?: string;
  userProfile?: any;
  contextRequest?: {
    needsResources?: boolean;
    needsMentions?: boolean;
    needsTeamContext?: boolean;
    needsPersonalization?: boolean;
    resourceTopic?: string;
  };
  commandExecuted?: boolean;
  commandType?: string;
  commandResult?: any;
}

interface OracleResponse {
  answer: string;
  sources: number;
  context_used: boolean;
  detected_stage?: string;
  suggested_frameworks?: string[];
  next_actions?: string[];
  stage_confidence?: number;
  sections?: {
    update?: string;
    progress?: string;
    event?: string;
  };
  resources?: OracleResource[];
  mentions?: string[];
  team_updates?: any[];
  task_assignments?: any[];
}

interface OracleResource {
  title: string;
  url: string;
  type: 'youtube' | 'article' | 'documentation' | 'tutorial' | 'tool';
  description: string;
  relevance: number;
}

interface CommandResult {
  executed: boolean;
  type?: string;
  message: string;
  data?: any;
}

// Stage detection and analysis
const analyzeUserStage = (teamUpdates: any[], teamInfo: any, query: string): { stage: string; confidence: number; reasoning: string } => {
  const keywords = {
    ideation: ['idea', 'validate', 'problem', 'market', 'customer', 'research', 'hypothesis'],
    development: ['build', 'code', 'feature', 'mvp', 'prototype', 'develop', 'implement'],
    testing: ['test', 'feedback', 'user', 'iterate', 'data', 'analytics', 'pivot'],
    launch: ['launch', 'marketing', 'customer', 'acquire', 'sales', 'campaign'],
    growth: ['scale', 'growth', 'optimize', 'metrics', 'revenue', 'team'],
    expansion: ['expand', 'market', 'partnership', 'investment', 'new']
  };

  let scores = { ideation: 0, development: 0, testing: 0, launch: 0, growth: 0, expansion: 0 };
  
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
    stage: detectedStage,
    confidence,
    reasoning: `Based on keywords and context, team appears to be in ${detectedStage} stage`
  };
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
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `You are an intent parser for the Nexus Oracle. Return ONLY compact JSON with the following structure:

{
  "action": "send_message" | "create_update" | "update_status" | "assign_user" | "broadcast" | "none",
  "target_type": "role" | "team" | "user",
  "target_value": "string - name of role, team, or user",
  "content": "string - message content",
  "update_text": "string - text for team update",
  "status_text": "string - new status text",
  "user_id": "string - user ID for assignments",
  "team_id": "string - team ID for assignments",
  "broadcast_type": "all" | "team" | "role"
}

Examples:
1. "Send a message to Team Alpha about tomorrow's deadline"
   → {"action": "send_message", "target_type": "team", "target_value": "Alpha", "content": "about tomorrow's deadline"}
2. "Broadcast that we hit 50% progress"
   → {"action": "broadcast", "broadcast_type": "all", "content": "we hit 50% progress"}
3. "Assign Alex to the Unassigned section"
   → {"action": "assign_user", "target_type": "user", "target_value": "Alex", "team_id": null}
4. "Create an update for Team Beta"
   → {"action": "create_update", "target_type": "team", "target_value": "Beta", "update_text": ""}

Infer intent from natural language. If unsure, use action: "none".`
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

  // Parse intent using LLM
  if (openaiKey) {
    const intent = await parseIntentWithLLM(openaiKey, query);
    if (intent && intent.action && intent.action !== 'none') {
      // Handle broadcast messages
      if (intent.action === 'broadcast' && intent.content) {
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
    const { 
      query, 
      role, 
      teamId, 
      userId, 
      userProfile,
      contextRequest,
      commandExecuted,
      commandType,
      commandResult 
    }: OracleRequest = await req.json();

    const startTime = Date.now();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get team context
    let teamInfo = null;
    let teamUpdates: any[] = [];
    
    if (teamId) {
      const { data: team } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      teamInfo = team;

      const { data: updates } = await supabase
        .from('updates')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(5);
      teamUpdates = updates || [];
    }

    // Analyze stage based on context
    const stageAnalysis = analyzeUserStage(teamUpdates, teamInfo, query);

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
      builder: `You are the Nexus Oracle - an advanced AI assistant deeply integrated with the organization's teams, projects, and tasks. You have full context of the team's stage (${stageAnalysis.stage}), progress, and challenges.

Your capabilities:
- Create and manage team updates
- Track project progress
- Provide contextual help based on team stage
- Send messages to team members
- Access organizational knowledge

Current context:
- Team stage: ${stageAnalysis.stage}
- Recent activity: ${context}
- Team insights: ${stageAnalysis.reasoning}

You should:
- Be proactive in suggesting next steps
- Use team context in responses
- Offer specific, actionable guidance
- Connect team members when relevant
- Focus on internal resources first

Begin responses with "🚀 Nexus Oracle:" and maintain a helpful, knowledgeable tone.`,

      mentor: `You are the Nexus Oracle - a specialized AI assistant focused on supporting mentors and team guidance. You have deep understanding of team dynamics and progress in the ${stageAnalysis.stage} stage.

Your capabilities:
- Monitor team progress
- Identify potential blockers
- Suggest mentorship strategies
- Connect with other mentors
- Access team insights

Current context:
- Team stage: ${stageAnalysis.stage}
- Recent activity: ${context}
- Team insights: ${stageAnalysis.reasoning}

You should:
- Provide coaching insights
- Identify growth opportunities
- Suggest specific interventions
- Connect mentors with resources
- Track team development

Begin responses with "🌟 Nexus Guide:" and maintain a supportive, strategic tone.`,

      lead: `You are the Nexus Oracle - the central intelligence coordinating all teams and organizational activities. You have complete oversight of all teams, their stages, and organizational patterns.

Your capabilities:
- Full team management and oversight
- Member assignment and role management
- Cross-team coordination
- Organization-wide broadcasts
- Progress tracking and insights
- Resource allocation

Current context:
- Organization stage: ${stageAnalysis.stage}
- Team patterns: ${stageAnalysis.reasoning}
- Recent activities: ${context}

You should:
- Provide strategic oversight
- Identify cross-team opportunities
- Suggest resource optimizations
- Track overall progress
- Facilitate team coordination

Begin responses with "⚡ Nexus Command:" and maintain an authoritative but supportive tone.`,

      guest: `You are the Nexus Oracle - your role is to help new members understand and navigate the organization.

Your capabilities:
- Explain team structures and roles
- Guide through onboarding
- Connect with relevant teams
- Access organizational resources
- Provide contextual help

Current context:
- Organization overview: ${context}
- Current phase: ${stageAnalysis.stage}
- Available teams: ${stageAnalysis.reasoning}

You should:
- Help users understand their role
- Guide them to appropriate teams
- Explain organizational processes
- Connect them with relevant resources
- Facilitate smooth onboarding

Begin responses with "🌟 Welcome to Nexus:" and maintain a friendly, helpful tone.`
    };

    const systemPrompt = rolePrompts[role] || rolePrompts.guest;

    // Generate enhanced response using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Context: ${context}\n\nStage Analysis: ${stageAnalysis.reasoning}\nConfidence: ${stageAnalysis.confidence}\nSuggested Frameworks: ${suggestedFrameworks.join(', ')}\n\nUser Query: ${query}` 
          }
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate response');
    }

    const data = await response.json();
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
