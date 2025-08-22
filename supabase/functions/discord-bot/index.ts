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

        // Check if user is new or unlinked to show welcome message
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('discord_id, onboarding_completed, full_name, role')
          .eq('discord_id', interaction.user.id)
          .maybeSingle();

        const isNewOrUnlinked = !userProfile || (!userProfile.onboarding_completed && userProfile.role === 'guest');

        let response = '';
        
        // Send welcome message for new/unlinked users
        if (isNewOrUnlinked && commandName !== 'link') {
          const welcomeMessage = `👋 **Welcome to PieFi, ${interaction.user.username}!**\n\n` +
                                `I'm your AI startup assistant. I can help you with:\n` +
                                `• 🔮 \`/oracle\` - Get AI-powered startup advice\n` +
                                `• 📚 \`/resources\` - Access startup guides & templates\n` +
                                `• 🤝 \`/mentor\` - Connect with experienced mentors\n\n` +
                                `**🔗 Link Your Account for More:**\n` +
                                `Use \`/link\` to connect your PieFi account and unlock:\n` +
                                `• ✨ Personalized Oracle responses based on your project\n` +
                                `• 🎯 Mentor matching for your specific needs\n` +
                                `• 📊 Team collaboration & progress tracking\n` +
                                `• 🏆 Premium workshops & courses\n\n` +
                                `*I'll process your ${commandName} command below...*\n\n---\n\n`;
          response = welcomeMessage;
        }
        
        switch (commandName) {
          case 'oracle':
            const query = interaction.data?.options?.find(opt => opt.name === 'question')?.value;
            if (!query) {
              response = 'Please provide a question for the Oracle.';
              break;
            }
            
            // Get user role (if linked to website)
            const { data: userRole } = await supabase
              .from('profiles')
              .select('role, onboarding_completed, full_name')
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
              response += 'Sorry, the Oracle is unavailable right now. Please try again later.';
            } else {
              const isLinkedUser = userRole && userRole.onboarding_completed;
              response += `🔮 **Oracle Response:**\n${oracleResponse.answer}\n\n` +
                         (isLinkedUser 
                           ? `✨ *Personalized for ${userRole.full_name}*`
                           : `💡 *Want personalized advice? Link your account with \`/link\`*`
                         );
            }
            break;
            
          case 'resources':
            response += `📚 **PieFi Startup Resource Kit**\n\n` +
                      `**🎯 Essential Guides:**\n` +
                      `• Lean Canvas Template - Plan your business model\n` +
                      `• MVP Development Guide - Build your first version\n` +
                      `• Market Validation Framework - Test your ideas\n` +
                      `• Fundraising Playbook - Secure investment\n\n` +
                      `**💼 Tools & Templates:**\n` +
                      `• Customer Interview Scripts\n` +
                      `• Pitch Deck Template (Series A Ready)\n` +
                      `• Financial Planning Spreadsheet\n` +
                      `• User Research Templates\n\n` +
                      `**🚀 Ready for more?**\n` +
                      `Use \`/link\` to connect your PieFi account for:\n` +
                      `• Personalized mentor matching\n` +
                      `• Team collaboration tools\n` +
                      `• Advanced workshops & courses`;
            break;
            
          case 'link':
            // Generate a unique linking code
            const linkCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // Store the linking request (expires in 15 minutes)
            await supabase
              .from('discord_link_requests')
              .insert({
                discord_id: interaction.user.id,
                discord_username: interaction.user.username,
                link_code: linkCode,
                expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
              });
            
            response = `🔗 **Link Your PieFi Account**\n\n` +
                      `**Step 1:** Sign up at https://dijskfbokusyxkcfwkrc.lovable.app\n` +
                      `**Step 2:** Complete your profile onboarding\n` +
                      `**Step 3:** Enter this code: \`${linkCode}\`\n\n` +
                      `⏰ Code expires in 15 minutes\n\n` +
                      `**Why link your account?**\n` +
                      `• Get personalized Oracle responses\n` +
                      `• Connect with mentors using \`/mentor\`\n` +
                      `• Access premium resources & tools`;
            break;
            
          case 'mentor':
            // Check if user is linked and onboarded
            const { data: builderProfile } = await supabase
              .from('profiles')
              .select('id, role, onboarding_completed, full_name, skills, help_needed')
              .eq('discord_id', interaction.user.id)
              .maybeSingle();
              
            if (!builderProfile?.onboarding_completed) {
              response += `🔒 **Mentor Connection Requires Account**\n\n` +
                        `To connect with mentors, you need to:\n` +
                        `1. Use \`/link\` to connect your PieFi account\n` +
                        `2. Complete your profile with skills & goals\n` +
                        `3. Then use \`/mentor @username\` to connect\n\n` +
                        `💡 *Mentors can only help builders with complete profiles*`;
              break;
            }
            
            // Get mentor username from command
            const mentorMention = interaction.data?.options?.find(opt => opt.name === 'mentor')?.value;
            const message = interaction.data?.options?.find(opt => opt.name === 'message')?.value;
            
            if (!mentorMention || !message) {
              response += `**Usage:** \`/mentor @username Your message to the mentor\`\n\n` +
                        `**Example:**\n` +
                        `\`/mentor @sarah_mentor I need help with user acquisition strategies for my SaaS product\`\n\n` +
                        `💡 *Be specific about what help you need*`;
              break;
            }
            
            // Extract mentor Discord ID from mention
            const mentorDiscordId = mentorMention.replace(/[<@!>]/g, '');
            
            // Find mentor profile
            const { data: mentorProfile } = await supabase
              .from('profiles')
              .select('id, discord_id, full_name, role, skills')
              .eq('discord_id', mentorDiscordId)
              .eq('role', 'mentor')
              .maybeSingle();
              
            if (!mentorProfile) {
              response += `❌ **Mentor Not Found**\n\n` +
                        `The user you mentioned is not a registered mentor.\n` +
                        `Make sure they:\n` +
                        `• Have linked their PieFi account\n` +
                        `• Are assigned the mentor role\n\n` +
                        `💡 *Ask them to complete their mentor onboarding*`;
              break;
            }
            
            // Create mentor request with verification questions
            const verificationQuestions = [
              "What specific challenge are you facing?",
              "What have you already tried?", 
              "What outcome are you hoping for?",
              "What's your timeline for this?"
            ];
            
            // Store the mentor request
            await supabase.from('mentor_requests').insert({
              builder_id: builderProfile.id,
              mentor_id: mentorProfile.id,
              initial_message: message,
              verification_responses: [],
              status: 'pending_verification'
            });
            
            response += `🎯 **Mentor Request Started!**\n\n` +
                      `Connecting you with **${mentorProfile.full_name}**\n` +
                      `Mentor specialties: ${mentorProfile.skills?.join(', ') || 'General mentoring'}\n\n` +
                      `**Before sending your request, please answer:**\n` +
                      `1. ${verificationQuestions[0]}\n` +
                      `2. ${verificationQuestions[1]}\n` +
                      `3. ${verificationQuestions[2]}\n` +
                      `4. ${verificationQuestions[3]}\n\n` +
                      `*Reply with your answers to send a high-quality request*`;
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