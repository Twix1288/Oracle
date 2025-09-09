import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OracleRequest {
  actor_id: string;
  project: {
    id: string;
    title: string;
    description: string;
  };
  k?: number;
}

interface OracleSuggestion {
  type: 'person' | 'resource' | 'process';
  id: string | null;
  name: string | null;
  role_or_skill: string;
  confidence: number;
  reason_evidence_lines: number[];
  one_sentence_rationale: string;
}

interface OracleAction {
  who_to_contact_id: string | null;
  who_to_contact_name: string | null;
  message: string;
  why: string;
  priority: 'high' | 'medium' | 'low';
}

interface OracleResponse {
  suggestions: OracleSuggestion[];
  actions: OracleAction[];
  meta: {
    used_evidence_count: number;
    timestamp: string;
    explanation?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    const llmModel = Deno.env.get('LLM_MODEL') || 'gpt-4o-mini';

    if (!supabaseUrl || !supabaseServiceKey || !openaiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestBody: OracleRequest = await req.json();
    
    const { actor_id, project, k = 6 } = requestBody;

    if (!actor_id || !project?.id || !project?.description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: actor_id, project.id, project.description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Oracle call for project:', project.title);

    // Step 1: Get semantic evidence via GraphRAG search
    const searchResponse = await fetch(`${supabaseUrl}/functions/v1/graphrag/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: project.description,
        k
      }),
    });

    if (!searchResponse.ok) {
      throw new Error('Failed to get search results from GraphRAG');
    }

    const searchData = await searchResponse.json();
    const evidence = searchData.results || [];

    // Step 2: Get graph neighbors (team members)
    const { data: neighbors, error: neighborsError } = await supabase.rpc('team_neighbors', {
      team_id: project.id
    });

    if (neighborsError) {
      console.error('Error getting team neighbors:', neighborsError);
    }

    const teamMembers = neighbors || [];

    // Step 3: Compose prompt for LLM
    const systemPrompt = "You are Lovable, the Builder Oracle. Use the provided evidence (semantic search hits) and graph neighbors (team members) to produce concise, high-confidence suggestions and concrete next actions. Output only valid JSON that strictly follows the RESPONSE SCHEMA. If unsure, return the best-formed JSON possible and include a meta.explanation field. Be concise.";

    let evidenceText = "";
    evidence.forEach((item: any, index: number) => {
      const snippet = item.snippet?.substring(0, 800) || '';
      evidenceText += `${index + 1}) [${item.src_type}] ${item.title} — ${snippet} (distance: ${item.distance})\n`;
    });

    let neighborsText = "";
    teamMembers.forEach((member: any) => {
      neighborsText += `- ${member.full_name || 'Unknown'} (role: ${member.role || 'unknown'})\n`;
    });

    const userPrompt = `PROJECT:
Title: ${project.title}
Description: ${project.description}

EVIDENCE (semantic search) — numbered:
${evidenceText}

GRAPH NEIGHBORS:
${neighborsText}

CONSTRAINTS:
- Provide up to 3 suggestions and up to 3 next actions.
- For each suggestion referencing a person/resource, include the evidence line numbers.
- Each "action.message" must be <= 120 characters and actionable.

INSTRUCTIONS:
- Provide JSON only. No extraneous commentary.
- Validate types: numbers for confidences (0.0 - 1.0), arrays where expected, timestamps ISO8601.

RESPONSE SCHEMA:
{
  "suggestions": [
    {
      "type": "person" | "resource" | "process",
      "id": "UUID or null",
      "name": "string or null",
      "role_or_skill": "string",
      "confidence": 0.0,
      "reason_evidence_lines": [1,2],
      "one_sentence_rationale": "string"
    }
  ],
  "actions": [
    {
      "who_to_contact_id": "UUID or null",
      "who_to_contact_name": "string or null",
      "message": "<=120 char string",
      "why": "short reason referencing evidence lines",
      "priority": "high|medium|low"
    }
  ],
  "meta": {
    "used_evidence_count": integer,
    "timestamp": "ISO8601 string",
    "explanation": "optional string if any issues"
  }
}`;

    // Step 4: Call LLM with retries
    let llmResponse: any;
    let attemptCount = 0;
    const maxAttempts = 3;

    while (attemptCount < maxAttempts) {
      attemptCount++;
      
      try {
        const llmApiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: llmModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });

        if (!llmApiResponse.ok) {
          const errorText = await llmApiResponse.text();
          throw new Error(`LLM API error: ${errorText}`);
        }

        const llmData = await llmApiResponse.json();
        const content = llmData.choices[0]?.message?.content;
        
        if (!content) {
          throw new Error('No content in LLM response');
        }

        // Try to parse JSON
        try {
          llmResponse = JSON.parse(content);
          break; // Success, exit retry loop
        } catch (parseError) {
          if (attemptCount === maxAttempts) {
            throw new Error(`Failed to parse LLM JSON after ${maxAttempts} attempts: ${content}`);
          }
          
          // Attempt repair by asking LLM to reformat
          const repairPrompt = `The following response is not valid JSON. Please return only valid JSON that follows the schema:\n\n${content}`;
          continue;
        }
      } catch (error) {
        if (attemptCount === maxAttempts) {
          throw error;
        }
        console.log(`LLM attempt ${attemptCount} failed:`, error.message);
      }
    }

    // Step 5: Validate response structure
    const oracleResponse: OracleResponse = {
      suggestions: Array.isArray(llmResponse.suggestions) ? llmResponse.suggestions.slice(0, 3) : [],
      actions: Array.isArray(llmResponse.actions) ? llmResponse.actions.slice(0, 3) : [],
      meta: {
        used_evidence_count: evidence.length,
        timestamp: new Date().toISOString(),
        explanation: llmResponse.meta?.explanation
      }
    };

    // Calculate confidence average
    const confidences = oracleResponse.suggestions.map(s => s.confidence || 0).filter(c => c > 0);
    const avgConfidence = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

    // Calculate mean similarity score
    const distances = evidence.map((e: any) => e.distance || 1).filter((d: number) => d >= 0);
    const meanDistance = distances.length > 0 ? distances.reduce((a: number, b: number) => a + b, 0) / distances.length : 1;

    // Step 6: Store in oracle_logs
    try {
      const { error: logError } = await supabase
        .from('oracle_logs')
        .insert({
          user_id: actor_id,
          team_id: project.id,
          query: project.description,
          response: JSON.stringify(oracleResponse),
          query_type: 'suggest',
          model_used: llmModel,
          confidence: avgConfidence,
          sources: evidence.length,
          context_used: true,
          similarity_score: 1 - meanDistance, // Convert distance to similarity
          graph_nodes: JSON.stringify(teamMembers),
          graph_relationships: JSON.stringify([{ type: 'team_membership', members: teamMembers.length }]),
          command_executed: false,
          helpful: true
        });

      if (logError) {
        console.error('Failed to log oracle interaction:', logError);
      }

      // Generate embedding for the query (optional)
      try {
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: project.description,
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const embedding = embeddingData.data[0].embedding;
          
          // Find the oracle log we just created and update with embedding
          const { data: logs } = await supabase
            .from('oracle_logs')
            .select('id')
            .eq('user_id', actor_id)
            .eq('query', project.description)
            .order('created_at', { ascending: false })
            .limit(1);

          if (logs && logs.length > 0) {
            await supabase.rpc('upsert_embedding', {
              tablename: 'oracle_logs',
              row_id: logs[0].id,
              emb: embedding
            });
          }
        }
      } catch (embeddingError) {
        console.error('Failed to generate/store embedding for oracle log:', embeddingError);
      }
    } catch (error) {
      console.error('Failed to store oracle log:', error);
    }

    return new Response(
      JSON.stringify(oracleResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Oracle call error:', error);
    
    // Log failed attempt if possible
    try {
      const requestBody = await req.json();
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseServiceKey && requestBody.actor_id) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('oracle_logs')
          .insert({
            user_id: requestBody.actor_id,
            team_id: requestBody.project?.id,
            query: requestBody.project?.description || 'Unknown query',
            response: JSON.stringify({ error: error.message }),
            query_type: 'suggest',
            helpful: false,
            sources: 0,
            confidence: 0
          });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});