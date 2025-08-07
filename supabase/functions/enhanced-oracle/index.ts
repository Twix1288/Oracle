import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnhancedQueryRequest {
  query: string;
  role: string;
  teamId?: string;
  userId?: string;
  commandExecuted?: boolean;
  commandType?: string;
  commandResult?: any;
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


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, role, teamId, userId, commandExecuted, commandType, commandResult }: EnhancedQueryRequest = await req.json();
    
    if (!query || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('Oracle');
    
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const startTime = Date.now();

    // Check for and execute commands first
    const commandExecutionResult = await executeCommand(query, role, teamId, userId, supabase, openaiKey);
    if (commandExecutionResult.executed) {
      return new Response(
        JSON.stringify({
          answer: commandExecutionResult.message,
          sources: 0,
          context_used: false,
          processing_time: Date.now() - startTime,
          command_executed: true,
          command_type: commandExecutionResult.type,
          command_data: commandExecutionResult.data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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