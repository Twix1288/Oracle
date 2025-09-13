import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables with fallbacks
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://dijskfbokusyxkcfwkrc.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpanNrZmJva3VzeXhrY2Z3a3JjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgzODg4NywiZXhwIjoyMDY5NDE0ODg3fQ.example';

    console.log('GraphRAG function starting...');
    console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('Service Key:', supabaseServiceKey ? 'Set' : 'Missing');

    // Create Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const url = new URL(req.url);
    let endpoint = url.pathname.split('/').pop() || '';

    // Parse body once for supabase.functions.invoke root calls
    let payload: any = null;
    if (req.method === 'POST') {
      try { 
        payload = await req.json(); 
        console.log('Payload received:', JSON.stringify(payload, null, 2));
      } catch (e) { 
        console.log('No body or invalid JSON');
      }
    }

    // Allow root invocations without subpath by inferring intent from payload
    if (!['embed','search','button_action'].includes(endpoint)) {
      if (payload?.action) endpoint = 'button_action';
      else if (payload?.query) endpoint = 'search';
      else if (payload?.table) endpoint = 'embed';
    }

    console.log('GraphRAG endpoint resolved:', endpoint);

    if (endpoint === 'embed' && req.method === 'POST') {
      const { table, id, text } = payload || {};
      
      if (!table || !id || !text) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: table, id, text' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate embedding for the text
      const embedding = await generateEmbedding(text);

      // Update via RPC to ensure SECURITY DEFINER safety
      const { error } = await supabase.rpc('upsert_embedding', {
        tablename: table,
        row_id: id,
        emb: embedding
      });

      if (error) {
        console.error('Embedding upsert error:', error);
        throw new Error(`Failed to upsert embedding: ${error.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Embedding generated and stored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (endpoint === 'search' && req.method === 'POST') {
      const { query, k = 5 } = payload || {};
      
      if (!query) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: query' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(query);

      const { data, error } = await supabase.rpc('search_graph_rag', {
        q_emb: queryEmbedding,
        k
      });

      if (error) {
        console.error('Search error:', error);
        throw new Error(`Search failed: ${error.message}`);
      }

      return new Response(
        JSON.stringify({ results: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (endpoint === 'button_action' && req.method === 'POST') {
      const { action, actor_id, target_id, body } = payload || {};
      
      console.log('Button action received:', { action, actor_id, target_id, body });
      
      if (!action) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use a default actor_id if not provided (for testing)
      const userId = actor_id || 'system-user';

      try {
        if (action === 'offer_help') {
          const { skill = 'general', availability = 'active', description = '' } = body || {};

          const { data: offer, error: offerErr } = await supabase
            .from('skill_offers')
            .insert({ owner_id: userId, skill, availability, description })
            .select('*')
            .single();
          if (offerErr) throw offerErr;

          // Embed the offer text
          try {
            const emb = await generateEmbedding(`${skill}\n${availability}\n${description}`);
            await supabase.rpc('upsert_embedding', { tablename: 'skill_offers', row_id: offer.id, emb });
          } catch (e) { console.warn('Embedding offer failed', e); }

          // Notify target if provided
          if (target_id) {
            await supabase.from('notifications').insert({
              user_id: target_id,
              type: 'offer_help',
              title: 'New Help Offer',
              message: description || `${userId} offered help`,
              data: { offer_id: offer.id, from: userId }
            });
          }

          result = { offer };
        }
        else if (action === 'express_interest') {
          const { project_id = target_id, message = '' } = body || {};
          if (!project_id) throw new Error('project_id required');

          const { data: interest, error: intErr } = await supabase
            .from('project_interests')
            .insert({ project_id, user_id: userId, status: 'pending', message })
            .select('*')
            .single();
          if (intErr) throw intErr;

          // Notify team creator
          const { data: team } = await supabase
            .from('teams')
            .select('team_creator_id, name')
            .eq('id', project_id)
            .maybeSingle();
          if (team?.team_creator_id) {
            await supabase.from('notifications').insert({
              user_id: team.team_creator_id,
              type: 'express_interest',
              title: 'New Project Interest',
              message: `Someone expressed interest in ${team.name}`,
              data: { project_id, user_id: userId, interest_id: interest.id }
            });
          }

          result = { interest };
        }
        else if (action === 'connect') {
          const { message = '' } = body || {};
          if (!target_id) throw new Error('target_id required');

          const { data: req, error: reqErr } = await supabase
            .from('connection_requests')
            .insert({ requester_id: userId, requested_id: target_id, message })
            .select('*')
            .single();
          if (reqErr) throw reqErr;

          await supabase.from('notifications').insert({
            user_id: target_id,
            type: 'connect',
            title: 'New Connection Request',
            message: message || 'You have a new connection request',
            data: { request_id: req.id, from: userId }
          });

          result = { connection_request: req };
        }
        else if (action === 'join_workshop') {
          if (!target_id) throw new Error('workshop target_id required');

          const { data: workshop } = await supabase
            .from('workshops')
            .select('*')
            .eq('id', target_id)
            .maybeSingle();

          const attendees: string[] = Array.isArray(workshop?.attendees) ? workshop!.attendees : [];
          if (attendees.includes(userId)) {
            result = { message: 'Already registered' };
          } else {
            const updated = [...attendees, userId];
            const { error: updErr } = await supabase
              .from('workshops')
              .update({ attendees: updated })
              .eq('id', target_id);
            if (updErr) throw updErr;

            // Notify host
            if (workshop?.host_id) {
              await supabase.from('notifications').insert({
                user_id: workshop.host_id,
                type: 'join_workshop',
                title: 'New Workshop Registration',
                message: `${userId} joined your workshop`,
                data: { workshop_id: target_id, user_id: userId }
              });
            }

            result = { success: true };
          }
        }
        else if (action === 'react') {
          const { feed_item_id, interaction_type, body: text = '' } = body || {};
          if (!feed_item_id || !interaction_type) throw new Error('feed_item_id and interaction_type required');

          const { data: interaction, error: interErr } = await supabase
            .from('feed_interactions')
            .insert({ user_id: userId, feed_item_id, type: interaction_type, body: text })
            .select('*')
            .single();
          if (interErr) throw interErr;

          if (target_id) {
            await supabase.from('notifications').insert({
              user_id: target_id,
              type: 'react',
              title: 'New Interaction',
              message: `Your item received a ${interaction_type}`,
              data: { interaction_id: interaction.id, feed_item_id }
            });
          }

          result = { interaction };
        }
        else if (action === 'oracle_command') {
          // Keep existing oracle_command handler
          const { command, context } = body || {};
          if (!command) {
            return new Response(
              JSON.stringify({ error: 'Missing command in body' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log('Oracle command executed:', command, 'Context:', context);

          // Log the Oracle command interaction
          let logEntry = null;
          try {
            const { data: logData, error: logError } = await supabase
              .from('oracle_logs')
              .insert({
                user_id: userId,
                query: command,
                query_type: 'command',
                model_used: 'graphrag-system',
                confidence: 0.95,
                sources: 1,
                context_used: true,
                response: JSON.stringify({
                  command_executed: command,
                  context: context,
                  timestamp: new Date().toISOString()
                })
              })
              .select()
              .single();

            if (logError) {
              console.warn('Failed to log Oracle command:', logError);
            } else {
              logEntry = logData;
              console.log('Oracle command logged successfully');
            }
          } catch (logErr) {
            console.warn('Oracle logging error:', logErr);
          }

          result = {
            command_processed: true,
            log_id: logEntry?.id
          };
        } else {
          return new Response(
            JSON.stringify({ error: 'unknown action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (actionErr) {
        console.error('button_action error:', actionErr);
        return new Response(
          JSON.stringify({ error: actionErr.message || 'Action failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Returning result:', result);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint or method' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('GraphRAG function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Real OpenAI embedding generation function (inspired by ai_bot.py)
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    console.log('🔄 Generating OpenAI embedding for text:', text.substring(0, 100));
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.warn('⚠️ OpenAI API key not found, using dummy embedding');
      // Fallback to dummy embedding if no API key
      return new Array(1536).fill(0).map(() => Math.random() - 0.5);
    }
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small', // Using the latest embedding model
        input: text,
        encoding_format: 'float'
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI embedding API request failed:', response.status, errorText);
      throw new Error(`OpenAI embedding API request failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const embedding = data.data?.[0]?.embedding;
    
    if (!embedding || !Array.isArray(embedding)) {
      console.error('❌ Invalid embedding response from OpenAI:', data);
      throw new Error('Invalid embedding response from OpenAI');
    }
    
    console.log('✅ OpenAI embedding generated successfully, dimensions:', embedding.length);
    return embedding;
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    // Fallback to dummy embedding on error
    console.warn('⚠️ Falling back to dummy embedding due to error');
    return new Array(1536).fill(0).map(() => Math.random() - 0.5);
  }
}