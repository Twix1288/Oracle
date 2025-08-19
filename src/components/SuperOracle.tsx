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
  Loader2
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
    personality?: 'helpful' | 'excited' | 'focused' | 'wise';
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
    usage: '/message @target your message',
    roleRequired: ['mentor', 'lead'],
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
  const [isTyping, setIsTyping] = useState(false);
  const [oraclePersonality, setOraclePersonality] = useState<'helpful' | 'excited' | 'focused' | 'wise'>('helpful');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  // Online users simulation (could be enhanced with real-time presence)
  const [onlineUsers] = useState([
    { name: 'Alex Chen', role: 'builder', status: 'coding' },
    { name: 'Sarah Kim', role: 'mentor', status: 'mentoring' },
    { name: 'Mike Johnson', role: 'lead', status: 'reviewing' }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getOracleAvatar = (personality: typeof oraclePersonality) => {
    switch (personality) {
      case 'excited': return '🤩';
      case 'focused': return '🔍';
      case 'wise': return '🧙‍♂️';
      default: return '🛸';
    }
  };

  // Send mention notifications
  const sendMentionNotifications = async (mentions: string[], messageContent: string) => {
    if (mentions.length === 0) return;

    try {
      for (const mentionedName of mentions) {
        // Find the user by name
        const { data: mentionedUser } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .ilike('full_name', `%${mentionedName}%`)
          .single();

        if (mentionedUser && mentionedUser.id !== profile?.id) {
          // Send mysterious notification message
          const mysteriousMessages = [
            `🌟 **Something interesting happened...**\n\n*Someone was talking about you in the Oracle. They seem to think you'd be perfect for something important.*\n\n**Curious?** Ask around to find out what's brewing! 🕵️‍♂️`,
            `👁️ **Your name came up...**\n\n*Word is spreading about your skills. Someone just mentioned you in a conversation that could change everything.*\n\n**Want to know more?** Time to do some detective work! 🔍`,
            `⚡ **The Oracle whispers your name...**\n\n*A mysterious conversation just happened, and somehow you were at the center of it. Interesting things are in motion.*\n\n**Intrigued?** Better reach out and see what's happening! 🤔`,
            `🎭 **Plot twist: You're involved**\n\n*Someone just brought you up in a conversation that could be very relevant to your journey. The universe works in mysterious ways.*\n\n**Need answers?** Time to connect the dots! 🧩`
          ];
          
          const randomMessage = mysteriousMessages[Math.floor(Math.random() * mysteriousMessages.length)];
          
          await supabase
            .from('messages')
            .insert({
              sender_id: 'oracle-system',
              sender_role: 'guest',
              receiver_id: mentionedUser.id,
              receiver_role: mentionedUser.role,
              content: randomMessage,
              team_id: teamId
            });

          toast({
            title: "Mention Sent! 🎯",
            description: `${mentionedUser.full_name} has been notified`,
          });
        }
      }
    } catch (error) {
      console.error('Error sending mention notifications:', error);
    }
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

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'oracle',
      content: `🛸 **Welcome to the PieFi Oracle, ${profile?.full_name || 'Explorer'}!**\n\nI'm your intelligent AI companion, ready to help you navigate your journey. I can:\n\n✨ **Answer questions** with context about your team and progress\n🔍 **Find resources** tailored to your specific project and needs\n👥 **Connect you** with teammates based on skills and expertise\n⚡ **Execute commands** to update progress, send messages, and more\n\nTry asking me anything or use slash commands like \`/help\` to get started!`,
      timestamp: new Date().toISOString(),
      author: {
        name: 'Oracle',
        role: 'guest' as UserRole,
        avatar: '🛸'
      },
      metadata: {
        confidence: 100,
        personality: 'helpful'
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
              query: `Generate curated resources for: ${topic}`,
              role: selectedRole,
              teamId,
              userId: profile?.id,
              contextRequest: { needsResources: true, resourceTopic: topic }
            }
          });
          
          if (resourceResponse.data?.resources) {
            const resources = resourceResponse.data.resources;
            return {
              success: true,
              message: `**📚 Curated Resources for "${topic}":**\n\n${resources.map((r: any, idx: number) => 
                `${idx + 1}. **${r.title}** (${r.type})\n   ${r.description}\n   🔗 ${r.url}\n   ⭐ Relevance: ${Math.round(r.relevance * 100)}%`
              ).join('\n\n')}\n\n💡 *These resources are personalized based on your role and project context.*`
            };
          } else {
            return {
              success: true,
              message: `🔍 No specific resources found for "${topic}". Try more specific terms or ask the Oracle for guidance.`
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
              await supabase
                .from('team_status')
                .upsert({
                  team_id: teamId,
                  current_status: updateContent.substring(0, 200),
                  last_update: new Date().toISOString()
                });
              
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

        case 'message':
          const targetMatch = args[0]?.startsWith('@') ? args[0].slice(1) : args[0];
          const messageContent = args.slice(1).join(' ');
          
          if (!targetMatch || !messageContent) {
            return {
              success: false,
              message: `❌ Invalid message format. Use: /message @username your message content`
            };
          }
          
          // Find the target user
          const { data: targetUser } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .ilike('full_name', `%${targetMatch}%`)
            .single();
          
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
      throw new Error(response.error.message);
    }

    return response.data;
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

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = message;
    const parsed = parseMessage(currentMessage);
    setMessage("");
    setIsLoading(true);
    setIsTyping(true);

    // Send mention notifications for all messages
    if (parsed.mentions.length > 0) {
      await sendMentionNotifications(parsed.mentions, currentMessage);
    }

    try {
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
        setIsTyping(false);
        return;
      }

      // Change Oracle personality based on message content
      if (currentMessage.includes('help') || currentMessage.includes('stuck')) {
        setOraclePersonality('helpful');
      } else if (currentMessage.includes('amazing') || currentMessage.includes('great') || currentMessage.includes('awesome')) {
        setOraclePersonality('excited');
      } else if (currentMessage.includes('analyze') || currentMessage.includes('data')) {
        setOraclePersonality('focused');
      } else {
        setOraclePersonality('wise');
      }

      // Add typing delay for more human feel
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));

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
          avatar: getOracleAvatar(oraclePersonality)
        },
        metadata: {
          sources: oracleResponse.sources,
          confidence: oracleResponse.confidence || 95,
          stage: oracleResponse.detected_stage,
          personality: oraclePersonality
        },
        sections: {
          answer: oracleResponse.answer,
          resources: oracleResponse.resources || [],
          actions: oracleResponse.next_actions || [],
          mentions: parsed.mentions
        }
      };

      setMessages(prev => [...prev, oracleMessage]);

      // Show achievement notifications
      if (oracleResponse.confidence > 95) {
        toast({
          title: "🎯 Perfect Match!",
          description: "The Oracle found exactly what you need!",
        });
      }

    } catch (error) {
      console.error('Oracle error:', error);
      toast({
        title: "Oracle Connection Failed",
        description: "The Oracle is temporarily unavailable. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
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
    <div className="flex flex-col h-[700px] max-w-5xl mx-auto">
      {/* Enhanced Header */}
      <Card className="glow-border bg-card/50 backdrop-blur mb-4">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/20 ufo-pulse">
              <Bot className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl text-glow flex items-center gap-2">
                🛸 PieFi Super Oracle
                <Badge className="bg-primary/20 text-primary border-primary/30 pulse">
                  {selectedRole} Mode
                </Badge>
                {isLoading && (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Thinking...
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>💬 {messages.length} messages</span>
                <span>🟢 {onlineUsers.length} online</span>
                <span>🎯 Mentions enabled</span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-red-400" />
                  Oracle feeling {oraclePersonality}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCommands(!showCommands)}
                className="border-primary/30 hover:bg-primary/10"
              >
                <Hash className="h-4 w-4 mr-2" />
                Commands
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-green-500/30 hover:bg-green-500/10 text-green-400"
                title="Oracle Status: Online & Ready"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Commands Panel */}
      {showCommands && (
        <Card className="glow-border bg-card/50 backdrop-blur mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SLASH_COMMANDS.filter(cmd => cmd.roleRequired.includes(selectedRole)).map((cmd) => (
                <Button
                  key={cmd.command}
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage(cmd.usage)}
                  className="h-auto p-3 text-left flex flex-col items-start border-primary/20 hover:bg-primary/10"
                >
                  <div className="font-medium text-primary">{cmd.command}</div>
                  <div className="text-xs text-muted-foreground mt-1">{cmd.description}</div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Messages */}
      <ScrollArea className="flex-1 mb-4">
        <div className="space-y-4 p-4">
          {messages.map(renderMessage)}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 mb-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-primary animate-pulse">
                  🛸
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-primary">Oracle</span>
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 animate-pulse">
                    Connecting to the cosmic wisdom...
                  </Badge>
                </div>
                <div className="rounded-lg p-3 bg-muted/50 mr-8">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Enhanced Input */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary/60" />
                <Input
                  ref={inputRef}
                  value={message}
                  onChange={handleInputChange}
                  placeholder="Ask the Oracle, use /commands, or @mention users..."
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
              className="ufo-gradient hover:opacity-90 min-w-[120px] relative overflow-hidden"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Transmitting...
                </div>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to Oracle
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
                </>
              )}
            </Button>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setMessage('/help')}
                className="text-xs border-primary/30 hover:bg-primary/10"
              >
                <Hash className="h-3 w-3 mr-1" />
                Help
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setMessage('/find React developer')}
                className="text-xs border-blue-500/30 hover:bg-blue-500/10"
              >
                <Users className="h-3 w-3 mr-1" />
                Find People
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setMessage('/resources AI development')}
                className="text-xs border-green-500/30 hover:bg-green-500/10"
              >
                <Star className="h-3 w-3 mr-1" />
                Resources
              </Button>
              {selectedRole !== 'guest' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setMessage('/update Finished implementing the new feature')}
                  className="text-xs border-purple-500/30 hover:bg-purple-500/10"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Quick Update
                </Button>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              💡 <strong>Pro tip:</strong> Use <code>/help</code> for commands • <code>@username</code> to mention • 
              The Oracle remembers your context and gets smarter with each interaction!
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
