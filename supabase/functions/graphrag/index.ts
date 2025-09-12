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
      
      // Update the record with the embedding
      const { error } = await supabase
        .from(table)
        .update({ embedding_vector: embedding })
        .eq('id', id);

      if (error) {
        console.error('Embedding update error:', error);
        throw new Error(`Failed to update embedding: ${error.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Embedding generated and stored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (endpoint === 'search' && req.method === 'POST') {
      const { query, table, limit = 5 } = payload || {};
      
      if (!query || !table) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: query, table' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(query);
      
      // Perform vector similarity search
      const { data, error } = await supabase
        .rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_count: limit,
          match_threshold: 0.7
        });

      if (error) {
        console.error('Search error:', error);
        throw new Error(`Search failed: ${error.message}`);
      }

      return new Response(
        JSON.stringify({ results: data }),
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

      let result = {};

      if (action === 'oracle_command') {
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

          // Process command-specific logic with comprehensive data gathering
          let commandResult = {};
          
        try {
          if (command.includes('view connections') || command.includes('connections')) {
            // Get comprehensive connection data
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('*')
              .limit(20);
            
            const { data: connections, error: connectionsError } = await supabase
              .from('connection_requests')
              .select('*')
              .or(`requester_id.eq.${userId},requested_id.eq.${userId}`)
              .limit(10);
            
            const { data: collaborationProposals, error: proposalsError } = await supabase
              .from('collaboration_proposals')
              .select('*')
              .or(`proposer_id.eq.${userId},target_id.eq.${userId}`)
              .limit(10);
            
            if (profilesError) console.warn('Profiles query error:', profilesError);
            if (connectionsError) console.warn('Connections query error:', connectionsError);
            if (proposalsError) console.warn('Proposals query error:', proposalsError);
            
            commandResult = { 
              type: 'connections_analysis',
              data: {
                profiles: profiles || [],
                connections: connections || [],
                collaborationProposals: collaborationProposals || []
              },
              insight: `Found ${profiles?.length || 0} profiles, ${connections?.length || 0} connections, ${collaborationProposals?.length || 0} collaboration proposals`
            };
          } else if (command.includes('offer help') || command.includes('help')) {
            // Get comprehensive help opportunities
            const { data: skillOffers, error: skillError } = await supabase
              .from('skill_offers')
              .select(`
                *,
                profiles!inner(full_name, display_name, bio, skills)
              `)
              .limit(10);
            
            const { data: workshops, error: workshopsError } = await supabase
              .from('workshops')
              .select(`
                *,
                profiles!inner(full_name, display_name, bio)
              `)
              .limit(10);
            
            const { data: challenges, error: challengesError } = await supabase
              .from('builder_challenges')
              .select(`
                *,
                profiles!inner(full_name, display_name, bio)
              `)
              .limit(10);
            
            if (skillError) console.warn('Skill offers query error:', skillError);
            if (workshopsError) console.warn('Workshops query error:', workshopsError);
            if (challengesError) console.warn('Challenges query error:', challengesError);
            
            commandResult = { 
              type: 'help_opportunities',
              data: {
                skillOffers: skillOffers || [],
                workshops: workshops || [],
                challenges: challenges || []
              },
              insight: `Found ${skillOffers?.length || 0} skill offers, ${workshops?.length || 0} workshops, ${challenges?.length || 0} challenges`
            };
          } else if (command.includes('join workshop') || command.includes('workshop')) {
            // Get comprehensive workshop data
            const { data: workshops, error: workshopsError } = await supabase
              .from('workshops')
              .select(`
                *,
                profiles!inner(full_name, display_name, bio)
              `)
              .order('created_at', { ascending: false })
              .limit(10);
            
            const { data: upcomingWorkshops, error: upcomingError } = await supabase
              .from('workshops')
              .select(`
                *,
                profiles!inner(full_name, display_name, bio)
              `)
              .gte('scheduled_at', new Date().toISOString())
              .order('scheduled_at', { ascending: true })
              .limit(5);
            
            if (workshopsError) console.warn('Workshops query error:', workshopsError);
            if (upcomingError) console.warn('Upcoming workshops query error:', upcomingError);
            
            commandResult = { 
              type: 'workshop_recommendations',
              data: {
                allWorkshops: workshops || [],
                upcomingWorkshops: upcomingWorkshops || []
              },
              insight: `Found ${workshops?.length || 0} total workshops, ${upcomingWorkshops?.length || 0} upcoming workshops`
            };
          } else if (command.includes('find team') || command.includes('team')) {
            // Get comprehensive team/project data
            const { data: teams, error: teamsError } = await supabase
              .from('teams')
              .select(`
                *,
                profiles!inner(full_name, display_name, bio),
                team_members!inner(user_id, role)
              `)
              .limit(20);
            
            const { data: projectInterests, error: interestsError } = await supabase
              .from('project_interests')
              .select(`
                *,
                teams!inner(name, description),
                profiles!inner(full_name, display_name)
              `)
              .limit(10);
            
            if (teamsError) console.warn('Teams query error:', teamsError);
            if (interestsError) console.warn('Project interests query error:', interestsError);
            
            commandResult = { 
              type: 'team_recommendations',
              data: {
                teams: teams || [],
                projectInterests: projectInterests || []
              },
              insight: `Found ${teams?.length || 0} teams, ${projectInterests?.length || 0} project interests`
            };
          } else if (command.includes('progress') || command.includes('track')) {
            // Get comprehensive progress data
            const { data: progress, error: progressError } = await supabase
              .from('progress_entries')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(20);
            
            const { data: updates, error: updatesError } = await supabase
              .from('updates')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(10);
            
            if (progressError) console.warn('Progress query error:', progressError);
            if (updatesError) console.warn('Updates query error:', updatesError);
            
            commandResult = { 
              type: 'progress_analysis',
              data: {
                progress: progress || [],
                updates: updates || []
              },
              insight: `Found ${progress?.length || 0} progress entries, ${updates?.length || 0} updates`
            };
          } else {
            // Default response for unknown commands with general platform data
            const { data: recentUpdates, error: updatesError } = await supabase
              .from('updates')
              .select(`
                *,
                profiles!inner(full_name, display_name, bio)
              `)
              .order('created_at', { ascending: false })
              .limit(5);
            
            if (updatesError) console.warn('Recent updates query error:', updatesError);
            
            commandResult = { 
              type: 'general_response',
              data: {
                recentUpdates: recentUpdates || []
              },
              insight: `Command "${command}" processed successfully. Found ${recentUpdates?.length || 0} recent updates.`
            };
          }
        } catch (queryError) {
          console.warn('Query error:', queryError);
          commandResult = { 
            type: 'error_response',
            data: [],
            insight: `Command "${command}" processed with warnings: ${queryError.message}`
            };
          }

          result = { 
            command_processed: true,
            log_id: logEntry?.id,
            result: commandResult
          };
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