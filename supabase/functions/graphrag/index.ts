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

        // Process command-specific logic
        let commandResult = {};
        
        try {
          if (command.includes('view connections')) {
            // Get connection data from profiles table
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('*')
              .limit(10);
            
            if (profilesError) {
              console.warn('Profiles query error:', profilesError);
            }
            
            commandResult = { 
              type: 'connections_analysis',
              data: profiles || [],
              insight: 'Connection analysis completed'
            };
          } else if (command.includes('offer help')) {
            // Get profiles for help opportunities
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('*')
              .limit(5);
            
            if (profilesError) {
              console.warn('Profiles query error:', profilesError);
            }
            
            commandResult = { 
              type: 'help_opportunities',
              data: profiles || [],
              insight: 'Help opportunities analyzed'
            };
          } else if (command.includes('join workshop')) {
            // Try to get workshops (if table exists)
            const { data: workshops, error: workshopsError } = await supabase
              .from('workshops')
              .select('*')
              .limit(5);
            
            if (workshopsError) {
              console.warn('Workshops query error:', workshopsError);
            }
            
            commandResult = { 
              type: 'workshop_recommendations',
              data: workshops || [],
              insight: 'Workshop recommendations generated'
            };
          } else {
            // Default response for unknown commands
            commandResult = { 
              type: 'general_response',
              data: [],
              insight: `Command "${command}" processed successfully`
            };
          }
        } catch (queryError) {
          console.warn('Query error:', queryError);
          commandResult = { 
            type: 'error_response',
            data: [],
            insight: `Command "${command}" processed with warnings`
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

// Simple embedding generation function
async function generateEmbedding(text: string): Promise<number[]> {
  // For now, return a dummy embedding vector
  // In production, this would call OpenAI's embedding API
  const embedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
  return embedding;
}