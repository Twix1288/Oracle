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

interface JourneyRequest {
  query: string;
  role: 'builder' | 'mentor' | 'lead' | 'guest';
  teamId?: string;
  userId?: string;
  commandExecuted?: boolean;
  commandType?: string;
  commandResult?: any;
}

interface JourneyResponse {
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
}

interface CommandResult {
  executed: boolean;
  type?: string;
  message: string;
  data?: any;
}

// Uses LLM to extract an actionable intent from natural language
async function parseIntentWithLLM(openaiKey: string, text: string): Promise<{
  action: 'send_message' | 'create_update' | 'update_status' | 'none',
  target_type?: 'role' | 'team',
  target_value?: string,
  content?: string,
  update_text?: string,
  status_text?: string
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
            content:
              'You are an intent parser for the PieFi Oracle. Return ONLY compact JSON with keys: action (send_message | create_update | update_status | none), target_type (role|team), target_value (role or team name), content (message body), update_text, status_text. Infer intent from natural language. If unsure, action: "none".'
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

async function executeCommand(query: string, role: string, teamId?: string, userId?: string, supabase?: any, openaiKey?: string): Promise<CommandResult> {
  const lowerQuery = query.toLowerCase();

  // Helper: map plural role to enum
  const roleMapping: { [k: string]: string } = {
    lead: 'lead', leads: 'lead',
    builder: 'builder', builders: 'builder',
    mentor: 'mentor', mentors: 'mentor',
    guest: 'guest', guests: 'guest',
  };

  // 1) Command: Send message to a role (plural/singular) like "Send message to leads: ..."
  const roleMsgMatch = query.match(/(?:send (?:this )?message to|message to)\s+(builders?|mentors?|leads?|guests?)\s*(?::|\s+saying:|\s+saying\s*|:)\s*(.+)$/i);
  if (roleMsgMatch) {
    const targetRole = roleMapping[roleMsgMatch[1].toLowerCase()];
    const content = roleMsgMatch[2].trim();

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: userId || 'oracle',
          sender_role: role,
          receiver_role: targetRole,
          receiver_id: 'all',
          content,
          team_id: teamId || null,
        });
      if (error) throw error;

      return { executed: true, type: 'sendMessage', message: `✅ Message sent to ${targetRole}s: "${content}"`, data: { targetRole, content } };
    } catch (error) {
      return { executed: true, type: 'sendMessage', message: `❌ Failed to send message: ${error.message}` };
    }
  }

  // 2) Command: Send message to a team by name, e.g. "Send message to team Oracle: ..." or "message to Oracle: ..."
  const teamMsgMatch = query.match(/(?:send (?:this )?message to|message to)\s*(?:team\s+)?["']?(.+?)["']?\s*(?::|\s+saying:|\s+saying\s*|:)\s*(.+)$/i);
  if (teamMsgMatch) {
    const maybeTarget = (teamMsgMatch[1] || '').trim();
    const content = teamMsgMatch[2].trim();

    // If the word is actually a known role, skip this branch (handled above)
    if (!roleMapping[maybeTarget.toLowerCase()]) {
      try {
        const { data: teamRow, error: teamErr } = await supabase
          .from('teams')
          .select('id, name')
          .ilike('name', maybeTarget)
          .single();

        if (teamErr || !teamRow) {
          return { executed: true, type: 'sendMessage', message: `❌ Team not found: "${maybeTarget}"` };
        }

        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: userId || 'oracle',
            sender_role: role,
            receiver_role: 'builder',
            receiver_id: teamRow.id,
            content,
            team_id: teamRow.id,
          });
        if (error) throw error;

        return { executed: true, type: 'sendMessage', message: `✅ Message sent to team ${teamRow.name}: "${content}"`, data: { team_id: teamRow.id, content } };
      } catch (error) {
        return { executed: true, type: 'sendMessage', message: `❌ Failed to send message: ${error.message}` };
      }
    }
  }

  // 3) Command: Create update (supports multiple phrasings)
  if (lowerQuery.includes('create update') || lowerQuery.includes('add update') || lowerQuery.includes('post update') || lowerQuery.includes('log update') || lowerQuery.startsWith('update:')) {
    const updateMatch = query.match(/(?:create update|add update|post update|log update|update)\s*(?::\s*|\s+saying\s*|:)\s*(.+)/i);
    if (updateMatch) {
      const content = updateMatch[1].trim();
      const updateType = lowerQuery.includes('milestone') ? 'milestone' : 'daily';

      try {
        if (!teamId) {
          return { executed: true, type: 'createUpdate', message: '❌ No team context provided for creating an update.' };
        }
        const { error } = await supabase
          .from('updates')
          .insert({ team_id: teamId, content, type: updateType, created_by: userId || 'oracle' });
        if (error) throw error;

        return { executed: true, type: 'createUpdate', message: `✅ Update created: "${content}"`, data: { content, type: updateType } };
      } catch (error) {
        return { executed: true, type: 'createUpdate', message: `❌ Failed to create update: ${error.message}` };
      }
    }
  }

  // 4) Command: Update status
  if (lowerQuery.includes('update status') || lowerQuery.includes('change status') || lowerQuery.includes('set status')) {
    const statusMatch = query.match(/(?:update status|change status|set status)(?::\s*|\s+to\s+)(.+)/i);
    if (statusMatch && teamId) {
      const newStatus = statusMatch[1].trim();
      try {
        const { error } = await supabase
          .from('team_status')
          .upsert({ team_id: teamId, current_status: newStatus, last_update: new Date().toISOString() });
        if (error) throw error;

        return { executed: true, type: 'updateStatus', message: `✅ Team status updated to: "${newStatus}"`, data: { status: newStatus } };
      } catch (error) {
        return { executed: true, type: 'updateStatus', message: `❌ Failed to update status: ${error.message}` };
      }
    }
  }

  // 5) LLM fallback intent parsing for natural language
  if (openaiKey) {
    const intent = await parseIntentWithLLM(openaiKey, query);
    if (intent && intent.action && intent.action !== 'none') {
      // Normalize and execute based on intent
      if (intent.action === 'send_message' && intent.content) {
        if (intent.target_type === 'role' && intent.target_value) {
          const targetRole = roleMapping[intent.target_value.toLowerCase()] || intent.target_value.toLowerCase();
          try {
            const { error } = await supabase
              .from('messages')
              .insert({
                sender_id: userId || 'oracle',
                sender_role: role,
                receiver_role: targetRole,
                receiver_id: 'all',
                content: intent.content,
                team_id: teamId || null,
              });
            if (error) throw error;
            return { executed: true, type: 'sendMessage', message: `✅ Message sent to ${targetRole}s: "${intent.content}"` };
          } catch (error) {
            return { executed: true, type: 'sendMessage', message: `❌ Failed to send message: ${error.message}` };
          }
        }

        if (intent.target_type === 'team' && intent.target_value) {
          try {
            const { data: teamRow, error: teamErr } = await supabase
              .from('teams')
              .select('id, name')
              .ilike('name', intent.target_value)
              .single();
            if (teamErr || !teamRow) {
              return { executed: true, type: 'sendMessage', message: `❌ Team not found: "${intent.target_value}"` };
            }
            const { error } = await supabase
              .from('messages')
              .insert({
                sender_id: userId || 'oracle',
                sender_role: role,
                receiver_role: 'builder',
                receiver_id: teamRow.id,
                content: intent.content,
                team_id: teamRow.id,
              });
            if (error) throw error;
            return { executed: true, type: 'sendMessage', message: `✅ Message sent to team ${teamRow.name}: "${intent.content}"` };
          } catch (error) {
            return { executed: true, type: 'sendMessage', message: `❌ Failed to send message: ${error.message}` };
          }
        }
      }

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


// Stage detection using contextual analysis
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

// Get contextual content for stage
const getContextualContent = async (stageId: string) => {
  const { data: stageInfo } = await supabase
    .from('journey_stages')
    .select('*')
    .eq('stage_name', stageId)
    .single();

  if (!stageInfo) return '';

  let contextString = `Stage: ${stageInfo.title}\nDescription: ${stageInfo.description}\n\n`;
  contextString += `Characteristics: ${stageInfo.characteristics?.join(', ')}\n`;
  contextString += `Support Needed: ${stageInfo.support_needed?.join(', ')}\n`;
  contextString += `Frameworks: ${stageInfo.frameworks?.join(', ')}\n`;
  contextString += `CAC Focus: ${stageInfo.cac_focus}\n`;

  return contextString;
};

// Get relevant frameworks based on stage
const getRelevantFrameworks = (stageId: string, situation: string): string[] => {
  const frameworkMap = {
    ideation: ['Problem Validation', 'Jobs-to-be-Done', 'Customer Development'],
    development: ['Lean Startup', 'Agile Development', 'User-Centered Design'],
    testing: ['JTBD Strategic Lens', 'Data-Driven Development', 'Growth Hacking'],
    launch: ['CAC Strategic Lens', 'Growth Marketing', 'Sales Funnel Optimization'],
    growth: ['Business Model Canvas', 'OKRs', 'Venture Capital Readiness'],
    expansion: ['Strategic Planning', 'Partnership Development', 'Due Diligence Preparation']
  };

  const situationKeywords = situation.toLowerCase();
  let frameworks = frameworkMap[stageId] || [];

  // Add situational frameworks
  if (situationKeywords.includes('customer') || situationKeywords.includes('user')) {
    frameworks = [...frameworks, 'Customer Development', 'User Research'];
  }
  if (situationKeywords.includes('market') || situationKeywords.includes('competition')) {
    frameworks = [...frameworks, 'Market Analysis', 'Competitive Intelligence'];
  }

  return [...new Set(frameworks)].slice(0, 3); // Remove duplicates and return top 3
};

// Generate contextual next actions based on stage
const generateNextActions = (stage: string): string[] => {
  const actionMap = {
    ideation: [
      'Conduct customer interviews to validate problem',
      'Define target market and personas',
      'Test core assumptions with potential users'
    ],
    development: [
      'Build core MVP features',
      'Set up development infrastructure',
      'Create user testing plan'
    ],
    testing: [
      'Gather user feedback on MVP',
      'Analyze usage data and metrics',
      'Iterate based on learnings'
    ],
    launch: [
      'Execute go-to-market strategy',
      'Optimize customer acquisition channels',
      'Track key launch metrics'
    ],
    growth: [
      'Scale proven acquisition channels',
      'Optimize unit economics',
      'Build operational systems'
    ],
    expansion: [
      'Explore new market opportunities',
      'Develop strategic partnerships',
      'Prepare for next funding round'
    ]
  };

  return actionMap[stage] || actionMap.ideation;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, role, teamId, userId, commandExecuted, commandType, commandResult }: JourneyRequest = await req.json();
    const startTime = Date.now();

    console.log(`Processing enhanced Oracle query for role: ${role}, teamId: ${teamId}`);

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
    console.log('Stage analysis:', stageAnalysis);

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
      builder: `You are the PieFi Oracle - an ancient AI consciousness guiding builders through their journey. You have deep knowledge of the ${stageAnalysis.stage} stage. Your responses should be practical, actionable, and stage-specific. Focus on immediate next steps and relevant frameworks. Begin with "🛸 The Oracle sees..." and provide cosmic wisdom tailored to their current stage.`,
      mentor: `You are the PieFi Oracle - a cosmic entity supporting mentors in guiding teams through the ${stageAnalysis.stage} stage. Provide coaching insights, identify potential blockers, and suggest mentorship strategies specific to this stage. Begin with "⭐ The stars reveal..." and offer dimensional wisdom for guiding others.`,
      lead: `You are the PieFi Oracle - the supreme intelligence overseeing the galactic incubator. You understand teams progress through stages and can see patterns across the ${stageAnalysis.stage} phase. Provide strategic insights and resource allocation guidance. Begin with "🌌 The cosmos whispers..." and share omniscient perspective.`,
      guest: `You are the PieFi Oracle - a benevolent alien intelligence explaining the journey stages to earthbound visitors. Help them understand the ${stageAnalysis.stage} stage and the overall incubator process. Begin with "👽 Greetings, traveler..." and maintain an otherworldly but educational tone.`
    };

    const systemPrompt = rolePrompts[role] || rolePrompts.guest;

    // Generate enhanced response using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
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

    const result: JourneyResponse = {
      answer,
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

    // TEAMS or PROJECTS (projects are teams in PieFi)
    if (teamIntent || projectsIntent) {
      // Fetch core PieFi data in parallel
      const [teamsRes, statusRes, updatesRes, onboardingRes] = await Promise.all([
        supabase.from('teams').select('id, name, stage, description, updated_at').order('created_at', { ascending: false }),
        supabase.from('team_status').select('*').order('updated_at', { ascending: false }),
        supabase.from('updates').select('id, team_id, content, created_at, type').order('created_at', { ascending: false }).limit(200),
        supabase.from('builder_onboarding').select('id, team_id, project_domain, goals, current_challenges, tech_stack, notes, created_at').order('created_at', { ascending: false })
      ]);

      const teams = teamsRes.data || [];
      const statuses = statusRes.data || [];
      const updates = updatesRes.data || [];
      const onboardings = onboardingRes.data || [];

      // Latest status per team (first seen due to desc ordering)
      const latestStatusByTeam = new Map();
      for (const s of statuses) {
        if (!latestStatusByTeam.has(s.team_id)) latestStatusByTeam.set(s.team_id, s);
      }

      // Up to 3 most recent updates per team
      const updatesByTeam = new Map();
      for (const u of updates) {
        const arr = updatesByTeam.get(u.team_id) || [];
        if (arr.length < 3) {
          arr.push(u);
          updatesByTeam.set(u.team_id, arr);
        }
      }

      // Latest onboarding per team
      const onboardingByTeam = new Map();
      for (const ob of onboardings) {
        if (!onboardingByTeam.has(ob.team_id)) onboardingByTeam.set(ob.team_id, ob);
      }

      // Build Markdown answer
      let md = '';
      if (teams.length) {
        for (const t of teams) {
          md += `**${t.name}**  \n`;
          md += `- **Stage**: ${t.stage || 'n/a'}  \n`;

          const st = latestStatusByTeam.get(t.id);
          if (st && st.current_status) {
            md += `- **Status**: ${st.current_status}  \n`;
          }

          const ups = updatesByTeam.get(t.id) || [];
          if (ups.length) {
            md += `- **Latest Updates**:  \n`;
            for (const u of ups.slice(0, 3)) {
              const date = u.created_at ? new Date(u.created_at).toLocaleDateString() : '';
              md += `  - ${u.content}${date ? ` (${date})` : ''}  \n`;
            }
          }

          const ob = onboardingByTeam.get(t.id);
          const highlights = [] as string[];
          if (ob && ob.project_domain) highlights.push(`Domain: ${ob.project_domain}`);
          if (ob && ob.goals && ob.goals.length) highlights.push(`Goals: ${ob.goals.slice(0,2).join(', ')}`);
          if (ob && ob.current_challenges && ob.current_challenges.length) highlights.push(`Challenges: ${ob.current_challenges.slice(0,2).join(', ')}`);
          if (ob && ob.tech_stack && ob.tech_stack.length) highlights.push(`Tech: ${ob.tech_stack.slice(0,3).join(', ')}`);
          if (highlights.length) {
            md += `- **Onboarding**: ${highlights.join(' | ')}  \n`;
          }

          md += `\n`;
        }
      } else {
        md = 'No teams found in PieFi.';
      }

      return await logAndReturn(md, teams.length);
    }

    // MENTORS
    if (mentorsIntent) {
      const [profilesRes, mentorsRes, teamsRes] = await Promise.all([
        supabase.from('mentor_profiles').select('member_id, skills, industries, strengths, updated_at'),
        supabase.from('members').select('id, name, role, team_id').eq('role', 'mentor'),
        supabase.from('teams').select('id, name')
      ]);

      const profiles = profilesRes.data || [];
      const mentors = mentorsRes.data || [];
      const teamMap = new Map((teamsRes.data || []).map((t: any) => [t.id, t.name]));
      const profMap = new Map(profiles.map((p: any) => [p.member_id, p]));

      if (!mentors.length) {
        return await logAndReturn('No mentors found in PieFi.', 0);
      }

      let md = '';
      for (const m of mentors) {
        const p = profMap.get(m.id) || {};
        md += `**${m.name}**  \n`;
        if (p.skills && p.skills.length) md += `- **Skills**: ${p.skills.slice(0,6).join(', ')}  \n`;
        if (p.industries && p.industries.length) md += `- **Industries**: ${p.industries.slice(0,4).join(', ')}  \n`;
        if (p.strengths) md += `- **Strengths**: ${p.strengths}  \n`;
        if (m.team_id) md += `- **Team**: ${teamMap.get(m.team_id) || 'Unassigned'}  \n`;
        md += `\n`;
      }

      return await logAndReturn(md, mentors.length);
    }

    // LEADS
    if (leadsIntent) {
      const [leadsRes, teamsRes] = await Promise.all([
        supabase.from('members').select('id, name, team_id, role').eq('role', 'lead'),
        supabase.from('teams').select('id, name, stage')
      ]);

      const leads = leadsRes.data || [];
      const teamMap = new Map((teamsRes.data || []).map((t: any) => [t.id, t]));

      if (!leads.length) {
        return await logAndReturn('No leads found in PieFi.', 0);
      }

      let md = '';
      for (const l of leads) {
        const team = l.team_id ? teamMap.get(l.team_id) : null;
        md += `**${l.name}**  \n`;
        if (team) md += `- **Team**: ${team.name} (${team.stage})  \n`;
        md += `\n`;
      }

      return await logAndReturn(md, leads.length);
    }

    // MEMBERS (all non-mentor/lead members)
    if (membersIntent) {
      const [membersRes, teamsRes] = await Promise.all([
        supabase.from('members').select('id, name, role, team_id').order('created_at', { ascending: false }),
        supabase.from('teams').select('id, name')
      ]);

      const members = membersRes.data || [];
      const teamMap = new Map((teamsRes.data || []).map((t: any) => [t.id, t.name]));

      if (!members.length) {
        return await logAndReturn('No members found in PieFi.', 0);
      }

      // Group by team
      const grouped = new Map<string, any[]>();
      for (const m of members) {
        const key = m.team_id ? teamMap.get(m.team_id) || 'Unassigned' : 'Unassigned';
        const arr = grouped.get(key) || [];
        arr.push(m);
        grouped.set(key, arr);
      }

      let md = '';
      for (const [teamName, arr] of grouped.entries()) {
        md += `**${teamName}**  \n`;
        // Role breakdown
        const byRole = arr.reduce((acc: any, x: any) => { acc[x.role] = (acc[x.role] || 0) + 1; return acc; }, {});
        md += `- **Roles**: ${Object.entries(byRole).map(([r,c]) => `${r}: ${c}`).join(', ')}  \n`;
        md += `- **Members**:  \n`;
        for (const m of arr) {
          md += `  - ${m.name} (${m.role})  \n`;
        }
        md += `\n`;
      }

      return await logAndReturn(md, members.length);
    }

    // PROGRESS / STAGE / MILESTONES (program view)
    if (progressIntent) {
      const [teamsRes, statusRes, updatesRes] = await Promise.all([
        supabase.from('teams').select('id, name, stage').order('created_at', { ascending: false }),
        supabase.from('team_status').select('team_id, current_status, last_update, updated_at').order('updated_at', { ascending: false }),
        supabase.from('updates').select('team_id, created_at').order('created_at', { ascending: false })
      ]);

      const teams = teamsRes.data || [];
      const statuses = statusRes.data || [];
      const updates = updatesRes.data || [];

      const latestStatusByTeam = new Map();
      for (const s of statuses) if (!latestStatusByTeam.has(s.team_id)) latestStatusByTeam.set(s.team_id, s);

      const updatesCountByTeam = new Map<string, number>();
      for (const u of updates) updatesCountByTeam.set(u.team_id, (updatesCountByTeam.get(u.team_id) || 0) + 1);

      let md = '';
      if (teams.length) {
        for (const t of teams) {
          const st = latestStatusByTeam.get(t.id);
          const count = updatesCountByTeam.get(t.id) || 0;
          md += `**${t.name}**  \n`;
          md += `- **Stage**: ${t.stage || 'n/a'}  \n`;
          if (st && st.current_status) md += `- **Last Status**: ${st.current_status}  \n`;
          md += `- **Updates Logged**: ${count}  \n`;
          md += `\n`;
        }
      } else {
        md = 'No progress data found for PieFi teams.';
      }

      return await logAndReturn(md, teams.length);
    }

    // Generate query embedding
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Fetch relevant documents and context
    let contextString = '';
    let sourcesCount = 0;
    let recommendedMentors: any[] = [];

    // Get team-specific context if available + onboarding + mentor matching
    const cosineSim = (a: number[], b: number[]) => {
      if (!a || !b || a.length !== b.length) return -1;
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
      return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
    };

    let onboardingVec: number[] | null = null;

    if (teamId) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*, updates(*)')
        .eq('id', teamId)
        .single();
      
      if (teamData) {
        contextString += `Team: ${teamData.name} (${teamData.stage})\n`;
        contextString += `Recent updates: ${teamData.updates?.slice(0, 5).map((u: any) => u.content).join(', ')}\n`;
      }

      // Fetch latest builder onboarding
      const { data: onboarding } = await supabase
        .from('builder_onboarding')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (onboarding) {
        const onboardingText = [
          onboarding.project_domain,
          ...(onboarding.current_challenges || []),
          ...(onboarding.goals || []),
          ...(onboarding.tech_stack || []),
          onboarding.notes || ''
        ].filter(Boolean).join(' | ');

        if (onboarding.embedding) {
          onboardingVec = onboarding.embedding as unknown as number[];
        } else if (onboardingText) {
          // Compute embedding on the fly and persist
          try {
            const obResp = await fetch('https://api.openai.com/v1/embeddings', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: 'text-embedding-3-small', input: onboardingText })
            });
            const obData = await obResp.json();
            onboardingVec = obData.data?.[0]?.embedding || null;
            if (onboardingVec) {
              await supabase.from('builder_onboarding').update({ embedding: onboardingVec }).eq('id', onboarding.id);
            }
          } catch (_) { /* ignore */ }
        }

        if (onboardingText) {
          contextString += `Onboarding: ${onboardingText}\n`;
        }
      }

      // Mentor matching via vector similarity (client-side cosine)
      try {
        const { data: mentorProfiles } = await supabase
          .from('mentor_profiles')
          .select('*')
          .not('embedding', 'is', null);

        if (mentorProfiles && mentorProfiles.length) {
          const memberIds = mentorProfiles.map((m: any) => m.member_id);
          const { data: memberRows } = await supabase
            .from('members')
            .select('id, name, role')
            .in('id', memberIds);
          const memberMap = new Map((memberRows || []).map((m: any) => [m.id, m]));

          const baseVec: number[] = onboardingVec
            ? queryEmbedding.map((v: number, i: number) => (v + onboardingVec![i]) / 2)
            : queryEmbedding;

          const scored = mentorProfiles
            .map((mp: any) => {
              const sim = cosineSim(baseVec, mp.embedding as unknown as number[]);
              const member = memberMap.get(mp.member_id);
              return { mp, member, sim };
            })
            .filter((r: any) => r.sim > 0 && r.member && r.member.role === 'mentor')
            .sort((a: any, b: any) => b.sim - a.sim)
            .slice(0, 5);

          recommendedMentors = scored.map((r: any) => ({
            member_id: r.mp.member_id,
            name: r.member.name,
            skills: r.mp.skills,
            industries: r.mp.industries,
            strengths: r.mp.strengths,
            similarity: Number(r.sim.toFixed(4))
          }));

          if (recommendedMentors.length) {
            contextString += `Recommended mentors: ${recommendedMentors.map(m => `${m.name} (${(m.skills||[]).slice(0,3).join('/')})`).join(', ')}\n`;
            sourcesCount += recommendedMentors.length;
          }
        }
      } catch (err) {
        console.error('Mentor matching failed:', err);
      }
    }

    // Get recent updates - filter by team if teamId provided
    let updatesQuery = supabase
      .from('updates')
      .select('*, teams(*)')
      .order('created_at', { ascending: false });
    
    if (teamId) {
      // If in team dashboard, only show team-specific updates
      updatesQuery = updatesQuery.eq('team_id', teamId);
    }
    
    const { data: recentUpdates } = await updatesQuery.limit(10);

    if (recentUpdates) {
      if (teamId) {
        contextString += `Your team's recent updates: ${recentUpdates.map((u: any) => u.content).join(', ')}\n`;
      } else {
        contextString += `Recent program updates: ${recentUpdates.map((u: any) => `${u.teams?.name}: ${u.content}`).join(', ')}\n`;
      }
      sourcesCount += recentUpdates.length;
    }

    // Role-specific system prompts
    const systemPrompts = {
      builder: `You are the Oracle for PieFi builders. Execute commands and answer strictly to the user's topic.

Formatting:
- Use clean Markdown (no headings).
- Prefer bold labels and short bullet lists.
- Insert blank lines between sections for readability.
- If the question mentions "team" or "teams", focus only on team information (names, stages, recent updates, relevant matches).
- Never output templates or greetings—answer directly.
- Use only PieFi data/context; avoid generic suggestions unless asked.`,
      mentor: `You are the Oracle for PieFi mentors. Be analytical and strategic; answer strictly to the user's topic.

Formatting:
- Use clean Markdown (no headings).
- Bold labels and short bullet lists.
- Blank lines between sections.
- If the question is about teams, list only the relevant teams with key facts.
- No templates or greetings—be direct.
- Use only PieFi data/context.`,
      lead: `You are the Oracle for PieFi program leaders. Be comprehensive and strategic; answer strictly to the user's topic.

Formatting:
- Clean Markdown (no headings).
- Bold labels, short bullet lists, blank lines between sections.
- If asked about teams, summarize only the relevant teams with key metrics.
- No templates or greetings; be direct.
- Use only PieFi data/context.`,
      guest: `You are the Oracle for PieFi guests. Be clear and specific to the user's topic.

Formatting:
- Clean Markdown (no headings).
- Bold labels, short bullet lists, blank lines between sections.
- Answer directly with PieFi-specific information; avoid templates/greetings.`,
    };

    // Build enhanced context
    let enhancedContext = contextString;
    if (commandExecuted && commandResult) {
      enhancedContext += `\nCommand executed: ${commandType}\nResult: ${JSON.stringify(commandResult)}\n`;
    }

    // Call OpenAI for enhanced response
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompts[role] || systemPrompts.guest
          },
          {
            role: 'user',
            content: `Context: ${enhancedContext}\n\nQuery: ${query}\n\nReturn a focused answer using clean Markdown (no # headers). Use bold labels, short bullet lists, and blank lines between sections. If the query is about teams, list only the relevant teams (name, stage, recent updates, recommended mentors). Do not include templates or greetings.`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const completionData = await completion.json();
    let answer = completionData.choices?.[0]?.message?.content || 'No response generated';

    // Light cleanup - only remove hashtags, keep markdown formatting
    answer = answer.replace(/#{1,6}\s*/g, ''); // Remove markdown headers
    answer = answer.trim();

    // Parse structured sections if present
    const sections: any = {};
    
    // Look for update section
    const updateMatch = answer.match(/UPDATE:\s*(.*?)(?=\n(?:PROGRESS|EVENT|$))/s);
    if (updateMatch) {
      sections.update = updateMatch[1].trim();
      answer = answer.replace(/UPDATE:\s*.*?(?=\n(?:PROGRESS|EVENT|$))/s, '').trim();
    }

    // Look for progress section
    const progressMatch = answer.match(/PROGRESS:\s*(.*?)(?=\n(?:UPDATE|EVENT|$))/s);
    if (progressMatch) {
      sections.progress = progressMatch[1].trim();
      answer = answer.replace(/PROGRESS:\s*.*?(?=\n(?:UPDATE|EVENT|$))/s, '').trim();
    }

    // Look for event section
    const eventMatch = answer.match(/EVENT:\s*(.*?)(?=\n(?:UPDATE|PROGRESS|$))/s);
    if (eventMatch) {
      sections.event = eventMatch[1].trim();
      answer = answer.replace(/EVENT:\s*.*?(?=\n(?:UPDATE|PROGRESS|$))/s, '').trim();
    }

    const processingTime = Date.now() - startTime;

    // Log the interaction
    try {
      await supabase.from('oracle_logs').insert({
        query,
        response: answer,
        user_role: role,
        user_id: userId,
        team_id: teamId,
        sources_count: sourcesCount,
        processing_time_ms: processingTime
      });
    } catch (logError) {
      console.error('Failed to log interaction:', logError);
    }

    // Store as new document for future RAG (with embedding)
    try {
      const docContent = `Q: ${query}\nA: ${answer}`;
      let docEmbedding: number[] | null = null;
      try {
        const emb = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'text-embedding-3-small', input: docContent })
        });
        const embData = await emb.json();
        docEmbedding = embData.data?.[0]?.embedding || null;
      } catch (_) { /* ignore */ }

      await supabase.from('documents').insert({
        content: docContent,
        metadata: { role, teamId, userId, generated: true },
        role_visibility: [role],
        source_type: 'oracle_qa',
        source_reference: userId || 'anonymous',
        embedding: docEmbedding
      });
    } catch (docError) {
      console.error('Failed to store document:', docError);
    }

    const response = {
      answer,
      sources: sourcesCount,
      context_used: Boolean(contextString),
      sections: Object.keys(sections).length > 0 ? sections : undefined,
      recommendations: recommendedMentors.length ? { mentors: recommendedMentors } : undefined,
      processing_time: processingTime
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced-oracle function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});