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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey || !openaiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const url = new URL(req.url);
    let endpoint = url.pathname.split('/').pop() || '';

    // Parse body once for supabase.functions.invoke root calls
    let payload: any = null;
    if (req.method === 'POST') {
      try { payload = await req.json(); } catch (_) { /* no body */ }
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

      // Generate embedding using OpenAI
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });

      if (!embeddingResponse.ok) {
        const error = await embeddingResponse.text();
        console.error('OpenAI API error:', error);
        throw new Error(`OpenAI API error: ${error}`);
      }

      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.data[0].embedding;

      // Store embedding using RPC
      const { error: upsertError } = await supabase.rpc('upsert_embedding', {
        tablename: table,
        row_id: id,
        emb: embedding
      });

      if (upsertError) {
        console.error('Upsert embedding error:', upsertError);
        throw upsertError;
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (endpoint === 'search' && req.method === 'POST') {
      const { query, k = 5 } = await req.json();
      
      if (!query) {
        return new Response(
          JSON.stringify({ error: 'Missing required field: query' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

      if (!embeddingResponse.ok) {
        throw new Error('Failed to generate query embedding');
      }

      const embeddingData = await embeddingResponse.json();
      const queryEmbedding = embeddingData.data[0].embedding;

      // Search using RPC
      const { data: results, error: searchError } = await supabase.rpc('search_graph_rag', {
        q_emb: queryEmbedding,
        k: k
      });

      if (searchError) {
        console.error('Search error:', searchError);
        throw searchError;
      }

      return new Response(
        JSON.stringify({ results: results || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (endpoint === 'button_action' && req.method === 'POST') {
      const { action, actor_id, target_id, body = {} } = await req.json();
      
      if (!action || !actor_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: action, actor_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Button action:', action, 'Actor:', actor_id, 'Target:', target_id);

      let result = {};

      switch (action) {
        case 'offer_help': {
          const { skill, availability, description } = body;
          
          if (!skill) {
            return new Response(
              JSON.stringify({ error: 'Skill is required for offer_help action' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Insert skill offer
          const { data: offer, error: offerError } = await supabase
            .from('skill_offers')
            .insert({
              owner_id: actor_id,
              skill,
              availability,
              description,
              status: 'active'
            })
            .select()
            .single();

          if (offerError) throw offerError;

          // Generate embedding for the skill offer
          const embedText = `${skill} ${availability || ''} ${description || ''}`.trim();
          const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: embedText,
            }),
          });

          if (embeddingResponse.ok) {
            const embeddingData = await embeddingResponse.json();
            const embedding = embeddingData.data[0].embedding;
            
            await supabase.rpc('upsert_embedding', {
              tablename: 'skill_offers',
              row_id: offer.id,
              emb: embedding
            });
          }

          // Create notification if target_id provided
          if (target_id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: target_id,
                type: 'offer_help',
                title: 'Help Offer Received',
                message: `${skill} help is available`,
                data: { offer_id: offer.id, skill }
              });
          }

          result = { offer };
          break;
        }

        case 'express_interest': {
          const { project_id, message } = body;
          const team_id = project_id || target_id;
          
          if (!team_id) {
            return new Response(
              JSON.stringify({ error: 'project_id or target_id is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Insert project interest
          const { data: interest, error: interestError } = await supabase
            .from('project_interests')
            .insert({
              project_id: team_id,
              user_id: actor_id,
              status: 'pending',
              message
            })
            .select()
            .single();

          if (interestError) throw interestError;

          // Get team creator and notify
          const { data: team } = await supabase
            .from('teams')
            .select('team_creator_id, name')
            .eq('id', team_id)
            .single();

          if (team?.team_creator_id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: team.team_creator_id,
                type: 'express_interest',
                title: 'New Project Interest',
                message: `Someone expressed interest in ${team.name}`,
                data: { interest_id: interest.id, team_id }
              });
          }

          result = { interest };
          break;
        }

        case 'connect': {
          const { message } = body;
          const requested_id = target_id;
          
          if (!requested_id) {
            return new Response(
              JSON.stringify({ error: 'target_id is required for connect action' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Insert connection request
          const { data: connection, error: connectionError } = await supabase
            .from('connection_requests')
            .insert({
              requester_id: actor_id,
              requested_id,
              message,
              status: 'pending'
            })
            .select()
            .single();

          if (connectionError) throw connectionError;

          // Create notification
          await supabase
            .from('notifications')
            .insert({
              user_id: requested_id,
              type: 'connection_request',
              title: 'New Connection Request',
              message: message || 'Someone wants to connect with you',
              data: { connection_id: connection.id }
            });

          result = { connection };
          break;
        }

        case 'join_workshop': {
          const workshop_id = target_id;
          
          if (!workshop_id) {
            return new Response(
              JSON.stringify({ error: 'target_id (workshop_id) is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Get current workshop
          const { data: workshop, error: workshopError } = await supabase
            .from('workshops')
            .select('*')
            .eq('id', workshop_id)
            .single();

          if (workshopError) throw workshopError;

          const attendees = workshop.attendees || [];
          if (!attendees.includes(actor_id)) {
            attendees.push(actor_id);
            
            const { data: updatedWorkshop, error: updateError } = await supabase
              .from('workshops')
              .update({ attendees })
              .eq('id', workshop_id)
              .select()
              .single();

            if (updateError) throw updateError;

            // Notify host
            if (workshop.host_id !== actor_id) {
              await supabase
                .from('notifications')
                .insert({
                  user_id: workshop.host_id,
                  type: 'workshop_join',
                  title: 'Workshop Registration',
                  message: `Someone joined your workshop: ${workshop.title}`,
                  data: { workshop_id, participant_id: actor_id }
                });
            }

            result = { success: true, workshop: updatedWorkshop };
          } else {
            result = { success: true, workshop, message: 'Already registered' };
          }
          break;
        }

        case 'react': {
          const { feed_item_id, feed_item_type, interaction_type, body: reactionBody } = body;
          
          if (!feed_item_id || !interaction_type) {
            return new Response(
              JSON.stringify({ error: 'feed_item_id and interaction_type are required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Insert feed interaction
          const { data: interaction, error: interactionError } = await supabase
            .from('feed_interactions')
            .insert({
              user_id: actor_id,
              feed_item_id,
              feed_item_type,
              interaction_type,
              body: reactionBody
            })
            .select()
            .single();

          if (interactionError) throw interactionError;

          // Notify target if provided
          if (target_id && target_id !== actor_id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: target_id,
                type: `feed_${interaction_type}`,
                title: `New ${interaction_type}`,
                message: reactionBody || `Someone ${interaction_type}d your content`,
                data: { interaction_id: interaction.id, feed_item_id }
              });
          }

          result = { interaction };
          break;
        }

        case 'oracle_command': {
          const { command, context } = body;
          
          if (!command) {
            return new Response(
              JSON.stringify({ error: 'Command is required for oracle_command action' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log('Oracle command executed:', command, 'Context:', context);

          // Log the Oracle command interaction
          const { data: logEntry, error: logError } = await supabase
            .from('oracle_logs')
            .insert({
              user_id: actor_id,
              query: command,
              query_type: 'command',
              model_used: 'graphrag-system',
              confidence: 0.95,
              sources: 1,
              context_used: true,
              helpful: true,
              response: JSON.stringify({
                command_executed: command,
                context: context,
                timestamp: new Date().toISOString()
              })
            })
            .select()
            .single();

          if (logError) {
            console.error('Failed to log Oracle command:', logError);
          }

          // Process command-specific logic
          let commandResult = {};
          
          if (command.includes('view connections')) {
            // Get user's connections for analysis
            const { data: connections } = await supabase
              .from('connection_requests')
              .select('*, requester:profiles!requester_id(*), requested:profiles!requested_id(*)')
              .or(`requester_id.eq.${actor_id},requested_id.eq.${actor_id}`)
              .eq('status', 'accepted')
              .limit(10);
            
            commandResult = { 
              type: 'connections_analysis',
              data: connections || [],
              insight: 'Connection analysis completed'
            };
          } else if (command.includes('offer help')) {
            // Get skills and opportunities
            const { data: skillOffers } = await supabase
              .from('skill_offers')
              .select('*, owner:profiles!owner_id(*)')
              .eq('status', 'active')
              .limit(5);
            
            commandResult = { 
              type: 'help_opportunities',
              data: skillOffers || [],
              insight: 'Help opportunities analyzed'
            };
          } else if (command.includes('join workshop')) {
            // Get available workshops
            const { data: workshops } = await supabase
              .from('workshops')
              .select('*')
              .gte('scheduled_at', new Date().toISOString())
              .order('scheduled_at', { ascending: true })
              .limit(5);
            
            commandResult = { 
              type: 'workshop_recommendations',
              data: workshops || [],
              insight: 'Workshop recommendations generated'
            };
          }

          result = { 
            command_processed: true,
            log_id: logEntry?.id,
            result: commandResult
          };
          break;
        }

        default:
          return new Response(
            JSON.stringify({ error: 'Unknown action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }

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
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});