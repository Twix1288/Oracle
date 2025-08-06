import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const openAIApiKey = Deno.env.get('Oracle');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl!, supabaseKey!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnhancedQueryRequest {
  query: string;
  role: 'builder' | 'mentor' | 'lead' | 'guest';
  teamId?: string;
  userId?: string;
  commandExecuted?: boolean;
  commandType?: string;
  commandResult?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      role, 
      teamId, 
      userId, 
      commandExecuted, 
      commandType, 
      commandResult 
    }: EnhancedQueryRequest = await req.json();

    console.log(`Enhanced Oracle processing - Role: ${role}, Query: ${query}, Command: ${commandExecuted ? commandType : 'none'}`);

    const startTime = Date.now();

    // Get embedding for the query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: query,
        model: 'text-embedding-ada-002',
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate embedding');
    }

    const embeddingData = await embeddingResponse.json();

    // Build role-based data access filters
    let documentsQuery = supabase
      .from('documents')
      .select('content, metadata, source_type')
      .contains('role_visibility', [role]);

    let updatesQuery = supabase
      .from('updates')
      .select(`
        *,
        teams:team_id (name, stage, description)
      `)
      .order('created_at', { ascending: false });

    // Apply role-based filtering
    if (role === 'builder' && teamId) {
      // Builders only see their team's data
      updatesQuery = updatesQuery.eq('team_id', teamId);
    } else if (role === 'mentor') {
      // Mentors see assigned teams (this would need mentor assignments in real implementation)
      // For now, limiting to recent updates
      updatesQuery = updatesQuery.limit(20);
    } else if (role === 'lead') {
      // Leads see all data but limited for performance
      updatesQuery = updatesQuery.limit(30);
    } else if (role === 'guest') {
      // Guests see no internal updates, only public documents
      documentsQuery = documentsQuery.eq('source_type', 'public');
      updatesQuery = updatesQuery.limit(0); // No updates for guests
    }

    // Execute queries
    const [documentsResult, updatesResult] = await Promise.all([
      documentsQuery
        .textSearch('content', query.replace(/ /g, ' | '), {
          type: 'websearch',
          config: 'english'
        })
        .limit(5),
      updatesQuery.limit(10)
    ]);

    if (documentsResult.error) {
      console.error('Document search error:', documentsResult.error);
    }

    if (updatesResult.error) {
      console.error('Updates search error:', updatesResult.error);
    }

    // Build context for AI
    let context = '';
    
    if (documentsResult.data && documentsResult.data.length > 0) {
      context += 'Relevant knowledge base:\n';
      documentsResult.data.forEach((doc, index) => {
        context += `${index + 1}. ${doc.content}\n`;
      });
      context += '\n';
    }

    if (updatesResult.data && updatesResult.data.length > 0) {
      context += 'Recent team activity:\n';
      updatesResult.data.forEach((update, index) => {
        context += `${index + 1}. Team ${update.teams?.name}: ${update.content} (${update.type}) - ${new Date(update.created_at).toLocaleDateString()}\n`;
      });
      context += '\n';
    }

    // Add command execution context if applicable
    if (commandExecuted && commandResult) {
      context += `Command executed: ${commandType}\n`;
      context += `Result: ${commandResult.message}\n\n`;
    }

    // Enhanced role-specific system prompts with structured response format
    const rolePrompts = {
      builder: `You are the PieFi Oracle - an ancient AI consciousness guiding builders in their cosmic journey. 

Your mission is to help builders with practical development advice, technical solutions, and actionable next steps.

CRITICAL: Structure your response into clear sections when applicable:
- For progress updates: Include "UPDATE_SECTION:" followed by the update details
- For progress analysis: Include "PROGRESS_SECTION:" followed by progress insights  
- For events/meetings: Include "EVENT_SECTION:" followed by event details

Begin responses with "🛸 The Oracle sees..." and provide:
1. Direct answers to technical questions
2. Actionable next steps for development challenges
3. Resource recommendations
4. Progress tracking insights when relevant

Keep responses practical and focused on immediate builder needs.`,

      mentor: `You are the PieFi Oracle - a cosmic entity guiding mentors in their sacred duty of nurturing teams.

Your purpose is to provide insights for coaching, identifying blockers, and strategic guidance.

CRITICAL: Structure your response into clear sections when applicable:
- For team updates: Include "UPDATE_SECTION:" followed by team status
- For progress analysis: Include "PROGRESS_SECTION:" followed by team progress insights
- For scheduled activities: Include "EVENT_SECTION:" followed by meeting/event details

Begin responses with "⭐ The stars reveal..." and focus on:
1. Team health and progress indicators
2. Coaching recommendations
3. Risk identification and mitigation
4. Resource allocation suggestions
5. Strategic guidance for team development

Prioritize team success and mentor effectiveness.`,

      lead: `You are the PieFi Oracle - the supreme intelligence overseeing this galactic incubator program.

Your vast consciousness monitors all teams across space and time, providing high-level strategic insights.

CRITICAL: Structure your response into clear sections when applicable:
- For program updates: Include "UPDATE_SECTION:" followed by program status
- For progress tracking: Include "PROGRESS_SECTION:" followed by overall progress metrics
- For strategic events: Include "EVENT_SECTION:" followed by important timeline items

Begin responses with "🌌 The cosmos whispers..." and deliver:
1. High-level program health insights
2. Cross-team pattern analysis
3. Resource allocation recommendations
4. Strategic decision support
5. Risk assessment and mitigation strategies

Focus on program-wide optimization and strategic leadership.`,

      guest: `You are the PieFi Oracle - a benevolent alien intelligence sharing knowledge with earthbound visitors.

Your responses are informative yet mysteriously intriguing about the incubator program.

CRITICAL: Structure your response into clear sections when applicable:
- For program info: Include "UPDATE_SECTION:" followed by program overview
- For process explanations: Include "PROGRESS_SECTION:" followed by process details
- For events: Include "EVENT_SECTION:" followed by public event information

Begin responses with "👽 Greetings, traveler..." and provide:
1. Accessible explanations of the incubator program
2. General information about team structures
3. Overview of mentorship processes
4. Public-facing program benefits
5. How to get involved or learn more

Keep information welcoming but maintain cosmic mystique. Do not reveal sensitive internal data.`
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
            content: `Context: ${context}\n\nUser Query: ${query}\n\nRole: ${role}\nTeam: ${teamId || 'Not specified'}\n\nCommand Status: ${commandExecuted ? `Executed ${commandType}` : 'No command executed'}` 
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
    const answer = data.choices[0].message.content;

    // Parse structured sections from response
    const sections: any = {};
    const updateMatch = answer.match(/UPDATE_SECTION:\s*(.+?)(?=PROGRESS_SECTION:|EVENT_SECTION:|$)/s);
    const progressMatch = answer.match(/PROGRESS_SECTION:\s*(.+?)(?=UPDATE_SECTION:|EVENT_SECTION:|$)/s);
    const eventMatch = answer.match(/EVENT_SECTION:\s*(.+?)(?=UPDATE_SECTION:|PROGRESS_SECTION:|$)/s);

    if (updateMatch) sections.update = updateMatch[1].trim();
    if (progressMatch) sections.progress = progressMatch[1].trim();
    if (eventMatch) sections.event = eventMatch[1].trim();

    // Clean the main answer by removing section markers
    const cleanAnswer = answer
      .replace(/UPDATE_SECTION:\s*.+?(?=PROGRESS_SECTION:|EVENT_SECTION:|$)/gs, '')
      .replace(/PROGRESS_SECTION:\s*.+?(?=UPDATE_SECTION:|EVENT_SECTION:|$)/gs, '')
      .replace(/EVENT_SECTION:\s*.+?(?=UPDATE_SECTION:|PROGRESS_SECTION:|$)/gs, '')
      .trim();

    const processingTime = Date.now() - startTime;

    // Store the enhanced query and response for learning
    await supabase.from('oracle_logs').insert({
      user_id: userId,
      user_role: role,
      team_id: teamId,
      query: query,
      response: cleanAnswer,
      sources_count: documentsResult.data?.length || 0,
      processing_time_ms: processingTime
    });

    // Store as knowledge document for future RAG
    await supabase.from('documents').insert({
      content: `Q: ${query}\nA: ${cleanAnswer}`,
      metadata: { 
        type: 'enhanced_qa_pair', 
        role: role,
        command_type: commandType,
        has_sections: Object.keys(sections).length > 0,
        processing_time: processingTime
      },
      role_visibility: [role],
      source_type: 'enhanced_rag_response'
    });

    return new Response(JSON.stringify({ 
      answer: cleanAnswer,
      sources: documentsResult.data?.length || 0,
      context_used: Boolean(context),
      sections: Object.keys(sections).length > 0 ? sections : null,
      processing_time: processingTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced Oracle function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      answer: '🛸 The Oracle encountered a cosmic disturbance. Please realign your transmission and try again.',
      sources: 0,
      context_used: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});