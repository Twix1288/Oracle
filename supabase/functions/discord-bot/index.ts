import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
const DISCORD_PUBLIC_KEY = Deno.env.get('DISCORD_PUBLIC_KEY');
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

async function verifyDiscordRequest(request: Request): Promise<boolean> {
  if (!DISCORD_PUBLIC_KEY) {
    console.error('Discord public key not configured');
    return false;
  }

  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');
  
  if (!signature || !timestamp) {
    console.log('Missing signature or timestamp');
    return false;
  }

  try {
    const body = await request.text();
    const message = timestamp + body;
    
    // Import the public key
    const publicKeyBytes = new Uint8Array(
      DISCORD_PUBLIC_KEY.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    const publicKey = await crypto.subtle.importKey(
      'raw',
      publicKeyBytes,
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      false,
      ['verify']
    );
    
    const messageBytes = new TextEncoder().encode(message);
    
    const isValid = await crypto.subtle.verify(
      'Ed25519',
      publicKey,
      signatureBytes,
      messageBytes
    );
    
    return isValid;
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Discord bot request received');
    
    // Clone the request for verification
    const requestClone = req.clone();
    
    // Verify the Discord request signature
    const isValidRequest = await verifyDiscordRequest(requestClone);
    if (!isValidRequest) {
      console.log('Invalid Discord signature');
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
              .maybeSingle();
            
            if (profile) {
              // Check if user has completed onboarding
              if (profile.onboarding_completed) {
                response = `**Your Profile:**\n` +
                          `Name: ${profile.full_name || 'Not set'}\n` +
                          `Role: ${profile.role}\n` +
                          `Team: ${profile.team_id ? 'Assigned' : 'None'}\n` +
                          `Skills: ${profile.skills?.join(', ') || 'None listed'}\n` +
                          `Status: ✅ **Onboarding Complete**`;
              } else {
                response = `**Your Profile (Incomplete):**\n` +
                          `Name: ${profile.full_name || 'Not set'}\n` +
                          `Role: ${profile.role} (Discord only)\n` +
                          `Status: ⚠️ **Onboarding Required**\n\n` +
                          `🔗 Complete your profile: https://dijskfbokusyxkcfwkrc.lovable.app\n` +
                          `Access full features by signing up on the website!`;
              }
            } else {
              response = 'Profile not found. Creating a basic Discord profile for you!\n\n' +
                        '🔗 **Sign up on the website for full access:**\n' +
                        'https://dijskfbokusyxkcfwkrc.lovable.app\n\n' +
                        'After signing up, link your Discord account in your profile settings.';
            }
            break;
            
          case 'teams':
            // Only for verified website users
            const { data: verifiedUser } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('discord_id', interaction.user.id)
              .maybeSingle();
              
            if (!verifiedUser?.onboarding_completed) {
              response = `🔒 **Premium Feature: Verified Teams**\n\n` +
                        `This command shows verified teams with:\n` +
                        `• Mentor assignments\n` +
                        `• Progress tracking\n` +
                        `• Launch support\n\n` +
                        `🎯 **Get Access:**\n` +
                        `1. Sign up: https://dijskfbokusyxkcfwkrc.lovable.app\n` +
                        `2. Complete onboarding\n` +
                        `3. Use \`/link\` to connect your Discord\n\n` +
                        `*For now, try \`/team create [name]\` for Discord-only teams!*`;
              break;
            }
            
            const { data: teams } = await supabase
              .from('teams')
              .select('id, name, description, stage')
              .limit(10);
            
            if (teams && teams.length > 0) {
              response = '✅ **Verified PieFi Teams:**\n' + 
                        teams.map(team => `• **${team.name}** (${team.stage})\n  ${team.description || 'Building something awesome'}`).join('\n\n') +
                        '\n\n*These teams have mentor support and progress tracking!*';
            } else {
              response = 'No verified teams found. Contact your mentor for team assignment.';
            }
            break;
            
          case 'update':
            // Only for verified website users with teams
            const { data: updateUserProfile } = await supabase
              .from('profiles')
              .select('team_id, onboarding_completed')
              .eq('discord_id', interaction.user.id)
              .maybeSingle();
              
            if (!updateUserProfile?.onboarding_completed) {
              response = `🔒 **Premium Feature: Progress Updates**\n\n` +
                        `Track your startup progress across Discord + website!\n\n` +
                        `🚀 **Get Access:**\n` +
                        `1. Sign up: https://dijskfbokusyxkcfwkrc.lovable.app\n` +
                        `2. Join or create a team\n` +
                        `3. Use \`/link\` to connect Discord\n\n` +
                        `*For now, share updates manually in your team channel!*`;
              break;
            }
            
            if (!updateUserProfile?.team_id) {
              response = 'You need to be assigned to a verified team to submit progress updates.\n' +
                        'Contact your mentor or use the website to join a team.';
              break;
            }
            
            const content = interaction.data?.options?.find(opt => opt.name === 'message')?.value;
            if (!content) {
              response = 'Please provide an update message.';
              break;
            }
            
            // Submit update to verified team
            await supabase
              .from('updates')
              .insert({
                team_id: updateUserProfile.team_id,
                type: 'progress',
                content: content,
                created_by: profileId
              });
              
            response = '✅ **Progress Update Submitted!**\n' +
                      'Your update has been synced across Discord and the PieFi website.\n' +
                      'Team mentors and leads can now see your progress! 🎉';
            break;
            
          case 'oracle':
            const query = interaction.data?.options?.find(opt => opt.name === 'question')?.value;
            if (!query) {
              response = 'Please provide a question for the Oracle.';
              break;
            }
            
            // Get user role (if linked to website)
            const { data: userRole } = await supabase
              .from('profiles')
              .select('role, onboarding_completed')
              .eq('discord_id', interaction.user.id)
              .maybeSingle();
               
            // Call the RAG query function (works for all users)
            const { data: oracleResponse, error: oracleError } = await supabase.functions.invoke('rag-query', {
              body: { 
                query: query,
                role: userRole?.role || 'guest'
              }
            });
            
            if (oracleError) {
              response = 'Sorry, the Oracle is unavailable right now. Please try again later.';
            } else {
              const isLinkedUser = userRole && userRole.onboarding_completed;
              response = `🔮 **Oracle Response:**\n${oracleResponse.answer}\n\n` +
                        (isLinkedUser 
                          ? `✨ *Personalized for your PieFi profile*`
                          : `💡 *Want personalized advice based on your project? Sign up at https://dijskfbokusyxkcfwkrc.lovable.app*`
                        );
            }
            break;
            
          case 'resources':
            response = `📚 **Startup Resource Kit**\n\n` +
                      `**🎯 Getting Started:**\n` +
                      `• Lean Canvas Template - Plan your business model\n` +
                      `• MVP Planning Guide - Build your first version\n` +
                      `• Market Validation Checklist - Test your idea\n\n` +
                      `**💡 Key Resources:**\n` +
                      `• Customer Interview Scripts\n` +
                      `• Pricing Strategy Frameworks\n` +
                      `• Launch Timeline Templates\n\n` +
                      `**🚀 Advanced Tools (Website Members):**\n` +
                      `• Personalized mentor matching\n` +
                      `• Team progress tracking\n` +
                      `• Exclusive founder workshops\n\n` +
                      `🔓 *Unlock advanced resources: https://dijskfbokusyxkcfwkrc.lovable.app*`;
            break;
            
          case 'team':
            const action = interaction.data?.options?.find(opt => opt.name === 'action')?.value;
            const teamName = interaction.data?.options?.find(opt => opt.name === 'name')?.value;
            
            if (action === 'create' && teamName) {
              // Create temporary Discord team
              response = `🎉 **Discord Team Created!**\n\n` +
                        `**Team**: ${teamName}\n` +
                        `**Founder**: ${interaction.user.username}\n` +
                        `**Status**: Discord-Only (Temporary)\n\n` +
                        `**What you can do:**\n` +
                        `• Share ideas and updates in this channel\n` +
                        `• Invite other Discord members\n` +
                        `• Use \`/oracle\` for team advice\n\n` +
                        `**🚀 Want persistent team tracking?**\n` +
                        `Sign up at https://dijskfbokusyxkcfwkrc.lovable.app to:\n` +
                        `• Track progress across Discord + website\n` +
                        `• Get matched with mentors\n` +
                        `• Access team analytics & milestones`;
            } else {
              response = `**Team Commands:**\n` +
                        `• \`/team create [name]\` - Start a new team project\n` +
                        `• \`/team join [code]\` - Join an existing team (requires website account)\n\n` +
                        `*Note: Discord teams are temporary. Sign up on PieFi for permanent team tracking!*`;
            }
            break;
            
          case 'help':
            response = `**🚀 PieFi Discord Bot - Your Startup Companion**\n\n` +
                      `**📚 Free Commands (No Account Needed):**\n` +
                      `• \`/oracle\` - Ask startup questions & get AI guidance\n` +
                      `• \`/resources\` - Get startup guides & tools\n` +
                      `• \`/team create [name]\` - Start a team project (Discord-only)\n` +
                      `• \`/profile\` - View your status\n` +
                      `• \`/help\` - Show this help\n\n` +
                      `**⭐ Premium Commands (Website Account Required):**\n` +
                      `• \`/update\` - Track progress across Discord + website\n` +
                      `• \`/teams\` - Join verified teams with mentorship\n` +
                      `• \`/link\` - Connect your PieFi website account\n\n` +
                      `🔗 **Unlock Full Features**: Sign up at https://dijskfbokusyxkcfwkrc.lovable.app`;
            break;
            
          case 'link':
            // Generate a unique linking code
            const linkCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // Store the linking request (expires in 10 minutes)
            await supabase
              .from('discord_link_requests')
              .insert({
                discord_id: interaction.user.id,
                discord_username: interaction.user.username,
                link_code: linkCode,
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
              });
            
            response = `🔗 **Link Your Account**\n\n` +
                      `1. Sign up/login at: https://dijskfbokusyxkcfwkrc.lovable.app\n` +
                      `2. Go to your profile settings\n` +
                      `3. Enter this code: \`${linkCode}\`\n\n` +
                      `⏰ Code expires in 10 minutes`;
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