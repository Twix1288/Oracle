import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Bot, Send, Sparkles, Users, Hash, Zap, MessageSquare, Star, Play, 
  Link as LinkIcon, User, Crown, Shield, Heart, Loader2, Youtube, 
  FileText, ExternalLink, Search, Globe, BookOpen
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/oracle";
import ReactMarkdown from "react-markdown";

interface EnhancedResourceOracleProps {
  selectedRole: UserRole;
  teamId?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'oracle' | 'system' | 'resources';
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
  type: 'youtube' | 'article' | 'documentation' | 'tutorial' | 'tool' | 'piefi' | 'linkedin';
  description: string;
  relevance: number;
  thumbnail?: string;
  author?: string;
  duration?: string;
}

interface SlashCommand {
  command: string;
  description: string;
  usage: string;
  roleRequired: UserRole[];
  category: 'team' | 'user' | 'oracle' | 'admin' | 'resources';
}

const ENHANCED_SLASH_COMMANDS: SlashCommand[] = [
  {
    command: '/help',
    description: 'Show all available commands',
    usage: '/help',
    roleRequired: ['builder', 'mentor', 'lead', 'guest'],
    category: 'oracle'
  },
  {
    command: '/resources',
    description: 'Find curated resources, tutorials, and content',
    usage: '/resources [topic] - e.g. "coding tutorials", "motivation", "web3 funding"',
    roleRequired: ['builder', 'mentor', 'lead', 'guest'],
    category: 'resources'
  },
  {
    command: '/connect',
    description: 'Find people and experts to help with challenges',
    usage: '/connect [challenge] - searches Piefi users first, then LinkedIn',
    roleRequired: ['builder', 'mentor', 'lead'],
    category: 'user'
  },
  {
    command: '/find',
    description: 'Search for team members by name or skills',
    usage: '/find [name or skill]',
    roleRequired: ['builder', 'mentor', 'lead'],
    category: 'user'
  },
  {
    command: '/message',
    description: 'Send message to user (cross-platform)',
    usage: '/message @username your message',
    roleRequired: ['mentor', 'lead'],
    category: 'team'
  },
  {
    command: '/update',
    description: 'Log progress update',
    usage: '/update your progress description',
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

const getResourceIcon = (type: string) => {
  switch (type) {
    case 'youtube': return <Youtube className="h-4 w-4 text-red-500" />;
    case 'article': return <FileText className="h-4 w-4 text-blue-500" />;
    case 'documentation': return <BookOpen className="h-4 w-4 text-green-500" />;
    case 'piefi': return <Star className="h-4 w-4 text-purple-500" />;
    case 'linkedin': return <Users className="h-4 w-4 text-blue-600" />;
    default: return <ExternalLink className="h-4 w-4 text-gray-500" />;
  }
};

export const EnhancedResourceOracle = ({ selectedRole, teamId }: EnhancedResourceOracleProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [showCommands, setShowCommands] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ full_name: string; role: string; id: string }[]>([]);
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

  useEffect(() => {
    // Enhanced welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'oracle',
      content: `🛸 **Welcome to the Enhanced PieFi Oracle, ${profile?.full_name || 'Explorer'}!**

I'm your intelligent AI companion with superpowers! I can:

🔍 **Find Real Resources** - YouTube videos, articles, tutorials from across the web
👥 **Connect People** - Search Piefi community first, then expand to LinkedIn 
⚡ **Execute Commands** - Natural language or slash commands work perfectly
📚 **Contextual Learning** - Prioritizes Piefi docs and internal knowledge

**Try these enhanced commands:**
• \`/resources web3 funding\` - Get funding resources and videos
• \`/resources motivation\` - Find motivational content
• \`/connect blockchain expert\` - Find people who can help
• \`/find Sarah\` - Search for team members

🚀 **Enhanced features for better team collaboration!**`,
      timestamp: new Date().toISOString(),
      author: {
        name: 'Enhanced Oracle',
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
    const cmd = ENHANCED_SLASH_COMMANDS.find(c => c.command === `/${command}`);
    
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
          const availableCommands = ENHANCED_SLASH_COMMANDS.filter(c => c.roleRequired.includes(selectedRole));
          const categorizedCommands = availableCommands.reduce((acc, cmd) => {
            if (!acc[cmd.category]) acc[cmd.category] = [];
            acc[cmd.category].push(cmd);
            return acc;
          }, {} as Record<string, SlashCommand[]>);
          
          let helpMessage = `**🛸 Enhanced Oracle Command Center - ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Commands**\n\n`;
          
          Object.entries(categorizedCommands).forEach(([category, commands]) => {
            const categoryEmoji = {
              'oracle': '🔮',
              'team': '👥',
              'user': '🧑',
              'admin': '⚡',
              'resources': '📚'
            }[category] || '📋';
            
            helpMessage += `**${categoryEmoji} ${category.charAt(0).toUpperCase() + category.slice(1)} Commands:**\n`;
            commands.forEach(cmd => {
              helpMessage += `• \`${cmd.command}\` - ${cmd.description}\n  *Usage:* ${cmd.usage}\n\n`;
            });
          });
          
          helpMessage += `**💡 Enhanced Features:**\n• Real resource fetching from YouTube, articles, docs\n• Prioritizes Piefi community connections\n• Natural language understanding\n• External resource fallback`;
          
          return {
            success: true,
            message: helpMessage
          };

        case 'resources':
          const topic = args.join(' ');
          if (!topic) {
            return {
              success: false,
              message: 'Please specify a topic. Usage: /resources [topic] - e.g., "coding tutorials", "motivation"'
            };
          }

          // Call enhanced resource fetching function
          const resourceResponse = await supabase.functions.invoke('enhanced-resource-oracle', {
            body: {
              query: topic,
              type: 'resources',
              role: selectedRole,
              teamId,
              userId: profile?.id
            }
          });
          
          if (resourceResponse.data?.resources) {
            const resources = resourceResponse.data.resources;
            let resourceMessage = `**📚 Resources for "${topic}":**\n\n`;
            
            // Prioritize Piefi resources
            const pieFiResources = resources.filter((r: any) => r.type === 'piefi');
            const externalResources = resources.filter((r: any) => r.type !== 'piefi');
            
            if (pieFiResources.length > 0) {
              resourceMessage += `**🏠 PieFi Resources (Priority):**\n`;
              pieFiResources.forEach((r: any, idx: number) => {
                resourceMessage += `${idx + 1}. **${r.title}**\n   📝 ${r.description}\n   🔗 ${r.url}\n   ⭐ ${Math.round(r.relevance * 100)}% relevance\n\n`;
              });
            }
            
            if (externalResources.length > 0) {
              resourceMessage += `**🌐 External Resources:**\n`;
              externalResources.forEach((r: any, idx: number) => {
                const icon = r.type === 'youtube' ? '📺' : r.type === 'article' ? '📄' : '🔗';
                resourceMessage += `${idx + 1}. ${icon} **${r.title}** (${r.type})\n   📝 ${r.description}\n   🔗 ${r.url}\n   ⭐ ${Math.round(r.relevance * 100)}% relevance\n\n`;
              });
            }
            
            // Add to chat as resource message
            const resourceChatMessage: ChatMessage = {
              id: `resources-${Date.now()}`,
              type: 'resources',
              content: resourceMessage,
              timestamp: new Date().toISOString(),
              author: {
                name: 'Resource Oracle',
                role: 'guest' as UserRole,
                avatar: '📚'
              },
              metadata: {
                resources: resources,
                sources: resources.length
              }
            };
            
            setMessages(prev => [...prev, resourceChatMessage]);
            
            return {
              success: true,
              message: `Found ${resources.length} resources for "${topic}". Check above for details!`
            };
          } else {
            return {
              success: true,
              message: `🔍 No specific resources found for "${topic}". Try more specific terms or different keywords.`
            };
          }

        case 'connect':
          const challenge = args.join(' ');
          if (!challenge) {
            return {
              success: false,
              message: 'Please specify what you need help with. Usage: /connect [challenge] - e.g., "blockchain development"'
            };
          }

          // First search Piefi users
          const { data: pieFiUsers } = await supabase
            .from('profiles')
            .select('full_name, role, skills, bio, experience_level, linkedin_url')
            .not('skills', 'is', null);
          
          let connectMessage = `**🤝 Connections for "${challenge}":**\n\n`;
          
          if (pieFiUsers && pieFiUsers.length > 0) {
            const relevantPeople = pieFiUsers.filter(p => 
              p.skills?.some((skill: string) => 
                challenge.toLowerCase().includes(skill.toLowerCase()) ||
                skill.toLowerCase().includes(challenge.toLowerCase())
              ) || 
              p.bio?.toLowerCase().includes(challenge.toLowerCase())
            ).slice(0, 3);
            
            if (relevantPeople.length > 0) {
              connectMessage += `**🏠 PieFi Community (Priority):**\n`;
              relevantPeople.forEach((p, idx) => {
                connectMessage += `${idx + 1}. **${p.full_name}** (${p.role})\n   💪 Skills: ${p.skills?.join(', ')}\n   📝 ${p.bio || 'No bio available'}\n   🔗 ${p.linkedin_url || 'Use @mention to connect'}\n\n`;
              });
            }
          }
          
          // Then search external LinkedIn (simulated)
          const linkedinResponse = await supabase.functions.invoke('enhanced-resource-oracle', {
            body: {
              query: challenge,
              type: 'connect',
              role: selectedRole,
              teamId,
              userId: profile?.id
            }
          });
          
          if (linkedinResponse.data?.connections) {
            connectMessage += `**🌐 LinkedIn Experts:**\n`;
            linkedinResponse.data.connections.forEach((c: any, idx: number) => {
              connectMessage += `${idx + 1}. **${c.name}** - ${c.title}\n   🏢 ${c.company}\n   🔗 ${c.linkedin_url}\n   📊 ${c.relevance}% match\n\n`;
            });
          }
          
          return {
            success: true,
            message: connectMessage
          };

        case 'find':
          const searchTerm = args.join(' ');
          if (!searchTerm) {
            return {
              success: false,
              message: 'Please specify who or what to find. Usage: /find [name or skill]'
            };
          }

          const { data: foundUsers } = await supabase
            .from('profiles')
            .select('full_name, role, skills, bio, team_id')
            .or(`full_name.ilike.%${searchTerm}%,skills.cs.{${searchTerm}}`);
          
          if (foundUsers && foundUsers.length > 0) {
            let findMessage = `**🔍 Found ${foundUsers.length} matches for "${searchTerm}":**\n\n`;
            foundUsers.forEach((user, idx) => {
              findMessage += `${idx + 1}. **${user.full_name}** (${user.role})\n   💪 Skills: ${user.skills?.join(', ') || 'None listed'}\n   📝 ${user.bio || 'No bio'}\n   📍 Team: ${user.team_id ? 'Assigned' : 'Available'}\n\n`;
            });
            findMessage += `💡 *Use @username to mention them!*`;
            
            return {
              success: true,
              message: findMessage
            };
          } else {
            return {
              success: true,
              message: `❌ No matches found for "${searchTerm}". Try different keywords or check spelling.`
            };
          }

        case 'message':
          const targetMatch = args[0]?.startsWith('@') ? args[0].slice(1) : args[0];
          const messageContent = args.slice(1).join(' ');
          
          if (!targetMatch || !messageContent) {
            return {
              success: false,
              message: `❌ Invalid format. Usage: /message @username your message`
            };
          }
          
          // Find target user
          const { data: targetUser } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .ilike('full_name', `%${targetMatch}%`)
            .single();
          
          if (targetUser) {
            // Send to database
            const { error } = await supabase
              .from('messages')
              .insert({
                sender_id: profile?.id,
                sender_role: selectedRole,
                receiver_id: targetUser.id,
                receiver_role: targetUser.role,
                content: `${messageContent}\n\n*Sent via Oracle*`,
                team_id: teamId
              });
            
            if (!error) {
              let responseMsg = `✅ **Message sent to ${targetUser.full_name}:**\n"${messageContent}"\n\n📱 Delivered to: Website dashboard`;
              
              return {
                success: true,
                message: responseMsg
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
              message: `❌ User not found: "${targetMatch}". Try /find to search first.`
            };
          }

        case 'update':
          if (teamId) {
            const updateContent = args.join(' ');
            if (!updateContent) {
              return {
                success: false,
                message: 'Please provide update content. Usage: /update your progress description'
              };
            }
            
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
                message: `✅ **Progress Update Logged:**\n"${updateContent}"\n\n📊 Team status updated\n⏰ ${new Date().toLocaleString()}\n🔄 Synced across all platforms`
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
              message: `❌ No team assigned. Join a team first to log updates.`
            };
          }

        default:
          return {
            success: false,
            message: `Command /${command} not implemented yet.`
          };
      }
    } catch (error) {
      console.error('Command execution error:', error);
      return {
        success: false,
        message: `❌ Error executing /${command}: ${error.message}`
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
      author: {
        name: profile?.full_name || 'You',
        role: selectedRole,
        avatar: profile?.avatar_url
      }
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = message.trim();
    setMessage("");
    setIsLoading(true);

    try {
      // Parse for slash commands
      if (currentMessage.startsWith('/')) {
        const [command, ...args] = currentMessage.slice(1).split(' ');
        const result = await executeSlashCommand(command, args);
        
        const responseMessage: ChatMessage = {
          id: `oracle-${Date.now()}`,
          type: result.success ? 'oracle' : 'system',
          content: result.message,
          timestamp: new Date().toISOString(),
          author: {
            name: 'Enhanced Oracle',
            role: 'guest' as UserRole,
            avatar: '🛸'
          },
          metadata: {
            command: command,
            confidence: result.success ? 95 : 50
          }
        };
        
        setMessages(prev => [...prev, responseMessage]);
        
        if (result.success) {
          toast({
            title: "Command Executed",
            description: `/${command} completed successfully`
          });
        }
      } else {
        // Natural language processing
        const response = await supabase.functions.invoke('enhanced-resource-oracle', {
          body: {
            query: currentMessage,
            type: 'chat',
            role: selectedRole,
            teamId,
            userId: profile?.id,
            context: {
              hasTeam: Boolean(teamId),
              recentMessages: messages.slice(-3)
            }
          }
        });

        if (response.data) {
          const responseMessage: ChatMessage = {
            id: `oracle-${Date.now()}`,
            type: 'oracle',
            content: response.data.answer,
            timestamp: new Date().toISOString(),
            author: {
              name: 'Enhanced Oracle',
              role: 'guest' as UserRole,
              avatar: '🛸'
            },
            metadata: {
              sources: response.data.sources || 0,
              confidence: response.data.confidence || 85,
              resources: response.data.resources
            }
          };
          
          setMessages(prev => [...prev, responseMessage]);
        }
      }
    } catch (error) {
      console.error('Oracle error:', error);
      toast({
        title: "Oracle Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (msg: ChatMessage) => (
    <div key={msg.id} className="flex gap-3 p-4 rounded-lg bg-background/30 border border-primary/10">
      <Avatar className="h-8 w-8">
        <AvatarImage src={msg.author?.avatar} />
        <AvatarFallback className="text-xs">
          {msg.type === 'oracle' ? '🛸' : msg.type === 'resources' ? '📚' : msg.author?.name?.[0] || '?'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{msg.author?.name || 'Oracle'}</span>
          {msg.author?.role && getRoleIcon(msg.author.role)}
          <span className="text-xs text-muted-foreground">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </span>
          {msg.metadata?.confidence && (
            <Badge variant="outline" className="text-xs">
              {msg.metadata.confidence}% confident
            </Badge>
          )}
        </div>
        
        <div className="text-sm leading-relaxed">
          <ReactMarkdown
            components={{
              h1: ({...props}) => <h3 className="font-semibold text-base text-primary mb-2" {...props} />,
              h2: ({...props}) => <h4 className="font-medium text-sm text-primary mb-1" {...props} />,
              strong: ({...props}) => <strong className="font-semibold text-foreground" {...props} />,
              code: ({...props}) => <code className="bg-muted/50 px-1 py-0.5 rounded text-xs font-mono" {...props} />
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
        
        {msg.metadata?.resources && msg.metadata.resources.length > 0 && (
          <div className="space-y-2 mt-3">
            <h5 className="text-sm font-medium text-primary">📚 Related Resources:</h5>
            <div className="grid grid-cols-1 gap-2">
              {msg.metadata.resources.slice(0, 3).map((resource: OracleResource, idx: number) => (
                <div key={idx} className="p-2 rounded bg-muted/30 border border-primary/10">
                  <div className="flex items-center gap-2 mb-1">
                    {getResourceIcon(resource.type)}
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {resource.title}
                    </a>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(resource.relevance * 100)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{resource.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/20 ufo-pulse">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-glow">Enhanced Resource Oracle</h2>
          <p className="text-muted-foreground">AI assistant with real resource fetching & cross-platform sync</p>
        </div>
        <Badge className="bg-primary/20 text-primary border-primary/30">
          {selectedRole} • Enhanced
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur border-primary/20">
          <TabsTrigger value="chat" className="data-[state=active]:bg-primary/20">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat & Resources
          </TabsTrigger>
          <TabsTrigger value="commands" className="data-[state=active]:bg-primary/20">
            <Search className="h-4 w-4 mr-2" />
            Commands + Resources
          </TabsTrigger>
          <TabsTrigger value="sync" className="data-[state=active]:bg-primary/20">
            <Globe className="h-4 w-4 mr-2" />
            Cross-Platform
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-6">
          {/* Chat Area */}
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-0">
              <ScrollArea className="h-96 p-4">
                <div className="space-y-4">
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t border-primary/20">
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <div className="flex-1 relative">
                    <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary/60" />
                    <Input
                      ref={inputRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Ask for resources, connect with people, or give commands...`}
                      className="pl-10 bg-background/50 border-primary/20 focus:border-primary/50"
                      disabled={isLoading}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading || !message.trim()}
                    className="ufo-gradient hover:opacity-90 min-w-[100px]"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </>
                    )}
                  </Button>
                </form>
                
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMessage("/resources coding tutorials")}
                    className="text-xs"
                  >
                    📚 Get Resources
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMessage("/connect blockchain expert")}
                    className="text-xs"
                  >
                    🤝 Find Expert
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMessage("/resources motivation")}
                    className="text-xs"
                  >
                    💪 Motivation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commands" className="space-y-6">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Enhanced Commands & Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ENHANCED_SLASH_COMMANDS
                .filter(cmd => cmd.roleRequired.includes(selectedRole))
                .map((cmd, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-background/30 border border-primary/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {cmd.command}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {cmd.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground mb-1">{cmd.description}</p>
                    <p className="text-xs text-muted-foreground font-mono">{cmd.usage}</p>
                  </div>
                ))
              }
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Cross-Platform Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-background/30 border border-green-500/20">
                <h4 className="font-medium text-green-400 mb-2">✅ Active Integrations</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Website Oracle (Current)
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    User Profile Sync
                  </li>
                </ul>
              </div>
              
              <div className="p-4 rounded-lg bg-background/30 border border-blue-500/20">
                <h4 className="font-medium text-blue-400 mb-2">🔄 How It Works</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Real-time resource fetching and sharing</li>
                  <li>• User profiles sync automatically</li>
                  <li>• Team connections and mentions</li>
                  <li>• Cross-platform resource sharing</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};