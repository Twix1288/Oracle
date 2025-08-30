import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const DISCORD_PUBLIC_KEY = Deno.env.get('DISCORD_PUBLIC_KEY');
const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseKey!);

// Discord interaction types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
};

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
  MODAL: 9,
};

// Ed25519 signature verification
async function verifySignature(request: Request): Promise<boolean> {
  if (!DISCORD_PUBLIC_KEY) return false;
  
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.clone().text();
  
  if (!signature || !timestamp) return false;
  
  try {
    const encoder = new TextEncoder();
    const message = encoder.encode(timestamp + body);
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(DISCORD_PUBLIC_KEY);
    
    // Import the public key for verification
    const key = await crypto.subtle.importKey(
      'raw',
      publicKeyBytes,
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      false,
      ['verify']
    );
    
    return await crypto.subtle.verify('Ed25519', key, signatureBytes, message);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}

// Discord bot commands - mirror of Oracle commands
const DISCORD_COMMANDS = [
  {
    name: 'help',
    description: 'Show all available Oracle commands',
    type: 1
  },
  {
    name: 'resources',
    description: 'Find curated resources and tutorials',
    type: 1,
    options: [
      {
        name: 'topic',
        description: 'The topic to search for',
        type: 3,
        required: false
      }
    ]
  },
  {
    name: 'connect',
    description: 'Connect with other builders, mentors, or teams',
    type: 1,
    options: [
      {
        name: 'role',
        description: 'Type of person to connect with',
        type: 3,
        required: true,
        choices: [
          { name: 'Builder', value: 'builder' },
          { name: 'Mentor', value: 'mentor' },
          { name: 'Team', value: 'team' }
        ]
      },
      {
        name: 'skills',
        description: 'Skills or expertise area',
        type: 3,
        required: false
      }
    ]
  },
  {
    name: 'find',
    description: 'Find specific people, teams, or resources',
    type: 1,
    options: [
      {
        name: 'type',
        description: 'What to find',
        type: 3,
        required: true,
        choices: [
          { name: 'People', value: 'people' },
          { name: 'Teams', value: 'teams' },
          { name: 'Resources', value: 'resources' },
          { name: 'Events', value: 'events' }
        ]
      },
      {
        name: 'query',
        description: 'Search criteria',
        type: 3,
        required: false
      }
    ]
  },
  {
    name: 'message',
    description: 'Send a message to builders, mentors, or leads',
    type: 1,
    options: [
      {
        name: 'recipient',
        description: 'Who to message',
        type: 3,
        required: true,
        choices: [
          { name: 'My Mentor', value: 'mentor' },
          { name: 'My Team', value: 'team' },
          { name: 'Leads', value: 'leads' },
          { name: 'All Builders', value: 'builders' }
        ]
      },
      {
        name: 'message',
        description: 'Your message',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'update',
    description: 'Post an update about your progress',
    type: 1,
    options: [
      {
        name: 'type',
        description: 'Type of update',
        type: 3,
        required: true,
        choices: [
          { name: 'Progress', value: 'progress' },
          { name: 'Challenge', value: 'challenge' },
          { name: 'Success', value: 'success' },
          { name: 'Question', value: 'question' }
        ]
      },
      {
        name: 'content',
        description: 'Your update content',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'link',
    description: 'Link your Discord account to PieFi',
    type: 1
  }
];

// Auto-register Discord commands
async function registerDiscordCommands() {
  console.log('=== Starting Discord Command Registration ===');
  
  if (!DISCORD_BOT_TOKEN) {
    console.error('❌ No Discord bot token found');
    console.log('Available env vars:', Object.keys(Deno.env.toObject()).filter(k => k.includes('DISCORD')));
    return false;
  }
  console.log('✅ Discord bot token found');

  const APPLICATION_ID = Deno.env.get('DISCORD_APPLICATION_ID');
  if (!APPLICATION_ID) {
    console.error('❌ No Discord application ID found');
    console.log('Available env vars:', Object.keys(Deno.env.toObject()).filter(k => k.includes('DISCORD')));
    return false;
  }
  console.log('✅ Discord application ID found:', APPLICATION_ID);

  console.log('📝 Commands to register:', DISCORD_COMMANDS.length, 'commands');
  console.log('Command names:', DISCORD_COMMANDS.map(cmd => cmd.name));

  try {
    const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;
    console.log('🌐 Making request to:', url);
    
    const headers = {
      'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    };
    console.log('📋 Request headers set (token length:', DISCORD_BOT_TOKEN.length, ')');
    
    const body = JSON.stringify(DISCORD_COMMANDS);
    console.log('📄 Request body length:', body.length);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body,
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response status text:', response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Commands registered successfully:', result);
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ Discord API error response:', errorText);
      console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
      return false;
    }
  } catch (error) {
    console.error('💥 Exception during registration:', error);
    console.error('💥 Error stack:', error.stack);
    return false;
  }
}

// Enhanced Discord Oracle - mirrors website Oracle exactly
async function handleOracleCommand(commandName: string, options: any, user: any, guildId?: string): Promise<string> {
  const discordId = user.id;
  const username = user.username;
  
  // Check if user is linked to PieFi account
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('discord_id', discordId)
    .single();
  
  const userId = profile?.id;
  const role = profile?.role || 'guest';
  const teamId = profile?.team_id;

  try {
    switch (commandName) {
      case 'help':
        return `🛸 **Enhanced PieFi Oracle - Discord Commands**

**📚 Resource Commands:**
• \`/resources [topic]\` - Find curated resources and tutorials
• \`/connect [challenge]\` - Find people and experts to help

**👥 User Commands:**
• \`/find [search]\` - Search for team members
• \`/message [user] [content]\` - Send cross-platform message
• \`/update [progress]\` - Log progress update

**🔗 Account Commands:**
• \`/link\` - Link Discord to PieFi account

**💡 Enhanced Features:**
✨ Same Oracle as website - full sync
🌐 Cross-platform messaging (Discord ↔ Website)
📚 Real resource fetching from web
👥 Prioritizes PieFi community connections

${profile ? `🔗 **Linked Account:** ${profile.full_name} (${role})` : '🚨 **Account not linked** - Use `/link` to connect'}`;

      case 'resources':
        const topic = options.find((opt: any) => opt.name === 'topic')?.value;
        if (!topic) return '❌ Please specify a topic for resources.';
        
        // First check PieFi database for resources
        const { data: dbResources } = await supabase
          .from('documents')
          .select('content, metadata, source_type')
          .contains('role_visibility', [role])
          .or(`content.ilike.%${topic}%, metadata->>title.ilike.%${topic}%`)
          .limit(3);
        
        let response = `📚 **Resources for "${topic}":**\n\n`;
        
        // Add PieFi database resources first
        if (dbResources && dbResources.length > 0) {
          response += `**🏠 PieFi Knowledge Base:**\n`;
          dbResources.forEach((r: any, idx: number) => {
            const title = r.metadata?.title || `Resource ${idx + 1}`;
            const desc = r.content.substring(0, 100) + '...';
            response += `${idx + 1}. **${title}**\n   ${desc}\n\n`;
          });
        }
        
        // Then call Oracle for additional external resources as fallback
        try {
          const resourceResponse = await supabase.functions.invoke('super-oracle', {
            body: {
              query: `I need curated resources and tutorials for: ${topic}`,
              role: role,
              teamId,
              userId,
              contextRequest: {
                needsResources: true,
                needsMentions: false,
                needsTeamContext: false,
                needsPersonalization: true,
                resourceTopic: topic
              }
            }
          });
          
          if (resourceResponse.data?.resources) {
            const resources = resourceResponse.data.resources;
            response += `**🌐 Curated External Resources:**\n`;
            resources.slice(0, 3).forEach((r: any, idx: number) => {
              const icon = r.type === 'youtube' ? '📺' : r.type === 'tutorial' ? '🎓' : '📄';
              response += `${idx + 1}. ${icon} **${r.title}**\n   ${r.description}\n   🔗 ${r.url}\n\n`;
            });
          }
        } catch (error) {
          console.error('Oracle resource error:', error);
          // Continue with just database resources
        }
        
        if (!dbResources?.length && response.includes('🏠')) {
          return `🔍 No resources found for "${topic}". Try different keywords or check the website Oracle.`;
        }
        
        response += `💡 *More resources available on PieFi website Oracle!*`;
        return response;

      case 'connect':
        const connectRole = options.find((opt: any) => opt.name === 'role')?.value;
        const skills = options.find((opt: any) => opt.name === 'skills')?.value || '';
        if (!connectRole) return '❌ Please specify the role (builder/mentor/team) you want to connect with.';
        
        let connectResponse = `🤝 **Connect with ${connectRole}s:**\n\n`;
        
        // PRIORITIZE PieFi database - search profiles first
        const searchQuery = skills ? 
          `skills.cs.{${skills}},help_needed.cs.{${skills}},bio.ilike.%${skills}%` :
          `role.eq.${connectRole}`;
          
        const { data: pieFiPeople } = await supabase
          .from('profiles')
          .select('full_name, role, skills, bio, discord_id, help_needed, experience_level, availability')
          .or(searchQuery)
          .neq('id', userId) // Don't include the user themselves
          .limit(4);
        
        if (pieFiPeople && pieFiPeople.length > 0) {
          connectResponse += `**🏠 PieFi Community Members:**\n`;
          pieFiPeople.forEach((p, idx) => {
            connectResponse += `${idx + 1}. **${p.full_name}** (${p.role})\n`;
            if (p.skills?.length) connectResponse += `   💪 Skills: ${p.skills.slice(0, 3).join(', ')}\n`;
            if (p.help_needed?.length) connectResponse += `   🤝 Can help with: ${p.help_needed.slice(0, 2).join(', ')}\n`;
            if (p.availability) connectResponse += `   ⏰ ${p.availability}\n`;
            if (p.discord_id) {
              connectResponse += `   💬 <@${p.discord_id}>\n`;
            }
            connectResponse += `\n`;
          });
        }
        
        // Only use external resources as fallback if no PieFi matches found
        if (!pieFiPeople?.length) {
          try {
            const connectionResponse = await supabase.functions.invoke('super-oracle', {
              body: {
                query: `I need to connect with ${connectRole}s for ${skills || 'general collaboration'}`,
                role: role,
                teamId,
                userId,
                contextRequest: {
                  needsResources: false,
                  needsMentions: true,
                  needsTeamContext: false,
                  needsPersonalization: true
                }
              }
            });
            
            if (connectionResponse.data?.answer) {
              connectResponse += `**🌐 External Connections:**\n${connectionResponse.data.answer}\n\n`;
            }
          } catch (error) {
            console.error('External connection search error:', error);
          }
          
          connectResponse += `💡 *Join PieFi to connect with more builders and mentors in our community!*`;
        } else {
          connectResponse += `💡 *${pieFiPeople.length} community members found! Message them directly or use the website.*`;
        }
        
        return connectResponse;

      case 'find':
        const searchTerm = options.find((opt: any) => opt.name === 'search')?.value;
        if (!searchTerm) return '❌ Please specify who or what to find.';
        
        const { data: foundUsers } = await supabase
          .from('profiles')
          .select('full_name, role, skills, discord_id')
          .or(`full_name.ilike.%${searchTerm}%,skills.cs.{${searchTerm}}`);
        
        if (foundUsers && foundUsers.length > 0) {
          let findResponse = `🔍 **Found ${foundUsers.length} matches for "${searchTerm}":**\n\n`;
          foundUsers.slice(0, 4).forEach((user, idx) => {
            findResponse += `${idx + 1}. **${user.full_name}** (${user.role})\n   💪 ${user.skills?.join(', ') || 'No skills listed'}\n`;
            if (user.discord_id) {
              findResponse += `   💬 <@${user.discord_id}>\n`;
            }
            findResponse += `\n`;
          });
          return findResponse;
        } else {
          return `❌ No matches found for "${searchTerm}". Try different keywords.`;
        }

      case 'message':
        if (!profile) return '❌ You must link your Discord account first. Use `/link` command.';
        
        const targetUser = options.find((opt: any) => opt.name === 'user')?.value;
        const messageContent = options.find((opt: any) => opt.name === 'content')?.value;
        
        if (!targetUser || !messageContent) {
          return '❌ Please provide both username and message content.';
        }
        
        // Find target user
        const { data: target } = await supabase
          .from('profiles')
          .select('id, full_name, role, discord_id')
          .ilike('full_name', `%${targetUser}%`)
          .single();
        
        if (target) {
          // Send to database (website will show this)
          const { error } = await supabase
            .from('messages')
            .insert({
              sender_id: userId,
              sender_role: role,
              receiver_id: target.id,
              receiver_role: target.role,
              content: `${messageContent}\n\n*Sent via Discord Oracle*`,
              team_id: teamId
            });
          
          if (!error) {
            let response = `✅ **Message sent to ${target.full_name}:**\n"${messageContent}"\n\n📱 **Delivered to:** Website dashboard`;
            
            // Try to send Discord DM if they have Discord linked
            if (target.discord_id && DISCORD_BOT_TOKEN) {
              try {
                const dmResponse = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ recipient_id: target.discord_id })
                });
                
                if (dmResponse.ok) {
                  const dmChannel = await dmResponse.json();
                  
                  await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      content: `💬 **Message from ${profile.full_name} via PieFi Oracle:**\n\n${messageContent}\n\n*This message was also sent to your PieFi dashboard*`
                    })
                  });
                  
                  response += ` + Discord DM`;
                }
              } catch (dmError) {
                console.error('Failed to send Discord DM:', dmError);
              }
            }
            
            return response;
          } else {
            return `❌ Failed to send message: ${error.message}`;
          }
        } else {
          return `❌ User "${targetUser}" not found. Use \`/find\` to search first.`;
        }

      case 'update':
        if (!profile) return '❌ You must link your Discord account first. Use `/link` command.';
        if (!teamId) return '❌ You must be assigned to a team to log updates.';
        
        const progressContent = options.find((opt: any) => opt.name === 'progress')?.value;
        if (!progressContent) return '❌ Please provide update content.';
        
        const { error } = await supabase
          .from('updates')
          .insert({
            team_id: teamId,
            content: progressContent,
            type: 'daily',
            created_by: userId
          });
        
        if (!error) {
          // Also update team status
          await supabase
            .from('team_status')
            .upsert({
              team_id: teamId,
              current_status: progressContent.substring(0, 200),
              last_update: new Date().toISOString()
            });
          
          return `✅ **Progress Update Logged:**\n"${progressContent}"\n\n📊 Team status updated\n⏰ ${new Date().toLocaleString()}\n🔄 Synced to PieFi website`;
        } else {
          return `❌ Failed to log update: ${error.message}`;
        }

      case 'link':
        // Generate linking code
        const linkCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        
        await supabase
          .from('discord_link_requests')
          .insert({
            discord_id: discordId,
            discord_username: username,
            link_code: linkCode,
            expires_at: expiresAt.toISOString()
          });
        
        return `🔗 **Link Your Discord to PieFi Account**

**Link Code:** \`${linkCode}\`
**Expires:** ${expiresAt.toLocaleTimeString()}

**How to link:**
1. Go to PieFi website and log in
2. Go to your profile settings
3. Enter the code: \`${linkCode}\`
4. Your Discord and PieFi accounts will be fully synced!

**Once linked you can:**
✨ Use all Oracle commands with your account context
💬 Send cross-platform messages
📊 Log updates that sync to your team dashboard
🔄 Full synchronization between Discord ↔ Website`;

      default:
        return `❌ Unknown command: ${commandName}. Use \`/help\` to see available commands.`;
    }
  } catch (error) {
    console.error('Discord Oracle command error:', error);
    return `❌ An error occurred while processing your command. Please try again or contact support.`;
  }
}

// Log Discord bot interaction
async function logBotInteraction(interaction: any, success: boolean, error?: string) {
  try {
    await supabase.from('bot_commands_log').insert({
      command_name: interaction.data?.name || 'unknown',
      guild_id: interaction.guild_id,
      user_id: interaction.member?.user?.id || interaction.user?.id,
      command_data: interaction.data,
      success,
      error_message: error,
      response_time_ms: Date.now() - (interaction.timestamp || Date.now())
    });
  } catch (logError) {
    console.error('Failed to log bot interaction:', logError);
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }
  
  // Handle Discord interactions
  if (req.method === 'POST') {
    // Verify Discord signature
    const isValid = await verifySignature(req);
    if (!isValid) {
      return new Response('Unauthorized', { 
        status: 401,
        headers: corsHeaders
      });
    }
    
    const interaction = await req.json();
    
    // Handle PING
    if (interaction.type === InteractionType.PING) {
      return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Handle slash commands
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      try {
        const commandName = interaction.data.name;
        const options = interaction.data.options || [];
        const user = interaction.member?.user || interaction.user;
        
        console.log(`Discord command: ${commandName} by ${user.username}`);
        
        // For quick commands, respond immediately
        if (commandName === 'help' || commandName === 'link') {
          const response = await handleOracleCommand(
            commandName, 
            options, 
            user, 
            interaction.guild_id
          );
          
          await logBotInteraction(interaction, true);
          
          return new Response(JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: response,
              flags: 64 // Ephemeral - only visible to the user
            }
          }), {
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        // For resource-heavy commands, use deferred response
        // Send immediate acknowledgment
        const deferredResponse = new Response(JSON.stringify({
          type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: 64 // Ephemeral
          }
        }), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
        
        // Process command in background
        EdgeRuntime.waitUntil((async () => {
          try {
            const response = await handleOracleCommand(
              commandName, 
              options, 
              user, 
              interaction.guild_id
            );
            
            // Send follow-up message
            await fetch(`https://discord.com/api/v10/webhooks/${Deno.env.get('DISCORD_APPLICATION_ID')}/${interaction.token}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: response,
                flags: 64
              }),
            });
            
            await logBotInteraction(interaction, true);
          } catch (error) {
            console.error('Discord command background error:', error);
            
            // Send error follow-up
            await fetch(`https://discord.com/api/v10/webhooks/${Deno.env.get('DISCORD_APPLICATION_ID')}/${interaction.token}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: '❌ An error occurred while processing your command. Please try again.',
                flags: 64
              }),
            });
            
            await logBotInteraction(interaction, false, error.message);
          }
        })());
        
        return deferredResponse;
        
      } catch (error) {
        console.error('Discord command error:', error);
        await logBotInteraction(interaction, false, error.message);
        
        return new Response(JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ An error occurred while processing your command. Please try again.',
            flags: 64
          }
        }), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }
  }
  
  // Handle GET requests - bot status page and command registration
  if (req.method === 'GET') {
    console.log('🚀 GET request received:', url.searchParams.toString());
    
    // Check if this is a command registration request
    if (url.searchParams.get('register') === 'true') {
      console.log('🎯 Command registration requested');
      
      try {
        // Check environment variables first
        const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
        const APPLICATION_ID = Deno.env.get('DISCORD_APPLICATION_ID');
        
        if (!DISCORD_BOT_TOKEN) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Missing DISCORD_BOT_TOKEN environment variable',
            timestamp: new Date().toISOString()
          }), {
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        if (!APPLICATION_ID) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Missing DISCORD_APPLICATION_ID environment variable',
            timestamp: new Date().toISOString()
          }), {
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        // Try to register commands and return detailed response
        const url_discord = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;
        
        const response = await fetch(url_discord, {
          method: 'PUT',
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(DISCORD_COMMANDS),
        });

        const responseText = await response.text();
        
        if (response.ok) {
          return new Response(JSON.stringify({
            success: true,
            message: 'Commands registered successfully!',
            discord_response: responseText,
            commands_count: DISCORD_COMMANDS.length,
            timestamp: new Date().toISOString()
          }), {
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        } else {
          return new Response(JSON.stringify({
            success: false,
            message: `Discord API Error: ${response.status} ${response.statusText}`,
            discord_error: responseText,
            api_url: url_discord,
            commands_sent: DISCORD_COMMANDS.length,
            timestamp: new Date().toISOString()
          }), {
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          message: `Exception during registration: ${error.message}`,
          error_stack: error.stack,
          timestamp: new Date().toISOString()
        }), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }
    
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PieFi Discord Bot</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .status { color: green; font-weight: bold; }
            .command { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>🛸 PieFi Discord Bot</h1>
          <p class="status">✅ Bot is online and ready!</p>
          
          <h2>Available Commands:</h2>
          ${DISCORD_COMMANDS.map(cmd => `
            <div class="command">
              <strong>/${cmd.name}</strong> - ${cmd.description}
            </div>
          `).join('')}
          
          <h2>Features:</h2>
          <ul>
            <li>🔄 Full sync with PieFi website Oracle</li>
            <li>📚 Real resource fetching from web</li>
            <li>👥 Cross-platform messaging</li>
            <li>🔗 Account linking system</li>
            <li>📊 Progress tracking and updates</li>
          </ul>
          
          <p><strong>Interaction Endpoint:</strong> ${req.url}</p>
          <p><em>Use this URL in Discord Developer Portal</em></p>
          <p><strong>Test Registration:</strong> <a href="${req.url}?register=true">Register Commands</a></p>
        </body>
      </html>
    `, {
      headers: { 
        'Content-Type': 'text/html',
        ...corsHeaders
      }
    });
  }
  
  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders
  });
});