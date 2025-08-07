import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JourneyRequest {
  teamId: string;
  text: string;
  role?: 'builder' | 'mentor' | 'lead' | 'guest';
  userId?: string;
}

interface JourneyResponse {
  detected_stage: 'ideation' | 'development' | 'testing' | 'launch' | 'growth';
  feedback: string;
  summary: string;
  suggested_actions: string[];
  updated_stage: boolean;
  created_update_id?: string;
}

function normalizeStage(input: string): JourneyResponse['detected_stage'] {
  const s = (input || '').toLowerCase().replace(/[^a-z_\- ]/g, '').trim();
  if (/(ideation|idea|discovery|spark)/.test(s)) return 'ideation';
  if (/(development|dev|build|first_build|prototype)/.test(s)) return 'development';
  if (/(test|testing|validation|user\s*testing|prototype_validation)/.test(s)) return 'testing';
  if (/(launch|ship|release|go\s*live)/.test(s)) return 'launch';
  if (/(growth|scale|traction)/.test(s)) return 'growth';
  // default fallback
  return 'development';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teamId, text, role = 'builder', userId }: JourneyRequest = await req.json();
    if (!teamId || !text) {
      return new Response(JSON.stringify({ error: 'Missing teamId or text' }), {
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

    // Fetch team + recent updates for lightweight RAG context
    const [{ data: team }, { data: updates } , { data: docs }] = await Promise.all([
      supabase.from('teams').select('id, name, stage, description, tags, assigned_mentor_id').eq('id', teamId).maybeSingle(),
      supabase.from('updates').select('id, content, type, created_at').eq('team_id', teamId).order('created_at', { ascending: false }).limit(8),
      supabase.from('documents')
        .select('content, metadata, source_type')
        .contains('role_visibility', [role])
        .textSearch('content', (text || '').replace(/ /g, ' | '), { type: 'websearch', config: 'english' })
        .limit(3)
    ]);

    let context = '';
    if (team) {
      context += `Team: ${team.name}\n`;
      context += `Stage: ${team.stage}\n`;
      if (team.description) context += `Description: ${team.description}\n`;
      if (team.tags && team.tags.length) context += `Tags: ${team.tags.join(', ')}\n`;
    }
    if (updates && updates.length) {
      context += `\nRecent updates (newest first):\n`;
      updates.forEach((u) => { context += `- [${u.type}] ${u.content}\n`; });
    }
    if (docs && docs.length) {
      context += `\nRelevant knowledge base:\n`;
      docs.forEach((d, i) => { context += `${i+1}. ${d.content}\n`; });
    }

    const systemPrompt = `You are the PieFi Journey Assistant. Analyze builders' progress notes using this context and classify the team stage from this enum only: ideation | development | testing | launch | growth. \nReturn STRICT JSON with keys: detected_stage, feedback (markdown with 3-6 concise bullets), summary (1 sentence), suggested_actions (3-5 short items). Do not include explanations outside JSON.`;

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Context:\n${context}\n\nUser progress note:\n${text}\n\nRespond with JSON only.` }
        ]
      })
    });

    if (!completion.ok) {
      const err = await completion.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const compJson = await completion.json();
    let raw = compJson.choices?.[0]?.message?.content?.trim() || '';
    raw = raw.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();

    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch (_) { parsed = {}; }

    const detected = normalizeStage(parsed.detected_stage || '');
    const feedback: string = parsed.feedback || '- Keep going.';
    const summary: string = parsed.summary || 'Progress updated.';
    const suggested_actions: string[] = Array.isArray(parsed.suggested_actions) ? parsed.suggested_actions.slice(0,5) : [];

    // 1) Insert the user's update
    let createdUpdateId: string | undefined = undefined;
    try {
      const insertRes = await supabase
        .from('updates')
        .insert({ team_id: teamId, content: text, type: 'daily', created_by: userId || 'journey-assistant' })
        .select('id')
        .single();
      createdUpdateId = insertRes.data?.id;
    } catch (_) {}

    // 2) Update team stage if changed
    let updatedStage = false;
    try {
      if (team && team.stage !== detected) {
        const { error } = await supabase.from('teams').update({ stage: detected }).eq('id', teamId);
        if (!error) updatedStage = true;
      }
    } catch (_) {}

    // 3) Upsert team_status with summary and actions
    try {
      await supabase
        .from('team_status')
        .upsert({
          team_id: teamId,
          current_status: summary.slice(0, 250),
          last_update: new Date().toISOString(),
          pending_actions: suggested_actions as any
        });
    } catch (_) {}

    // 4) Log to oracle_logs for global Oracle sync
    try {
      await supabase.from('oracle_logs').insert({
        query: text,
        response: feedback,
        user_role: role,
        user_id: userId || 'journey-assistant',
        team_id: teamId,
        sources_count: (docs?.length || 0) + (updates?.length || 0),
        processing_time_ms: 0
      });
    } catch (_) {}

    const response: JourneyResponse = {
      detected_stage: detected,
      feedback,
      summary,
      suggested_actions,
      updated_stage: updatedStage,
      created_update_id: createdUpdateId,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('journey-assistant error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
