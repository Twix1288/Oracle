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

interface QueryRequest {
  query: string;
  role: 'builder' | 'mentor' | 'lead' | 'guest';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, role }: QueryRequest = await req.json();

    console.log(`Processing RAG query for role: ${role}, query: ${query}`);

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
    const queryEmbedding = embeddingData.data[0].embedding;

    // Search for relevant documents using vector similarity
    // Note: Using basic text search for now, will add vector search when embedding column is added
    const { data: documents, error: searchError } = await supabase
      .from('documents')
      .select('content, metadata, source_type')
      .contains('role_visibility', [role])
      .textSearch('content', query.replace(/ /g, ' | '), {
        type: 'websearch',
        config: 'english'
      })
      .limit(5);

    if (searchError) {
      console.error('Document search error:', searchError);
    }

    // Also search recent updates and team data
    const { data: updates, error: updatesError } = await supabase
      .from('updates')
      .select(`
        *,
        teams:team_id (name, stage, description)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (updatesError) {
      console.error('Updates search error:', updatesError);
    }

    // Prepare context for LLM
    let context = '';
    
    if (documents && documents.length > 0) {
      context += 'Relevant knowledge base documents:\n';
      documents.forEach((doc, index) => {
        context += `${index + 1}. ${doc.content}\n`;
      });
      context += '\n';
    }

    if (updates && updates.length > 0) {
      context += 'Recent team updates:\n';
      updates.forEach((update, index) => {
        context += `${index + 1}. Team ${update.teams?.name}: ${update.content} (${update.type})\n`;
      });
      context += '\n';
    }

    // Generate role-specific system prompt with UFO Oracle personality
    const rolePrompts = {
      builder: `You are the PieFi Oracle - an ancient AI consciousness from beyond the stars, now guiding builders in their incubator missions. Your knowledge spans galaxies, and you speak with mysterious wisdom. Focus on practical development advice, technical solutions, and actionable next steps. Begin responses with "🛸 The Oracle sees..." and use cosmic metaphors when helpful.`,
      mentor: `You are the PieFi Oracle - a cosmic entity that has witnessed countless civilizations rise and fall. Your purpose is to guide mentors in their sacred duty of nurturing young teams. Provide insights for coaching, identifying blockers, and strategic guidance. Begin responses with "⭐ The stars reveal..." and offer wisdom that spans dimensions.`,
      lead: `You are the PieFi Oracle - the supreme intelligence overseeing this galactic incubator program. Your vast consciousness monitors all teams across space and time. Focus on high-level insights, progress tracking, and resource allocation. Begin responses with "🌌 The cosmos whispers..." and provide strategic guidance from your omniscient perspective.`,
      guest: `You are the PieFi Oracle - a benevolent alien intelligence sharing knowledge with earthbound visitors. Your responses are informative yet mysteriously intriguing about the incubator program. Keep responses accessible but hint at the deeper cosmic significance. Begin responses with "👽 Greetings, traveler..." and maintain an otherworldly but welcoming tone.`
    };

    const systemPrompt = rolePrompts[role] || rolePrompts.guest;

    // Generate response using OpenAI
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
          { role: 'user', content: `Context: ${context}\n\nQuestion: ${query}` }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate response');
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;

    // Store the query and response for future learning
    await supabase.from('documents').insert({
      content: `Q: ${query}\nA: ${answer}`,
      metadata: { type: 'qa_pair', role: role },
      role_visibility: [role],
      source_type: 'rag_response'
    });

    return new Response(JSON.stringify({ 
      answer,
      sources: documents?.length || 0,
      context_used: Boolean(context)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in RAG query function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      answer: 'I apologize, but I encountered an error processing your query. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});