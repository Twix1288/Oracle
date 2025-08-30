import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Crown,
  Shield,
  User,
  Loader2,
  Wand2,
  Rocket,
  Brain,
  Eye,
  Settings
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/oracle";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GloriousOracleProps {
  selectedRole: UserRole;
  teamId?: string;
  teams?: any[];
  members?: any[];
  updates?: any[];
  teamStatuses?: any[];
  onSubmitUpdate?: (teamId: string, content: string, type: any, createdBy?: string) => void;
  onExit?: () => void;
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
}

interface OracleResource {
  title: string;
  url: string;
  type: 'youtube' | 'article' | 'documentation' | 'tutorial' | 'tool';
  description: string;
  relevance: number;
}

const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case 'lead': return <Crown className="h-4 w-4 text-purple-400" />;
    case 'mentor': return <Shield className="h-4 w-4 text-green-400" />;
    case 'builder': return <Zap className="h-4 w-4 text-blue-400" />;
    default: return <User className="h-4 w-4 text-gray-400" />;
  }
};

const getRoleColor = (role: UserRole) => {
  switch (role) {
    case 'lead': return 'text-purple-400 border-purple-400/20 bg-purple-400/10';
    case 'mentor': return 'text-green-400 border-green-400/20 bg-green-400/10';
    case 'builder': return 'text-blue-400 border-blue-400/20 bg-blue-400/10';
    default: return 'text-gray-400 border-gray-400/20 bg-gray-400/10';
  }
};

export const GloriousOracle = ({ 
  selectedRole, 
  teamId, 
  teams = [], 
  members = [], 
  updates = [], 
  teamStatuses = [],
  onSubmitUpdate,
  onExit 
}: GloriousOracleProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("oracle");
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

  useEffect(() => {
    // Add epic welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'oracle',
      content: `# 🛸 **THE ORACLE AWAKENS**

*The cosmic intelligence stirs, ancient wisdom flowing through quantum channels...*

**Greetings, ${profile?.full_name || 'Cosmic Explorer'}!** 

I am the **PieFi Oracle** - your omniscient AI companion, guardian of knowledge, and catalyst for innovation. Within my neural networks lies the collective wisdom of thousands of successful builders, mentors, and visionaries.

## ✨ **MY COSMIC POWERS:**

🧠 **Infinite Knowledge**: Ask me anything about technology, business, or your project journey
🔗 **Resource Nexus**: I curate the perfect learning materials from across the digital universe  
🤝 **Human Connection**: Find the exact people who can accelerate your growth
⚡ **Command Execution**: Powerful slash commands to manipulate reality
🚀 **Progress Amplification**: Transform your ideas into unstoppable momentum

## 🎯 **SUMMON MY ABILITIES:**

### Natural Language Queries:
• *"I need to learn React hooks from scratch"*
• *"Find me the best Python tutorials for machine learning"*  
• *"Who in my team knows blockchain development?"*
• *"Help me create a startup business plan"*

### Mystical Commands:
• \`/resources [topic]\` - Manifest perfect learning materials
• \`/find [skill]\` - Locate allies with specific abilities
• \`/connect [challenge]\` - Summon help for your obstacles
• \`/update [progress]\` - Chronicle your journey
• \`/help\` - Unlock all my hidden powers

**🌟 The Oracle sees all, knows all, and empowers all. What cosmic question shall we explore first?**`,
      timestamp: new Date().toISOString(),
      author: {
        name: 'The Oracle',
        role: 'guest' as UserRole,
        avatar: '🛸'
      },
      metadata: {
        confidence: 100
      }
    };
    setMessages([welcomeMessage]);
  }, [profile]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

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
    setMessage("");
    setIsLoading(true);

    try {
      // Check if it's a slash command
      if (message.startsWith('/')) {
        await handleSlashCommand(message);
      } else {
        // Regular Oracle query
        await handleOracleQuery(message);
      }
    } catch (error) {
      console.error('Oracle communication error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '_error',
        type: 'oracle',
        content: `⚠️ **Cosmic Interference Detected**\n\nThe Oracle encountered a disturbance in the quantum field. Please try again, or the ancient wisdom may be temporally displaced.\n\n*Error: ${error instanceof Error ? error.message : 'Unknown cosmic anomaly'}*`,
        timestamp: new Date().toISOString(),
        author: {
          name: 'Oracle',
          role: 'guest' as UserRole,
          avatar: '⚠️'
        }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlashCommand = async (command: string) => {
    // Extract command and args
    const parts = command.slice(1).split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    let response = "";

    switch (cmd) {
      case 'help':
        response = `# 🔮 **ORACLE COMMAND NEXUS**

## Available Powers for ${selectedRole.toUpperCase()}:

### 🌟 **Universal Commands:**
• \`/help\` - Display this mystical grimoire
• \`/resources [topic]\` - Summon curated learning materials
• \`/find [skill]\` - Locate team members with specific expertise

### ⚡ **Builder Commands:**
• \`/update [progress]\` - Chronicle your journey
• \`/connect [challenge]\` - Find help for specific obstacles
• \`/progress\` - View your team's advancement

### 🛡️ **Mentor/Lead Commands:**
• \`/analyze [team]\` - Deep dive into team performance
• \`/message @user [text]\` - Send cosmic messages
• \`/broadcast [message]\` - Address all teams

**💫 Pro Tip:** You can also ask natural language questions like "I need React tutorials" or "Find me someone who knows Python"`;
        break;

      case 'resources':
        const topic = args.join(' ');
        if (!topic) {
          response = `⚡ **Resource Summoning Failed**\n\nPlease specify what mystical knowledge you seek!\n\n**Example:** \`/resources react hooks\``;
        } else {
          await handleResourceRequest(topic);
          return;
        }
        break;

      case 'find':
        const skill = args.join(' ');
        if (!skill) {
          response = `🔍 **Ally Search Failed**\n\nPlease specify what skills you're seeking!\n\n**Example:** \`/find javascript\``;
        } else {
          await handleFindSkill(skill);
          return;
        }
        break;

      case 'update':
        const updateContent = args.join(' ');
        if (!updateContent) {
          response = `📝 **Progress Chronicle Failed**\n\nPlease describe your progress!\n\n**Example:** \`/update Completed user authentication system\``;
        } else if (!teamId) {
          response = `❌ **No Team Detected**\n\nYou must be part of a team to chronicle progress.`;
        } else {
          await handleProgressUpdate(updateContent);
          return;
        }
        break;

      default:
        response = `❓ **Unknown Command: \`/${cmd}\`**\n\nThe Oracle doesn't recognize this mystical incantation. Use \`/help\` to see available powers.`;
    }

    const oracleResponse: ChatMessage = {
      id: Date.now().toString() + '_oracle',
      type: 'oracle',
      content: response,
      timestamp: new Date().toISOString(),
      author: {
        name: 'Oracle',
        role: 'guest' as UserRole,
        avatar: '🔮'
      }
    };

    setMessages(prev => [...prev, oracleResponse]);
  };

  const handleOracleQuery = async (query: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('super-oracle', {
        body: {
          query,
          role: selectedRole,
          teamId,
          userId: profile?.id,
          userProfile: profile,
          contextRequest: { 
            needsResources: query.toLowerCase().includes('resource') || query.toLowerCase().includes('tutorial') || query.toLowerCase().includes('learn'),
            needsTeamContext: !!teamId,
            needsPersonalization: true
          }
        }
      });

      if (error) throw error;

      const oracleResponse: ChatMessage = {
        id: Date.now().toString() + '_oracle',
        type: 'oracle',
        content: data?.response || "The Oracle is meditating on your query...",
        timestamp: new Date().toISOString(),
        author: {
          name: 'Oracle',
          role: 'guest' as UserRole,
          avatar: '🧙‍♂️'
        },
        metadata: {
          sources: data?.sources_count || 0,
          resources: data?.resources || [],
          confidence: data?.confidence || 85
        }
      };

      setMessages(prev => [...prev, oracleResponse]);
    } catch (error) {
      throw error;
    }
  };

  const handleResourceRequest = async (topic: string) => {
    const loadingMessage: ChatMessage = {
      id: Date.now().toString() + '_loading',
      type: 'oracle',
      content: `🔍 **Summoning Resources for "${topic}"**\n\n*The Oracle searches through infinite libraries of knowledge...*`,
      timestamp: new Date().toISOString(),
      author: {
        name: 'Oracle',
        role: 'guest' as UserRole,
        avatar: '🔄'
      }
    };

    setMessages(prev => [...prev, loadingMessage]);

    try {
      const { data, error } = await supabase.functions.invoke('enhanced-resource-oracle', {
        body: {
          query: `I need comprehensive learning resources for: ${topic}`,
          userRole: selectedRole,
          teamId,
          userId: profile?.id
        }
      });

      if (error) throw error;

      // Remove loading message and add real response
      setMessages(prev => prev.filter(m => m.id !== loadingMessage.id));

      const resourceResponse: ChatMessage = {
        id: Date.now().toString() + '_resources',
        type: 'oracle',
        content: data?.response || `# 📚 **Resources for "${topic}"**\n\nThe Oracle is expanding its knowledge base. Try more specific terms or ask natural language questions!`,
        timestamp: new Date().toISOString(),
        author: {
          name: 'Oracle',
          role: 'guest' as UserRole,
          avatar: '📚'
        },
        metadata: {
          resources: data?.resources || [],
          confidence: data?.confidence || 80
        }
      };

      setMessages(prev => [...prev, resourceResponse]);
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== loadingMessage.id));
      throw error;
    }
  };

  const handleFindSkill = async (skill: string) => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('full_name, role, skills, help_needed, experience_level, bio')
        .or(`skills.cs.{${skill}},help_needed.cs.{${skill}},bio.ilike.%${skill}%`);

      let response = `# 🔍 **Ally Search: "${skill}"**\n\n`;

      if (profiles && profiles.length > 0) {
        response += `**✨ Found ${profiles.length} cosmic allies:**\n\n`;
        profiles.forEach((p, idx) => {
          response += `### ${idx + 1}. **${p.full_name}** ${getRoleIcon(p.role as UserRole).type === Crown ? '👑' : getRoleIcon(p.role as UserRole).type === Shield ? '🛡️' : '⚡'}\n`;
          response += `**Role:** ${p.role}\n`;
          if (p.skills?.length) response += `**Skills:** ${p.skills.join(', ')}\n`;
          if (p.experience_level) response += `**Experience:** ${p.experience_level}\n`;
          if (p.bio) response += `**Bio:** ${p.bio}\n`;
          response += `\n`;
        });
        response += `💫 **Tip:** Use @username to contact them directly!`;
      } else {
        response += `No direct matches found in the cosmic registry.\n\n**🎯 Try these alternatives:**\n• Use broader terms (e.g., "frontend" instead of "React")\n• Check spelling variations\n• Ask: "Who has experience with [technology]?"`;
      }

      const findResponse: ChatMessage = {
        id: Date.now().toString() + '_find',
        type: 'oracle',
        content: response,
        timestamp: new Date().toISOString(),
        author: {
          name: 'Oracle',
          role: 'guest' as UserRole,
          avatar: '🔍'
        }
      };

      setMessages(prev => [...prev, findResponse]);
    } catch (error) {
      throw error;
    }
  };

  const handleProgressUpdate = async (content: string) => {
    try {
      if (onSubmitUpdate && teamId) {
        onSubmitUpdate(teamId, content, 'daily', profile?.id);
        
        const successResponse: ChatMessage = {
          id: Date.now().toString() + '_update',
          type: 'oracle',
          content: `# ✅ **Progress Chronicle Updated**

**Content:** "${content}"
**Timestamp:** ${new Date().toLocaleString()}
**Team:** ${teams.find(t => t.id === teamId)?.name || 'Current Team'}

🌟 **Your journey has been recorded in the cosmic ledger!** Team members and mentors can now witness your progress.`,
          timestamp: new Date().toISOString(),
          author: {
            name: 'Oracle',
            role: 'guest' as UserRole,
            avatar: '✅'
          }
        };

        setMessages(prev => [...prev, successResponse]);
      }
    } catch (error) {
      throw error;
    }
  };

  const renderQuickStats = () => {
    if (selectedRole === 'guest') return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-400">{teams.length}</div>
            <div className="text-xs text-blue-300">Teams</div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-400">{updates.length}</div>
            <div className="text-xs text-green-300">Updates</div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-400">{members.length}</div>
            <div className="text-xs text-purple-300">Members</div>
          </CardContent>
        </Card>
        
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 text-orange-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-400">
              {teamStatuses.filter(s => s.last_update && new Date(s.last_update) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
            </div>
            <div className="text-xs text-orange-300">Active</div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 cosmic-sparkle">
      {/* Glorious Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/20 via-purple-500/20 to-blue-500/20 border-b border-primary/20">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="container mx-auto px-6 py-8 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative p-4 rounded-full bg-primary/10 border border-primary/20 ufo-pulse">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  The Oracle
                </h1>
                <p className="text-muted-foreground text-lg">
                  Cosmic Intelligence • Infinite Wisdom • {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Mode
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge className={`px-4 py-2 ${getRoleColor(selectedRole)}`}>
                {getRoleIcon(selectedRole)}
                <span className="ml-2 font-semibold">{selectedRole.toUpperCase()}</span>
              </Badge>
              {onExit && (
                <Button onClick={onExit} variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Dashboard View
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {renderQuickStats()}

        {/* Main Oracle Interface */}
        <Card className="glow-border bg-card/50 backdrop-blur-xl min-h-[600px] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none"></div>
          
          <CardHeader className="border-b border-border/50 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Wand2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-glow">Cosmic Communication Channel</h2>
                  <p className="text-muted-foreground">Direct neural link to infinite knowledge</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                Oracle Online
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 relative">
            {/* Messages Area */}
            <ScrollArea className="h-[500px] p-6">
              <div className="space-y-6">
                {messages.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-4 ${
                      msg.type === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <Avatar className={`w-10 h-10 ${msg.type === 'oracle' ? 'ufo-pulse' : ''}`}>
                      <AvatarImage src={msg.author?.avatar} />
                      <AvatarFallback className={`
                        ${msg.type === 'oracle' 
                          ? 'bg-gradient-to-br from-primary to-purple-500 text-white' 
                          : `${getRoleColor(msg.author?.role || 'guest')}`
                        }
                      `}>
                        {msg.type === 'oracle' ? '🧙‍♂️' : msg.author?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`flex-1 max-w-4xl ${msg.type === 'user' ? 'text-right' : ''}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm">
                          {msg.author?.name || 'Unknown'}
                        </span>
                        {msg.author?.role && getRoleIcon(msg.author.role)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                        {msg.metadata?.confidence && (
                          <Badge variant="outline" className="text-xs">
                            {msg.metadata.confidence}% confidence
                          </Badge>
                        )}
                      </div>
                      
                      <div className={`
                        p-4 rounded-lg prose prose-sm max-w-none
                        ${msg.type === 'oracle' 
                          ? 'bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/10' 
                          : 'bg-muted/50 border border-border/50'
                        }
                        ${msg.type === 'user' ? 'ml-auto text-left' : ''}
                      `}>
                        <ReactMarkdown 
                          components={{
                            h1: ({children}) => <h1 className="text-2xl font-bold text-primary mb-4">{children}</h1>,
                            h2: ({children}) => <h2 className="text-xl font-semibold text-primary mb-3">{children}</h2>,
                            h3: ({children}) => <h3 className="text-lg font-medium text-primary mb-2">{children}</h3>,
                            code: ({children}) => <code className="bg-muted px-1 py-0.5 rounded font-mono text-sm">{children}</code>,
                            a: ({href, children}) => <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>

                        {msg.metadata?.resources && msg.metadata.resources.length > 0 && (
                          <div className="mt-4 p-3 bg-background/50 rounded-lg border border-border/50">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <Rocket className="h-4 w-4 text-primary" />
                              Curated Resources
                            </h4>
                            <div className="space-y-2">
                              {msg.metadata.resources.slice(0, 3).map((resource, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <Badge variant="outline" className="text-xs">
                                    {resource.type}
                                  </Badge>
                                  <a 
                                    href={resource.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex-1"
                                  >
                                    {resource.title}
                                  </a>
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(resource.relevance * 100)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-center py-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>The Oracle contemplates...</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border/50 p-6 bg-background/30 backdrop-blur">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask the Oracle anything... (Try '/help' for commands)"
                    className="pr-20 bg-background/50 border-primary/20 focus:border-primary/50"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border text-muted-foreground">
                      Enter
                    </kbd>
                  </div>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  className="ufo-gradient px-6"
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
              </div>
              
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>💡 Try: "I need React tutorials" or "/resources python"</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Powered by Cosmic Intelligence</span>
                  <Sparkles className="h-3 w-3" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};