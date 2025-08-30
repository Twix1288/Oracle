import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Zap, MessageSquare, FileText, Calendar, Users, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/oracle";
import ReactMarkdown from "react-markdown";
import { useJourneyService, type JourneyResponse } from "@/hooks/useJourneyService";

interface EnhancedOracleProps {
  selectedRole: UserRole;
  teamId?: string;
  userId?: string;
}

interface OracleResponse {
  answer: string;
  sources: number;
  context_used: boolean;
  commandExecuted?: boolean;
  commandType?: string;
  commandResult?: any;
  sections?: {
    update?: string;
    progress?: string;
    event?: string;
  };
}

interface RolePermissions {
  canViewTeamData: boolean;
  canEditOwnProgress: boolean;
  canSendMessages: boolean;
  canChangeOracleState: boolean;
  canViewAllTeams?: boolean;
  canSendBroadcasts?: boolean;
  canEditAnyTeam?: boolean;
}

const rolePermissions: Record<UserRole, RolePermissions> = {
  builder: {
    canViewTeamData: true,
    canEditOwnProgress: true,
    canSendMessages: true, // Everyone can send messages
    canChangeOracleState: false
  },
  lead: {
    canViewTeamData: true,
    canEditOwnProgress: true,
    canSendMessages: true,
    canChangeOracleState: true,
    canViewAllTeams: true,
    canSendBroadcasts: true,
    canEditAnyTeam: true
  },
  mentor: {
    canViewTeamData: true,
    canEditOwnProgress: false,
    canSendMessages: true,
    canChangeOracleState: false,
    canViewAllTeams: true,
    canSendBroadcasts: true
  },
  guest: {
    canViewTeamData: false,
    canEditOwnProgress: false,
    canSendMessages: true, // Everyone can send messages
    canChangeOracleState: false
  },
  unassigned: {
    canViewTeamData: false,
    canEditOwnProgress: false,
    canSendMessages: false,
    canChangeOracleState: false
  }
};

export const EnhancedOracle = ({ selectedRole, teamId, userId }: EnhancedOracleProps) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("chat");
  const { toast } = useToast();

  const permissions = rolePermissions[selectedRole];

  // Slash command patterns - the main Oracle commands
  const detectSlashCommand = (text: string) => {
    const trimmed = text.trim();
    
    // Guest can only use /motivation and /status
    if (selectedRole === 'guest') {
      if (trimmed.startsWith('/motivation')) {
        return { type: 'motivation', query: trimmed.substring(11).trim() || 'motivation' };
      }
      if (trimmed.startsWith('/status')) {
        return { type: 'status', query: 'team status update' };
      }
      return null;
    }

    // All roles can use these commands
    if (trimmed.startsWith('/resources ')) {
      return { type: 'resources', query: trimmed.substring(11).trim() };
    }
    if (trimmed.startsWith('/connect ') || trimmed.startsWith('/find ')) {
      const query = trimmed.startsWith('/connect') ? trimmed.substring(9).trim() : trimmed.substring(6).trim();
      return { type: 'connect', query };
    }
    if (trimmed.startsWith('/help')) {
      return { type: 'help', query: 'help' };
    }
    if (trimmed.startsWith('/message ')) {
      return { type: 'message', query: trimmed.substring(9).trim() };
    }
    if (trimmed.startsWith('/update ')) {
      return { type: 'update', query: trimmed.substring(8).trim() };
    }
    
    return null;
  };

  const checkCommandPermission = (commandType: string) => {
    switch (commandType) {
      case 'logProgress':
        return permissions.canEditOwnProgress;
      case 'sendMessage':
        return permissions.canSendMessages;
      case 'broadcastUpdate':
        return permissions.canSendBroadcasts || false;
      case 'getTeamStatus':
        return permissions.canViewTeamData;
      default:
        return true;
    }
  };

  const executeCommand = async (commandType: string, match: RegExpMatchArray, originalQuery: string) => {
    try {
      switch (commandType) {
        case 'logProgress':
          const progressContent = match[4] || match[0];
          if (teamId) {
            const { error } = await supabase.from('updates').insert({
              team_id: teamId,
              content: progressContent,
              type: 'daily',
              created_by: userId || `${selectedRole}_user`
            });
            
            if (error) throw error;
            
            return {
              success: true,
              message: `✅ Progress logged: "${progressContent}"`,
              sections: {
                update: progressContent,
                progress: "Update successfully recorded in team log"
              }
            };
          }
          break;

        case 'sendMessage':
          const recipient = match[2];
          const message = match[3];
          if (message && recipient) {
            // Actually send the message via Supabase
            const { error } = await supabase.from('messages').insert({
              sender_id: userId || `${selectedRole}_user`,
              sender_role: selectedRole,
              receiver_id: recipient,
              receiver_role: 'builder', // Default to builder, could be enhanced to detect role
              content: message,
              team_id: teamId
            });
            
            if (error) throw error;
            
            return {
              success: true,
              message: `Message sent to ${recipient}: "${message}"`,
              sections: {
                event: `Message delivered to ${recipient}`
              }
            };
          }
          break;

        case 'broadcastUpdate':
          const broadcastMessage = match[2];
          if (broadcastMessage) {
            // Send broadcast message to all teams
            const { data: allTeams } = await supabase.from('teams').select('id');
            if (allTeams) {
              const broadcasts = allTeams.map(team => ({
                sender_id: userId || `${selectedRole}_user`,
                sender_role: selectedRole,
                receiver_role: 'builder' as UserRole,
                content: `BROADCAST: ${broadcastMessage}`,
                team_id: team.id
              }));
              
              const { error } = await supabase.from('messages').insert(broadcasts);
              if (error) throw error;
            }
            
            return {
              success: true,
              message: `Broadcast sent to all teams: "${broadcastMessage}"`,
              sections: {
                event: "Broadcast message delivered to all teams"
              }
            };
          }
          break;

        default:
          return null;
      }
    } catch (error) {
      console.error('Command execution error:', error);
      return {
        success: false,
        message: `❌ Failed to execute command: ${error.message}`
      };
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    
    try {
      // Check for slash commands first
      const slashCommand = detectSlashCommand(query);
      
      if (slashCommand) {
        // Handle slash commands through enhanced-resource-oracle
        let commandType = slashCommand.type;
        
        // Map motivation to resources for processing
        if (commandType === 'motivation') {
          commandType = 'resources';
          slashCommand.query = 'motivation inspiration success stories';
        }
        if (commandType === 'status') {
          commandType = 'chat';
          slashCommand.query = 'show me the latest team updates and progress status';
        }

        const response = await supabase.functions.invoke('enhanced-resource-oracle', {
          body: {
            query: slashCommand.query,
            type: commandType,
            role: selectedRole,
            teamId,
            userId,
            context: { hasTeam: Boolean(teamId) }
          }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        // Add response to history
        const newResponse = {
          ...response.data,
          commandType: slashCommand.type,
          query: query,
          timestamp: new Date().toISOString()
        };

        setResponses(prev => [newResponse, ...prev]);
        setQuery("");

        toast({
          title: `/${slashCommand.type} executed`,
          description: `Found ${response.data.resources?.length || response.data.connections?.length || 0} results`,
        });

      } else {
        // Handle regular conversational queries
        const response = await supabase.functions.invoke('enhanced-resource-oracle', {
          body: {
            query,
            type: 'chat',
            role: selectedRole,
            teamId,
            userId,
            context: { hasTeam: Boolean(teamId) }
          }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const newResponse = {
          ...response.data,
          query: query,
          timestamp: new Date().toISOString()
        };

        setResponses(prev => [newResponse, ...prev]);
        setQuery("");
      }

    } catch (error) {
      console.error('Oracle query error:', error);
      toast({
        title: "Oracle Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const commandExamples = {
    builder: [
      "/resources react hooks tutorials",
      "/connect frontend developers",
      "/find UI/UX designers",
      "/update completed authentication system",
      "/message mentors: need help with deployment"
    ],
    mentor: [
      "/resources startup funding guides", 
      "/connect experienced CTOs",
      "/find blockchain experts",
      "/message builders: great progress this week"
    ],
    lead: [
      "/resources team management tools",
      "/connect venture capitalists",
      "/update milestone: all teams on track",
      "/message all: weekly check-in tomorrow"
    ],
    guest: [
      "/motivation startup success stories",
      "/status show recent team updates"
    ]
  };

  const renderResponse = (response: any, index: number) => (
    <div key={index} className="space-y-4">
      {/* Query Display */}
      <div className="text-sm text-muted-foreground mb-2">
        <strong>You:</strong> {response.query}
      </div>

      {/* Resources Section */}
      {response.resources && response.resources.length > 0 && (
        <Card className="glow-border bg-blue-500/5 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">📚 Resources Found</span>
              <Badge variant="outline">{response.resources.length} results</Badge>
            </div>
            <div className="space-y-3">
              {response.resources.slice(0, 5).map((resource: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-background/50 border border-blue-500/20">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-foreground mb-1">
                        <a href={resource.url} target="_blank" rel="noopener noreferrer" 
                           className="hover:text-blue-400 transition-colors">
                          {resource.title}
                        </a>
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">{resource.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{resource.type}</Badge>
                        {resource.author && <span className="text-xs text-muted-foreground">by {resource.author}</span>}
                        {resource.duration && <span className="text-xs text-muted-foreground">{resource.duration}</span>}
                      </div>
                    </div>
                    <div className="text-xs text-green-400 font-medium">
                      {Math.round((resource.relevance || 0.8) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connections Section */}
      {response.connections && response.connections.length > 0 && (
        <Card className="glow-border bg-purple-500/5 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">🤝 People to Connect With</span>
              <Badge variant="outline">{response.connections.length} results</Badge>
            </div>
            <div className="space-y-3">
              {response.connections.slice(0, 4).map((person: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-background/50 border border-purple-500/20">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-foreground mb-1">{person.name}</h4>
                      <p className="text-xs text-muted-foreground mb-1">{person.title} at {person.company}</p>
                      {person.expertise && (
                        <p className="text-xs text-muted-foreground mb-2">{person.expertise}</p>
                      )}
                      {person.linkedin_url && (
                        <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer"
                           className="text-xs text-blue-400 hover:underline">
                          Connect on LinkedIn →
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-green-400 font-medium">
                      {person.relevance || 85}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Oracle Response */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-full bg-primary/20">
              <Sparkles className="h-3 w-3 text-primary" />
            </div>
            <h4 className="font-semibold text-sm text-primary">Oracle Response</h4>
            {response.sources > 0 && (
              <Badge variant="outline" className="text-xs">
                {response.sources} sources
              </Badge>
            )}
          </div>
          
          <div className="p-4 rounded-lg bg-background/50 border border-primary/10">
            <div className="text-sm leading-relaxed space-y-3 max-h-96 overflow-y-auto">
              <ReactMarkdown
                components={{
                  h1: ({...props}) => <h3 className="font-semibold text-base text-primary mb-2" {...props} />,
                  h2: ({...props}) => <h4 className="font-medium text-sm text-primary mb-1" {...props} />,
                  h3: ({...props}) => <h4 className="font-medium text-sm text-foreground mb-1" {...props} />,
                  ul: ({...props}) => <ul className="list-disc pl-4 space-y-1 mb-3" {...props} />,
                  ol: ({...props}) => <ol className="list-decimal pl-4 space-y-1 mb-3" {...props} />,
                  li: ({...props}) => <li className="text-sm leading-relaxed" {...props} />,
                  strong: ({...props}) => <strong className="font-semibold text-foreground" {...props} />,
                  p: ({...props}) => <p className="mb-2 text-sm leading-relaxed text-foreground/90" {...props} />,
                  blockquote: ({...props}) => <blockquote className="border-l-2 border-primary/30 pl-3 italic text-muted-foreground" {...props} />,
                  code: ({...props}) => <code className="bg-muted/50 px-1 py-0.5 rounded text-xs font-mono" {...props} />,
                }}
              >
                {response.answer}
              </ReactMarkdown>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/20 ufo-pulse">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-glow">The Oracle Command Center</h2>
          <p className="text-muted-foreground">Intelligent assistant with natural language commands</p>
        </div>
        <Badge className="bg-primary/20 text-primary border-primary/30">
          {selectedRole} Mode
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur border-primary/20">
          <TabsTrigger value="chat" className="data-[state=active]:bg-primary/20">
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat & Commands
          </TabsTrigger>
          <TabsTrigger value="commands" className="data-[state=active]:bg-primary/20">
            <Zap className="h-4 w-4 mr-2" />
            Available Commands
          </TabsTrigger>
          <TabsTrigger value="permissions" className="data-[state=active]:bg-primary/20">
            <Users className="h-4 w-4 mr-2" />
            Role Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-6">
          {/* Query Input */}
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary/60" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Ask the Oracle or give a command as a ${selectedRole}...`}
                      className="pl-10 bg-background/50 border-primary/20 focus:border-primary/50"
                      disabled={isLoading}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading || !query.trim()}
                    className="ufo-gradient hover:opacity-90 min-w-[120px]"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Transmit
                      </>
                    )}
                  </Button>
                </div>

                {/* Natural Language Examples */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">✨ Try these Oracle commands:</p>
                  <div className="flex flex-wrap gap-2">
                    {commandExamples[selectedRole].map((example, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setQuery(example)}
                        disabled={isLoading}
                        className="text-xs border-primary/20 hover:border-primary/40 hover:bg-primary/10"
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Response History */}
          <div className="space-y-4">
            {responses.map((response, index) => renderResponse(response, index))}
            {responses.length === 0 && (
              <Card className="glow-border bg-card/30 backdrop-blur border-dashed">
                <CardContent className="p-8 text-center">
                  <Sparkles className="h-8 w-8 text-primary/60 mx-auto mb-3" />
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Welcome to the Oracle! Your AI assistant for PieFi accelerator.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRole === 'guest' 
                        ? 'Try /motivation for inspiration or /status for updates'
                        : 'Use slash commands like /resources, /connect, /find or ask natural questions'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="commands">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Available Natural Language Commands</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {permissions.canEditOwnProgress && (
                <div className="space-y-2">
                  <h4 className="font-medium text-primary">📝 Progress Logging</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• "Log today's progress: [description]"</p>
                    <p>• "Update status: [new status]"</p>
                    <p>• "Record work: [what you accomplished]"</p>
                  </div>
                </div>
              )}

              {permissions.canSendMessages && (
                <div className="space-y-2">
                  <h4 className="font-medium text-primary">💬 Messaging</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• "Send message to [name]: [message]"</p>
                    <p>• "Tell [person] that [message]"</p>
                    <p>• "Notify [recipient]: [content]"</p>
                  </div>
                </div>
              )}

              {permissions.canViewTeamData && (
                <div className="space-y-2">
                  <h4 className="font-medium text-primary">📊 Team Status</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• "What did [team name] do this week?"</p>
                    <p>• "Show me the latest updates"</p>
                    <p>• "Check team progress"</p>
                  </div>
                </div>
              )}

              {permissions.canSendBroadcasts && (
                <div className="space-y-2">
                  <h4 className="font-medium text-primary">📢 Broadcasting</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• "Broadcast: [message to all teams]"</p>
                    <p>• "Announce: [important update]"</p>
                    <p>• "Tell everyone: [message]"</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Your Role Permissions ({selectedRole})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${permissions.canViewTeamData ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <div className={`w-3 h-3 rounded-full ${permissions.canViewTeamData ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="text-sm">View Team Data</span>
                  </div>
                  
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${permissions.canEditOwnProgress ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <div className={`w-3 h-3 rounded-full ${permissions.canEditOwnProgress ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="text-sm">Edit Progress</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${permissions.canSendMessages ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <div className={`w-3 h-3 rounded-full ${permissions.canSendMessages ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="text-sm">Send Messages</span>
                  </div>
                  
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${permissions.canSendBroadcasts ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <div className={`w-3 h-3 rounded-full ${permissions.canSendBroadcasts ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="text-sm">Send Broadcasts</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};