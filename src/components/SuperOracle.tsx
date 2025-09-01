import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Bot, 
  Send, 
  Sparkles, 
  Users, 
  Hash, 
  Zap,
  MessageSquare,
  Star,
  Play,
  Link as LinkIcon,
  User,
  Crown,
  Shield,
  Heart,
  Loader2,
  Activity
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/oracle";
import ReactMarkdown from "react-markdown";

interface SuperOracleProps {
  selectedRole: UserRole;
  teamId?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'oracle' | 'system';
  content: string;
  timestamp: string;
  author?: {
    name: string;
    role: UserRole;
    avatar?: string;
  };
  metadata?: {
    command?: string;
    sources?: number;
    resources?: OracleResource[];
    mentions?: string[];
    confidence?: number;
    stage?: string;
  };
  sections?: {
    answer: string;
    resources?: OracleResource[];
    actions?: string[];
    mentions?: string[];
  };
}

interface OracleResource {
  title: string;
  url: string;
  type: 'youtube' | 'article' | 'documentation' | 'tutorial' | 'tool';
  description: string;
  relevance: number;
}

interface SlashCommand {
  command: string;
  description: string;
  usage: string;
  roleRequired: UserRole[];
  category: 'team' | 'user' | 'oracle' | 'admin';
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: '/help',
    description: 'Show all available commands',
    usage: '/help',
    roleRequired: ['builder', 'mentor', 'lead', 'guest'],
    category: 'oracle'
  },
  {
    command: '/status',
    description: 'Check team or user status',
    usage: '/status [@user | @team]',
    roleRequired: ['builder', 'mentor', 'lead'],
    category: 'team'
  },
  {
    command: '/update',
    description: 'Log progress update',
    usage: '/update your progress description',
    roleRequired: ['builder', 'mentor', 'lead'],
    category: 'team'
  },
  {
    command: '/message',
    description: 'Send message to user or team',
    usage: '/message @target your message OR /message builders hello everyone',
    roleRequired: ['builder', 'mentor', 'lead'],
    category: 'team'
  },
  {
    command: '/chat',
    description: 'Start team conversation',
    usage: '/chat your message to the team',
    roleRequired: ['builder', 'mentor', 'lead'],
    category: 'team'
  },
  {
    command: '/find',
    description: 'Find team members by skills',
    usage: '/find [skill | expertise]',
    roleRequired: ['builder', 'mentor', 'lead'],
    category: 'user'
  },
  {
    command: '/resources',
    description: 'Get curated resources for your project',
    usage: '/resources [topic | technology]',
    roleRequired: ['builder', 'mentor', 'lead', 'guest'],
    category: 'oracle'
  },
  {
    command: '/analyze',
    description: 'Deep analysis of team progress',
    usage: '/analyze [@team | overall]',
    roleRequired: ['mentor', 'lead'],
    category: 'admin'
  },
  {
    command: '/broadcast',
    description: 'Send announcement to all teams',
    usage: '/broadcast your announcement',
    roleRequired: ['lead'],
    category: 'admin'
  },
  {
    command: '/connect',
    description: 'Find people to help with specific challenges',
    usage: '/connect [challenge or skill needed]',
    roleRequired: ['builder', 'mentor', 'lead'],
    category: 'user'
  },
  {
    command: '/progress',
    description: 'View team progress and milestones',
    usage: '/progress [team_name]',
    roleRequired: ['builder', 'mentor', 'lead'],
    category: 'team'
  }
];

const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case 'lead': return <Crown className="h-3 w-3 text-purple-400" />;
    case 'mentor': return <Shield className="h-3 w-3 text-green-400" />;
    case 'builder': return <Zap className="h-3 w-3 text-blue-400" />;
    default: return <User className="h-3 w-3 text-gray-400" />;
  }
};

const getRoleColor = (role: UserRole) => {
  switch (role) {
    case 'lead': return 'text-purple-400';
    case 'mentor': return 'text-green-400';
    case 'builder': return 'text-blue-400';
    default: return 'text-gray-400';
  }
};

export const SuperOracle = ({ selectedRole, teamId }: SuperOracleProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ full_name: string; role: string; id: string }[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<{ full_name: string; role: string; id: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch available users for mentions
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .not('full_name', 'is', null);
      
      if (data) {
        setAvailableUsers(data.map(user => ({
          id: user.id,
          full_name: user.full_name || 'Unknown',
          role: user.role || 'guest'
        })));
      }
    };
    
    fetchUsers();
  }, []);

  // Subscribe to broadcast messages
  useEffect(() => {
    const broadcastSubscription = supabase
      .channel('broadcast-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_role=eq.lead`
        },
        async (payload) => {
          const message = payload.new;
          
          // Check if message is a broadcast (simple check for broadcast prefix)
          if (message.content?.startsWith('📢 BROADCAST')) {
            const broadcastMessage: ChatMessage = {
              id: message.id,
              type: 'system',
              content: `📢 **Broadcast Message**\n\n${message.content}\n\n*From: ${message.sender_role}*`,
              timestamp: message.created_at,
              author: {
                name: message.sender_role === selectedRole ? 'You' : `${message.sender_role} User`,
                role: message.sender_role,
                avatar: '📢'
              },
              metadata: {
                command: message.command,
                sources: message.sources,
                resources: message.resources
              }
            };

            setMessages(prev => [...prev, broadcastMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastSubscription);
    };
  }, [teamId, selectedRole]);

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'oracle',
      content: `🛸 **Welcome to the PieFi Oracle, ${profile?.full_name || 'Explorer'}!**

I'm your intelligent AI companion with enhanced communication powers! I can:

✨ **Answer questions** with context about your team and progress
💬 **Send messages** to teammates or entire roles
📝 **Log updates** and track your development journey
👥 **Connect people** based on skills and expertise  
⚡ **Execute commands** with natural language or slash commands

**🎯 Try these messaging examples:**
• \`/chat Hello team! How's the MVP coming along?\`
• \`/message builders Great work on the frontend!\`
• \`/update Completed user auth system today\`
• "Send builders that the design is ready"
• "Update: Fixed the login bug"

**📚 And resource examples:**
• \`/resources react hooks\`
• \`/find someone who knows backend\`
• "I need help with database design"

The Oracle is now your communication hub + knowledge assistant!`,
      timestamp: new Date().toISOString(),
      author: {
        name: 'Oracle',
        role: 'guest' as UserRole,
        avatar: '🛸'
      },
      metadata: {
        confidence: 100
      }
    };
    setMessages([welcomeMessage]);
  }, [profile]);

  const parseMessage = (text: string) => {
    const mentions = text.match(/@(\w+)/g) || [];
    const commands = text.match(/\/(\w+)/g) || [];
    
    return {
      mentions: mentions.map(m => m.slice(1)),
      commands: commands.map(c => c.slice(1)),
      hasSlashCommand: text.startsWith('/')
    };
  };

  const executeSlashCommand = async (command: string, args: string[]) => {
    const cmd = SLASH_COMMANDS.find(c => c.command === `/${command}`);
    
    if (!cmd) {
      return {
        success: false,
        message: `Unknown command: /${command}. Type /help to see available commands.`
      };
    }

    if (!cmd.roleRequired.includes(selectedRole)) {
      return {
        success: false,
        message: `You don't have permission to use /${command}. Required roles: ${cmd.roleRequired.join(', ')}`
      };
    }

    try {
      switch (command) {
        case 'help':
          const availableCommands = SLASH_COMMANDS.filter(c => c.roleRequired.includes(selectedRole));
          const categorizedCommands = availableCommands.reduce((acc, cmd) => {
            if (!acc[cmd.category]) acc[cmd.category] = [];
            acc[cmd.category].push(cmd);
            return acc;
          }, {} as Record<string, SlashCommand[]>);
          
          let helpMessage = `**🛸 Oracle Command Center - ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Commands**\n\n`;
          
          Object.entries(categorizedCommands).forEach(([category, commands]) => {
            const categoryEmoji = {
              'oracle': '🔮',
              'team': '👥',
              'user': '🧑',
              'admin': '⚡'
            }[category] || '📋';
            
            helpMessage += `**${categoryEmoji} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands:**\n`;
            commands.forEach(cmd => {
              helpMessage += `• \`${cmd.command}\` - ${cmd.description}\n  *Usage:* ${cmd.usage}\n\n`;
            });
          });
          
          helpMessage += `**💡 Pro Tips:**\n• Use @username to mention team members\n• Ask natural language questions\n• The Oracle remembers your context and role\n• Try asking "Who can help me with [skill]?"`;
          
          return {
            success: true,
            message: helpMessage
          };

        case 'status':
          if (args.length === 0) {
            // Show current user/team status
            const { data: teamData } = await supabase
              .from('teams')
              .select('*, team_status(*)')
              .eq('id', teamId)
              .single();
            
            return {
              success: true,
              message: `**Team Status:**\n${teamData?.name}: ${teamData?.team_status?.[0]?.current_status || 'No status set'}`
            };
          }
          break;

        case 'find':
          const skill = args.join(' ');
          const { data: profiles } = await supabase
            .from('profiles')
            .select('full_name, role, skills, help_needed, experience_level')
            .or(`skills.cs.{${skill}},help_needed.cs.{${skill}},experience_level.ilike.%${skill}%`);
          
          if (profiles && profiles.length > 0) {
            return {
              success: true,
              message: `**🔍 Found ${profiles.length} people related to "${skill}":**\n\n${profiles.map(p => 
                `• **${p.full_name}** (${p.role})\n  💪 Skills: ${p.skills?.join(', ') || 'None listed'}\n  🤝 Can help with: ${p.help_needed?.join(', ') || 'Not specified'}\n  📊 Experience: ${p.experience_level || 'Not specified'}`
              ).join('\n\n')}\n\n💡 *Tip: Use @username to message them directly!*`
            };
          } else {
            return {
              success: true,
              message: `❌ No team members found related to "${skill}". Try different keywords or ask the Oracle for alternative approaches.`
            };
          }

        case 'connect':
          const challenge = args.join(' ');
          const { data: helpProfiles } = await supabase
            .from('profiles')
            .select('full_name, role, skills, bio, experience_level')
            .not('skills', 'is', null);
          
          if (helpProfiles && helpProfiles.length > 0) {
            const relevantPeople = helpProfiles.filter(p => 
              p.skills?.some(skill => 
                challenge.toLowerCase().includes(skill.toLowerCase()) ||
                skill.toLowerCase().includes(challenge.toLowerCase())
              ) || 
              p.bio?.toLowerCase().includes(challenge.toLowerCase())
            ).slice(0, 3);
            
            if (relevantPeople.length > 0) {
              return {
                success: true,
                message: `**🤝 People who can help with "${challenge}":**\n\n${relevantPeople.map(p => 
                  `• **@${p.full_name}** (${p.role})\n  💪 Relevant skills: ${p.skills?.filter(s => 
                    challenge.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(challenge.toLowerCase())
                  ).join(', ')}\n  📝 Bio: ${p.bio || 'No bio available'}`
                ).join('\n\n')}\n\n🚀 *Reach out to them using @mentions or /message command!*`
              };
            }
          }
          
          return {
            success: true,
            message: `🤔 No direct matches found for "${challenge}". Try asking the Oracle: "Who has experience with [specific technology/skill]?" or use broader terms.`
          };

        case 'progress':
          const teamName = args.join(' ');
          let teamQuery = supabase
            .from('teams')
            .select(`
              name, stage, description,
              team_status(current_status, last_update),
              updates(content, created_at, type)
            `);
          
          if (teamName) {
            teamQuery = teamQuery.ilike('name', `%${teamName}%`);
          } else if (teamId) {
            teamQuery = teamQuery.eq('id', teamId);
          }
          
          const { data: teamData } = await teamQuery;
          
          if (teamData && teamData.length > 0) {
            const team = teamData[0];
            const recentUpdates = team.updates?.slice(0, 3) || [];
            
            return {
              success: true,
              message: `**📊 Progress Report: ${team.name}**\n\n🎯 **Stage:** ${team.stage}\n📝 **Current Status:** ${team.team_status?.[0]?.current_status || 'No status set'}\n🕐 **Last Update:** ${team.team_status?.[0]?.last_update ? new Date(team.team_status[0].last_update).toLocaleDateString() : 'Never'}\n\n**📋 Recent Updates:**\n${recentUpdates.map(u => 
                `• ${u.content} (${new Date(u.created_at).toLocaleDateString()})`
              ).join('\n') || 'No recent updates'}\n\n💡 *Use /update to log new progress!*`
            };
          } else {
            return {
              success: true,
              message: `❌ No team found${teamName ? ` matching "${teamName}"` : ''}. Make sure you're part of a team or specify the correct team name.`
            };
          }

        case 'resources':
          const topic = args.join(' ');
          // Generate contextual resources through Oracle
          const resourceResponse = await supabase.functions.invoke('super-oracle', {
            body: {
              query: `I need curated resources and tutorials for: ${topic}`,
              role: selectedRole,
              teamId,
              userId: profile?.id,
              userProfile: profile,
              contextRequest: { 
                needsResources: true, 
                resourceTopic: topic,
                needsTeamContext: !!teamId,
                needsPersonalization: true
              }
            }
          });
          
          if (resourceResponse.data?.resources && resourceResponse.data.resources.length > 0) {
            const resources = resourceResponse.data.resources;
            return {
              success: true,
              message: `**📚 Curated Resources for "${topic}":**\n\n${resources.map((r: any, idx: number) => 
                `${idx + 1}. **[${r.title}](${r.url})** (${r.type})\n   ${r.description}\n   ⭐ Relevance: ${Math.round(r.relevance * 100)}%`
              ).join('\n\n')}\n\n💡 *These resources are personalized based on your role, skills, and project context.*`
            };
          } else {
            return {
              success: true,
              message: `🔍 No specific resources found for "${topic}". The Oracle is working on expanding the resource database. Try:\n\n• More specific technical terms (e.g., "React hooks" instead of "React")\n• Different variations ("API development", "REST APIs", "GraphQL")\n• Ask natural language questions like "How do I learn Python for data science?"`
            };
          }

        case 'update':
          if (teamId) {
            const updateContent = args.join(' ');
            const { error } = await supabase
              .from('updates')
              .insert({
                team_id: teamId,
                content: updateContent,
                type: 'daily',
                created_by: profile?.id
              });
            
            if (!error) {
              // Also update team status
              const { error: statusError } = await supabase
                .from('team_status')
                .update({
                  current_status: updateContent.substring(0, 200),
                  last_update: new Date().toISOString()
                })
                .eq('team_id', teamId);
              
              if (statusError) {
                console.error('Failed to update team status:', statusError);
              }
              
              return {
                success: true,
                message: `✅ **Update Logged Successfully!**\n\n📝 **Content:** "${updateContent}"\n🕐 **Timestamp:** ${new Date().toLocaleString()}\n📊 **Status Updated:** Team dashboard refreshed\n\n💡 *Your team members and mentors can now see this update.*`
              };
            } else {
              return {
                success: false,
                message: `❌ Failed to log update: ${error.message}`
              };
            }
          } else {
            return {
              success: false,
              message: `❌ No team assigned. You need to be part of a team to log updates.`
            };
          }

        case 'chat':
          const teamMessage = args.join(' ');
          if (!teamMessage) {
            return {
              success: false,
              message: `❌ Please provide a message. Usage: /chat your message to the team`
            };
          }
          
          if (!teamId) {
            return {
              success: false,
              message: `❌ No team assigned. You need to be part of a team to use team chat.`
            };
          }
          
          // Send team chat message
          const { error: chatError } = await supabase
            .from('messages')
            .insert({
              sender_id: profile?.id,
              sender_role: selectedRole,
              receiver_role: 'builder', // Team messages target builders by default
              content: `💬 **Team Chat:** ${teamMessage}`,
              team_id: teamId
            });
          
          if (!chatError) {
            return {
              success: true,
              message: `✅ **Team Message Sent!**\n\n💬 **Content:** "${teamMessage}"\n👥 **Recipients:** All team members\n📱 **Delivery:** Available in Team Room and Messages\n\n💡 *Your team can see this in the Team Room tab.*`
            };
          } else {
            return {
              success: false,
              message: `❌ Failed to send team message: ${chatError.message}`
            };
          }

        case 'message':
          // Enhanced message command for both @mentions and role targeting
          const firstArg = args[0] || '';
          let targetMatch = '';
          let messageContent = '';
          
          if (firstArg.startsWith('@')) {
            // @mention format: /message @username your message
            targetMatch = firstArg.slice(1);
            messageContent = args.slice(1).join(' ');
          } else if (['builders', 'mentors', 'leads', 'guests'].includes(firstArg.toLowerCase())) {
            // Role targeting: /message builders hello everyone
            const targetRole = firstArg.toLowerCase().slice(0, -1); // Remove 's'
            messageContent = args.slice(1).join(' ');
            
            if (!messageContent) {
              return {
                success: false,
                message: `❌ Please provide a message. Usage: /message ${firstArg} your message`
              };
            }
            
            // Send to all users of that role
            const { error } = await supabase
              .from('messages')
              .insert({
                sender_id: profile?.id,
                sender_role: selectedRole,
                receiver_role: targetRole as UserRole,
                content: `📢 **From ${selectedRole}:** ${messageContent}`,
                team_id: teamId
              });
            
            if (!error) {
              return {
                success: true,
                message: `✅ **Message Sent to All ${firstArg}!**\n\n💬 **Content:** "${messageContent}"\n👥 **Recipients:** All ${firstArg} in the program\n📧 **Delivery:** Message delivered to their inboxes\n\n💡 *They will see this in their messaging center.*`
              };
            } else {
              return {
                success: false,
                message: `❌ Failed to send message: ${error.message}`
              };
            }
          } else {
            return {
              success: false,
              message: `❌ Invalid format. Use:\n• \`/message @username your message\` for specific users\n• \`/message builders your message\` for all builders\n• \`/message mentors your message\` for all mentors`
            };
          }
          
          if (!targetMatch || !messageContent) {
            return {
              success: false,
              message: `❌ Invalid message format. Use: /message @username your message content`
            };
          }
          
          // Find the target user
          const { data: targetUser, error: userError } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .ilike('full_name', `%${targetMatch}%`)
            .maybeSingle();
          
          if (userError) {
            return {
              success: false,
              message: `❌ Error finding user: ${userError.message}`
            };
          }
          
          if (targetUser) {
            const { error } = await supabase
              .from('messages')
              .insert({
                sender_id: profile?.id,
                sender_role: selectedRole,
                receiver_id: targetUser.id,
                receiver_role: targetUser.role,
                content: messageContent,
                team_id: teamId
              });
            
            if (!error) {
              return {
                success: true,
                message: `✅ **Message Sent Successfully!**\n\n👤 **To:** ${targetUser.full_name} (${targetUser.role})\n💬 **Content:** "${messageContent}"\n📧 **Delivery:** Message delivered to their inbox\n\n💡 *They will see this message in their Oracle or messaging center.*`
              };
            } else {
              return {
                success: false,
                message: `❌ Failed to send message: ${error.message}`
              };
            }
          } else {
            return {
              success: false,
              message: `❌ User "${targetMatch}" not found. Try using their exact name or check spelling.`
            };
          }

        case 'analyze':
          if (selectedRole === 'mentor' || selectedRole === 'lead') {
            const target = args.join(' ') || 'overall';
            
            if (target === 'overall') {
              // Get overall program analytics
              const { data: allTeams } = await supabase
                .from('teams')
                .select(`
                  name, stage, created_at,
                  team_status(current_status, last_update),
                  updates(created_at, type)
                `);
              
              if (allTeams) {
                const totalTeams = allTeams.length;
                const stageDistribution = allTeams.reduce((acc, team) => {
                  acc[team.stage] = (acc[team.stage] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                
                const activeTeams = allTeams.filter(team => 
                  team.team_status?.[0]?.last_update && 
                  new Date(team.team_status[0].last_update) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length;
                
                const avgUpdatesPerTeam = allTeams.reduce((acc, team) => acc + (team.updates?.length || 0), 0) / totalTeams;
                
                return {
                  success: true,
                  message: `**📊 Overall Program Analysis**\n\n🏢 **Program Overview:**\n• Total Teams: ${totalTeams}\n• Active Teams (last 7 days): ${activeTeams}\n• Activity Rate: ${Math.round((activeTeams/totalTeams)*100)}%\n\n🎯 **Stage Distribution:**\n${Object.entries(stageDistribution).map(([stage, count]) => 
                    `• ${stage.charAt(0).toUpperCase() + stage.slice(1)}: ${count} teams (${Math.round((count/totalTeams)*100)}%)`
                  ).join('\n')}\n\n📈 **Engagement Metrics:**\n• Average Updates per Team: ${avgUpdatesPerTeam.toFixed(1)}\n• Teams needing attention: ${totalTeams - activeTeams}\n\n💡 *Use /analyze @teamname for specific team insights.*`
                };
              }
            } else {
              // Analyze specific team
              const { data: teamAnalysis } = await supabase
                .from('teams')
                .select(`
                  name, stage, created_at, description,
                  team_status(current_status, last_update, pending_actions),
                  updates(content, created_at, type, created_by),
                  profiles!profiles_team_id_fkey(full_name, role, skills, last_login:updated_at)
                `)
                .ilike('name', `%${target}%`)
                .single();
              
              if (teamAnalysis) {
                const daysSinceLastUpdate = teamAnalysis.team_status?.[0]?.last_update 
                  ? Math.floor((Date.now() - new Date(teamAnalysis.team_status[0].last_update).getTime()) / (1000 * 60 * 60 * 24))
                  : 999;
                
                const recentUpdates = teamAnalysis.updates?.filter(u => 
                  new Date(u.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length || 0;
                
                const teamMembers = teamAnalysis.profiles?.length || 0;
                
                let healthScore = 100;
                if (daysSinceLastUpdate > 7) healthScore -= 30;
                if (recentUpdates < 3) healthScore -= 20;
                if (teamMembers < 2) healthScore -= 25;
                
                const healthStatus = healthScore >= 80 ? '🟢 Excellent' : 
                                   healthScore >= 60 ? '🟡 Good' : 
                                   healthScore >= 40 ? '🟠 Needs Attention' : '🔴 Critical';
                
                return {
                  success: true,
                  message: `**📊 Team Analysis: ${teamAnalysis.name}**\n\n🎯 **Team Health Score:** ${healthScore}/100 ${healthStatus}\n\n📈 **Key Metrics:**\n• Stage: ${teamAnalysis.stage}\n• Team Size: ${teamMembers} members\n• Days Since Last Update: ${daysSinceLastUpdate}\n• Weekly Updates: ${recentUpdates}\n\n👥 **Team Composition:**\n${teamAnalysis.profiles?.map(p => 
                    `• ${p.full_name} (${p.role}) - ${p.skills?.slice(0,2).join(', ') || 'No skills listed'}`
                  ).join('\n') || 'No members found'}\n\n🚨 **Recommendations:**\n${daysSinceLastUpdate > 7 ? '• Encourage regular updates\n' : ''}${recentUpdates < 3 ? '• Increase communication frequency\n' : ''}${teamMembers < 2 ? '• Consider team expansion\n' : ''}${healthScore >= 80 ? '• Team is performing excellently!' : ''}`
                };
              } else {
                return {
                  success: false,
                  message: `❌ Team "${target}" not found. Use /analyze overall for program-wide analysis.`
                };
              }
            }
          } else {
            return {
              success: false,
              message: `❌ Analysis command requires mentor or lead privileges.`
            };
          }

        case 'broadcast':
          if (selectedRole === 'lead') {
            const announcement = args.join(' ');
            if (!announcement) {
              return {
                success: false,
                message: `❌ Please provide an announcement message. Usage: /broadcast your message`
              };
            }
            
            // Get all team members
            const { data: allProfiles } = await supabase
              .from('profiles')
              .select('id, role, team_id');
            
            if (allProfiles) {
              const broadcasts = allProfiles.map(profile => ({
                sender_id: profile?.id,
                sender_role: selectedRole,
                receiver_id: profile.id,
                receiver_role: profile.role,
                content: `📢 **PROGRAM ANNOUNCEMENT**\n\n${announcement}\n\n*From Program Leadership*`,
                team_id: profile.team_id
              }));
              
              const { error } = await supabase
                .from('messages')
                .insert(broadcasts);
              
              if (!error) {
                // Also log as a system update
                await supabase
                  .from('updates')
                  .insert({
                    team_id: teamId || '00000000-0000-0000-0000-000000000000',
                    content: `BROADCAST: ${announcement}`,
                    type: 'milestone' as any,
                    created_by: profile?.id
                  });
                
                return {
                  success: true,
                  message: `✅ **Broadcast Sent Successfully!**\n\n📢 **Announcement:** "${announcement}"\n👥 **Recipients:** ${allProfiles.length} program participants\n📧 **Delivery:** All participants notified\n📝 **Logged:** Announcement recorded in system\n\n💡 *All team members will see this announcement in their Oracle and messaging systems.*`
                };
              } else {
                return {
                  success: false,
                  message: `❌ Failed to send broadcast: ${error.message}`
                };
              }
            }
          } else {
            return {
              success: false,
              message: `❌ Broadcast command requires lead privileges.`
            };
          }

        default:
          return {
            success: false,
            message: `❌ **Command Not Found**\n\nUnknown command: \`/${command}\`\n\n💡 Use \`/help\` to see all available commands for your role (${selectedRole}).`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Error executing command: ${error.message}`
      };
    }

    return {
      success: false,
      message: `Failed to execute /${command}`
    };
  };

  const queryOracle = async (query: string) => {
    try {
      const response = await supabase.functions.invoke('super-oracle', {
        body: {
          query,
          role: selectedRole,
          teamId,
          userId: profile?.id,
          userProfile: profile,
          contextRequest: {
            needsResources: true,
            needsMentions: true, // Always request mentions for enhanced responses
            needsTeamContext: true,
            needsPersonalization: true
          }
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Oracle function error');
      }

      if (!response.data) {
        throw new Error('No response data from Oracle');
      }

      return response.data;
    } catch (error) {
      console.error('Oracle query error:', error);
      throw error;
    }
  };

  const handleMentionSelect = (user: { full_name: string; role: string; id: string }) => {
    const currentCursorPos = inputRef.current?.selectionStart || 0;
    const beforeCursor = message.substring(0, currentCursorPos);
    const afterCursor = message.substring(currentCursorPos);
    
    // Find the @ symbol before cursor
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const newMessage = beforeCursor.substring(0, lastAtIndex + 1) + user.full_name + ' ' + afterCursor;
      setMessage(newMessage);
    }
    
    setShowMentions(false);
    setFilteredUsers([]);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Check for @ mentions
    const cursorPos = e.target.selectionStart || 0;
    const beforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    
    if (lastAtIndex >= 0 && lastAtIndex === cursorPos - 1) {
      // Just typed @
      setShowMentions(true);
      setFilteredUsers(availableUsers);
    } else if (lastAtIndex >= 0) {
      const searchTerm = beforeCursor.substring(lastAtIndex + 1);
      if (searchTerm && !searchTerm.includes(' ')) {
        const filtered = availableUsers.filter(user => 
          user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredUsers(filtered);
        setShowMentions(filtered.length > 0);
      } else {
        setShowMentions(false);
        setFilteredUsers([]);
      }
    } else {
      setShowMentions(false);
      setFilteredUsers([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    setShowMentions(false);
    setFilteredUsers([]);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      author: {
        name: profile?.full_name || 'You',
        role: selectedRole,
        avatar: profile?.avatar_url
      }
    };

    // Check for broadcast command
    const broadcastMatch = message.match(/^broadcast(?:\s+to\s+(all|team|role)\s+)?:\s*(.+)$/i);
    if (broadcastMatch) {
      const [_, targetType = 'all', content] = broadcastMatch;
      try {
        const { error } = await supabase.from('messages').insert({
          sender_id: profile?.id || 'anonymous',
          sender_role: selectedRole,
          receiver_role: 'guest', // Send to all as guest role for broadcasts
          content: `📢 BROADCAST (${targetType}): ${content.trim()}`,
          team_id: targetType === 'team' ? teamId : null
        });

        if (error) throw error;

        const systemMessage: ChatMessage = {
          id: Date.now().toString() + '_broadcast',
          type: 'system',
          content: `✅ Broadcast sent to ${targetType}: "${content.trim()}"`,
          timestamp: new Date().toISOString(),
          author: {
            name: 'System',
            role: 'guest',
            avatar: '📢'
          }
        };

        setMessages(prev => [...prev, userMessage, systemMessage]);
        setMessage("");
        return;
      } catch (error) {
        console.error('Broadcast error:', error);
        toast({
          title: "Broadcast Error",
          description: "Failed to send broadcast message. Please try again.",
          variant: "destructive"
        });
      }
    }

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = message;
    setMessage("");
    setIsLoading(true);

    try {
      const parsed = parseMessage(currentMessage);
      
      // Handle slash commands
      if (parsed.hasSlashCommand) {
        const [command, ...args] = currentMessage.slice(1).split(' ');
        const result = await executeSlashCommand(command, args);
        
        const systemMessage: ChatMessage = {
          id: Date.now().toString() + '_system',
          type: 'system',
          content: result.message,
          timestamp: new Date().toISOString(),
          author: {
            name: 'System',
            role: 'guest' as UserRole,
            avatar: '⚡'
          },
          metadata: {
            command: `/${command}`,
            confidence: result.success ? 100 : 0
          }
        };
        
        setMessages(prev => [...prev, systemMessage]);
        return;
      }

      // Check for natural language messaging/update intents
      const messageIntent = currentMessage.match(/^(?:send|message|tell)\s+(.+?)\s+(?:that|:)\s+(.+)$/i);
      const updateIntent = currentMessage.match(/^(?:update|log|record):\s*(.+)$/i);
      
      if (messageIntent) {
        const [_, target, content] = messageIntent;
        const result = await executeSlashCommand('message', [target, ...content.split(' ')]);
        
        const responseMessage: ChatMessage = {
          id: Date.now().toString() + '_auto_message',
          type: result.success ? 'oracle' : 'system',
          content: result.message,
          timestamp: new Date().toISOString(),
          author: {
            name: 'Oracle Assistant',
            role: 'guest' as UserRole,
            avatar: '📨'
          },
          metadata: {
            command: 'auto-message',
            confidence: result.success ? 95 : 50
          }
        };
        
        setMessages(prev => [...prev, responseMessage]);
        return;
      }
      
      if (updateIntent) {
        const [_, updateContent] = updateIntent;
        const result = await executeSlashCommand('update', updateContent.split(' '));
        
        const responseMessage: ChatMessage = {
          id: Date.now().toString() + '_auto_update',
          type: result.success ? 'oracle' : 'system',
          content: result.message,
          timestamp: new Date().toISOString(),
          author: {
            name: 'Oracle Assistant',
            role: 'guest' as UserRole,
            avatar: '📝'
          },
          metadata: {
            command: 'auto-update',
            confidence: result.success ? 95 : 50
          }
        };
        
        setMessages(prev => [...prev, responseMessage]);
        return;
      }

      // Query the Oracle for intelligent response
      const oracleResponse = await queryOracle(currentMessage);
      
      const oracleMessage: ChatMessage = {
        id: Date.now().toString() + '_oracle',
        type: 'oracle',
        content: oracleResponse.answer,
        timestamp: new Date().toISOString(),
        author: {
          name: 'Oracle',
          role: 'guest' as UserRole,
          avatar: '🛸'
        },
        metadata: {
          sources: oracleResponse.sources,
          confidence: oracleResponse.confidence || 95,
          stage: oracleResponse.detected_stage
        },
        sections: {
          answer: oracleResponse.answer,
          resources: oracleResponse.resources || [],
          actions: oracleResponse.next_actions || [],
          mentions: parsed.mentions
        }
      };

      setMessages(prev => [...prev, oracleMessage]);

    } catch (error) {
      console.error('Oracle error:', error);
      
      // Create a more informative error message
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '_error',
        type: 'system',
        content: `⚠️ **Oracle Temporarily Unavailable**

I'm experiencing some technical difficulties, but don't worry - I'm working on it! 

**🔧 What you can try:**
• Rephrase your question in simpler terms
• Try asking for specific resources like "I need React tutorials"
• Use slash commands like \`/help\` or \`/resources python\`
• Check back in a moment - I usually recover quickly

**💡 The issue might be:**
• Network connectivity
• High server load
• Temporary service maintenance

I'll be back to full functionality soon! In the meantime, feel free to explore the available slash commands.`,
        timestamp: new Date().toISOString(),
        author: {
          name: 'System',
          role: 'guest' as UserRole,
          avatar: '⚠️'
        },
        metadata: {
          confidence: 0
        }
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Oracle Connection Issue",
        description: "The Oracle is temporarily unavailable. Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.type === 'user';
    const isSystem = msg.type === 'system';
    const isOracle = msg.type === 'oracle';
    
    return (
      <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} mb-4`}>
        <Avatar className="h-8 w-8">
          {msg.author?.avatar?.startsWith('http') ? (
            <AvatarImage src={msg.author.avatar} alt={msg.author.name} />
          ) : (
            <AvatarFallback className={`text-xs ${
              isOracle ? 'bg-primary/20 text-primary' : 
              isSystem ? 'bg-orange-500/20 text-orange-500' : 
              'bg-blue-500/20 text-blue-500'
            }`}>
              {msg.author?.avatar || msg.author?.name?.charAt(0) || '?'}
            </AvatarFallback>
          )}
        </Avatar>
        
        <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
          <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : ''}`}>
            <span className={`text-sm font-medium ${
              isOracle ? 'text-primary' : 
              isSystem ? 'text-orange-500' : 
              getRoleColor(msg.author?.role || 'guest')
            }`}>
              {msg.author?.name}
            </span>
            {!isOracle && !isSystem && getRoleIcon(msg.author?.role || 'guest')}
            {isSystem && msg.metadata?.command && (
              <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-500 border-orange-500/20">
                Command Response
              </Badge>
            )}
            {isOracle && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                Oracle AI
              </Badge>
            )}
            {msg.metadata?.confidence && !isSystem && (
              <Badge variant="outline" className="text-xs">
                {msg.metadata.confidence}% confidence
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <div className={`rounded-lg p-3 ${
            isUser 
              ? 'bg-primary text-primary-foreground ml-8' 
              : isSystem 
                ? 'bg-orange-500/10 border border-orange-500/20' 
                : 'bg-muted/50 mr-8'
          }`}>
            <ReactMarkdown
              components={{
                h1: ({...props}) => <h3 className="font-semibold text-base mb-2" {...props} />,
                h2: ({...props}) => <h4 className="font-medium text-sm mb-1" {...props} />,
                ul: ({...props}) => <ul className="list-disc pl-4 space-y-1 mb-2" {...props} />,
                ol: ({...props}) => <ol className="list-decimal pl-4 space-y-1 mb-2" {...props} />,
                strong: ({...props}) => <strong className="font-semibold" {...props} />,
                p: ({...props}) => <p className="mb-2 text-sm leading-relaxed" {...props} />,
                code: ({...props}) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props} />,
              }}
            >
              {msg.content}
            </ReactMarkdown>
            
            {/* Resources */}
            {msg.sections?.resources && msg.sections.resources.length > 0 && (
              <div className="mt-3 space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Recommended Resources
                </h4>
                {msg.sections.resources.map((resource, idx) => (
                  <div key={idx} className="p-2 rounded bg-background/50 border">
                    <div className="flex items-center gap-2 mb-1">
                      {resource.type === 'youtube' && <Play className="h-4 w-4 text-red-500" />}
                      {resource.type === 'article' && <LinkIcon className="h-4 w-4 text-blue-500" />}
                      <span className="text-sm font-medium">{resource.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{resource.description}</p>
                    <Button variant="outline" size="sm" className="text-xs" asChild>
                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                        Open Resource
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Command Indicator */}
            {msg.metadata?.command && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                Command: {msg.metadata.command}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[600px] max-w-4xl mx-auto">
      <Card className="flex-1 flex flex-col glow-border bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20 ufo-pulse">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-glow">PieFi Oracle</h2>
              <p className="text-sm text-muted-foreground">
                Your intelligent AI companion for the incubator
              </p>
            </div>
            <Badge className="bg-primary/20 text-primary border-primary/30">
              {selectedRole} Mode
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="flex-1 flex flex-col p-4">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map(renderMessage)}
              {isLoading && (
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>🛸</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Oracle is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="mt-4 space-y-3">
            <Separator />
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setMessage('/help')}
                className="text-xs"
              >
                <Hash className="h-3 w-3 mr-1" />
                Commands
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setMessage('/chat Hello team! How is everyone doing?')}
                className="text-xs"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Team Chat
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setMessage('/update Made good progress on the MVP today')}
                className="text-xs"
              >
                <Activity className="h-3 w-3 mr-1" />
                Log Update
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setMessage('/message builders Hey everyone, great work this week!')}
                className="text-xs"
              >
                <Users className="h-3 w-3 mr-1" />
                Message All
              </Button>
            </div>
            
            {/* Message Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={message}
                  onChange={handleInputChange}
                  placeholder="Ask questions, send messages, log updates, or use /commands..."
                  className="pl-10 bg-background/50 border-primary/20 focus:border-primary/50"
                  disabled={isLoading}
                />
                
                {/* Mentions Dropdown */}
                {showMentions && filteredUsers.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                    {filteredUsers.slice(0, 5).map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 text-sm"
                        onClick={() => handleMentionSelect(user)}
                      >
                        <div className="flex items-center gap-2">
                          {getRoleIcon(user.role as UserRole)}
                          <span className="font-medium">{user.full_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button 
                type="submit" 
                disabled={isLoading || !message.trim()}
                className="ufo-gradient hover:opacity-90"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            
            <p className="text-xs text-muted-foreground text-center">
              Type <code>/help</code> for commands • Use <code>/chat</code> for team messages • 
              Say "send [role] that [message]" for natural messaging • <code>/update</code> to log progress
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};