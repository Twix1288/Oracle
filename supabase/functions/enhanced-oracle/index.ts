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

    // Get team-specific context if available
    if (teamId) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*, updates(*)')
        .eq('id', teamId)
        .single();
      
      if (teamData) {
        contextString += `Team: ${teamData.name} (${teamData.stage})\n`;
        contextString += `Recent updates: ${teamData.updates?.slice(0, 5).map(u => u.content).join(', ')}\n`;
      }
    }

    // Get recent updates for role-based context
    const { data: recentUpdates } = await supabase
      .from('updates')
      .select('*, teams(*)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentUpdates) {
      contextString += `Recent program updates: ${recentUpdates.map(u => `${u.teams?.name}: ${u.content}`).join(', ')}\n`;
      sourcesCount += recentUpdates.length;
    }

    // Role-specific system prompts
    const systemPrompts = {
      builder: `You are the Oracle, an AI assistant for startup incubator participants. You help builders track progress, get guidance, and stay motivated. Be supportive and practical. Focus on actionable advice and team collaboration. Keep responses professional and concise without hashtags or excessive formatting.`,
      mentor: `You are the Oracle, an AI assistant for startup incubator mentors. You help track team progress, identify issues, and guide mentorship decisions. Be analytical and strategic. Focus on team development and progress insights. Keep responses professional and concise without hashtags or excessive formatting.`,
      lead: `You are the Oracle, an AI assistant for incubator program leaders. You help manage the overall program, track multiple teams, and make strategic decisions. Be comprehensive and strategic. Focus on program health and team performance. Keep responses professional and concise without hashtags or excessive formatting.`,
      guest: `You are the Oracle, providing general information about the startup incubator program. Be welcoming and informative about the program structure and benefits. Keep responses professional and concise without hashtags or excessive formatting.`
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
            content: `Context: ${enhancedContext}\n\nQuery: ${query}\n\nPlease provide a clear, professional response without hashtags, asterisks, or excessive formatting. Be direct and helpful.`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const completionData = await completion.json();
    let answer = completionData.choices?.[0]?.message?.content || 'No response generated';

    // Clean up response - remove hashtags and excessive formatting
    answer = answer.replace(/#{1,6}\s*/g, ''); // Remove markdown headers
    answer = answer.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold formatting
    answer = answer.replace(/\*(.*?)\*/g, '$1'); // Remove italic formatting
    answer = answer.replace(/```[\s\S]*?```/g, ''); // Remove code blocks
    answer = answer.replace(/`([^`]+)`/g, '$1'); // Remove inline code
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

    // Store as new document for future RAG
    try {
      await supabase.from('documents').insert({
        content: `Q: ${query}\nA: ${answer}`,
        metadata: { role, teamId, userId, generated: true },
        role_visibility: [role],
        source_type: 'oracle_qa',
        source_reference: userId || 'anonymous'
      });
    } catch (docError) {
      console.error('Failed to store document:', docError);
    }

    const response = {
      answer,
      sources: sourcesCount,
      context_used: Boolean(contextString),
      sections: Object.keys(sections).length > 0 ? sections : undefined,
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