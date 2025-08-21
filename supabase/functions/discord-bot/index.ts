import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface DiscordMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
  };
  channel_id: string;
  guild_id: string;
  timestamp: string;
}

interface DiscordInteraction {
  id: string;
  type: number;
  data?: {
    name: string;
    options?: Array<{
      name: string;
      value: string;
    }>;
  };
  user: {
    id: string;
    username: string;
  };
  guild_id: string;
  channel_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Discord bot request received');
    
    const signature = req.headers.get('X-Signature-Ed25519');
    const timestamp = req.headers.get('X-Signature-Timestamp');
    
    if (!signature || !timestamp) {
      console.log('Missing signature or timestamp');
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.text();
    let interaction: DiscordInteraction;
    
    try {
      interaction = JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      return new Response('Invalid JSON', { status: 400 });
    }

    console.log('Interaction type:', interaction.type);
    
    // Handle Discord ping
    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle slash commands
    if (interaction.type === 2) {
      const commandName = interaction.data?.name;
      console.log('Command name:', commandName);
      
      const startTime = Date.now();
      let success = true;
      let errorMessage = '';
      
      try {
        // Find or create Discord profile
        const { data: profileId } = await supabase.rpc('find_or_create_discord_profile', {
          p_discord_id: interaction.user.id,
          p_discord_username: interaction.user.username
        });

        let response = '';
        
        switch (commandName) {
          case 'profile':
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('discord_id', interaction.user.id)
              .single();
            
            if (profile) {
              response = `**Your Profile:**\n` +
                        `Name: ${profile.full_name || 'Not set'}\n` +
                        `Role: ${profile.role}\n` +
                        `Team: ${profile.team_id ? 'Assigned' : 'None'}\n` +
                        `Skills: ${profile.skills?.join(', ') || 'None listed'}`;
            } else {
              response = 'Profile not found. Creating a new profile for you!';
            }
            break;
            
          case 'teams':
            const { data: teams } = await supabase
              .from('teams')
              .select('id, name, description, stage')
              .limit(10);
            
            if (teams && teams.length > 0) {
              response = '**Active Teams:**\n' + 
                        teams.map(team => `• ${team.name} (${team.stage})\n  ${team.description || 'No description'}`).join('\n\n');
            } else {
              response = 'No teams found.';
            }
            break;
            
          case 'help':
            response = `**Available Commands:**\n` +
                      `• \`/profile\` - View your profile information\n` +
                      `• \`/teams\` - List active teams\n` +
                      `• \`/update\` - Submit a progress update\n` +
                      `• \`/oracle\` - Ask the Oracle a question\n` +
                      `• \`/help\` - Show this help message`;
            break;
            
          case 'update':
            const content = interaction.data?.options?.find(opt => opt.name === 'message')?.value;
            if (!content) {
              response = 'Please provide an update message.';
              break;
            }
            
            // Get user's team
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('team_id')
              .eq('discord_id', interaction.user.id)
              .single();
              
            if (!userProfile?.team_id) {
              response = 'You need to be assigned to a team to submit updates.';
              break;
            }
            
            // Submit update
            await supabase
              .from('updates')
              .insert({
                team_id: userProfile.team_id,
                type: 'progress',
                content: content,
                created_by: profileId
              });
              
            response = 'Update submitted successfully! 🎉';
            break;
            
          case 'oracle':
            const query = interaction.data?.options?.find(opt => opt.name === 'question')?.value;
            if (!query) {
              response = 'Please provide a question for the Oracle.';
              break;
            }
            
            // Get user role
            const { data: userRole } = await supabase
              .from('profiles')
              .select('role')
              .eq('discord_id', interaction.user.id)
              .single();
              
            // Call the RAG query function
            const { data: oracleResponse, error: oracleError } = await supabase.functions.invoke('rag-query', {
              body: { 
                query: query,
                role: userRole?.role || 'guest'
              }
            });
            
            if (oracleError) {
              response = 'Sorry, the Oracle is unavailable right now. Please try again later.';
            } else {
              response = `🔮 **Oracle Response:**\n${oracleResponse.answer}`;
            }
            break;
            
          default:
            response = 'Unknown command. Use `/help` to see available commands.';
        }
        
        // Log the command
        await supabase
          .from('bot_commands_log')
          .insert({
            user_id: profileId,
            command_name: commandName || 'unknown',
            command_data: interaction.data,
            guild_id: interaction.guild_id,
            response_time_ms: Date.now() - startTime,
            success: success,
            error_message: errorMessage || null
          });
        
        return new Response(JSON.stringify({
          type: 4,
          data: {
            content: response,
            flags: 64 // ephemeral
          }
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
        
      } catch (error) {
        console.error('Command execution error:', error);
        success = false;
        errorMessage = error.message;
        
        // Log the failed command
        try {
          await supabase
            .from('bot_commands_log')
            .insert({
              command_name: commandName || 'unknown',
              command_data: interaction.data,
              guild_id: interaction.guild_id,
              response_time_ms: Date.now() - startTime,
              success: false,
              error_message: error.message
            });
        } catch (logError) {
          console.error('Failed to log error:', logError);
        }
        
        return new Response(JSON.stringify({
          type: 4,
          data: {
            content: 'Sorry, something went wrong processing your command.',
            flags: 64
          }
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('Discord bot error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});