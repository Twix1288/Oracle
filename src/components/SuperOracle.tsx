import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Zap, MessageSquare, FileText, Calendar, Users, Send, Brain, Network, Cpu, BarChart3, Globe, Layers } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/oracle";
import ReactMarkdown from "react-markdown";

interface SuperOracleProps {
  selectedRole: UserRole;
  teamId?: string;
  userId?: string;
}

interface SuperOracleResponse {
  answer: string;
  sources: number;
  context_used: boolean;
  model_used: string;
  confidence: number;
  processing_time: number;
  graph_data?: any;
  multi_model_insights?: any;
  resources?: any[];
  connections?: any[];
  entities?: any[];
  relationships?: any[];
  search_strategy: string;
  fallback_used: boolean;
  commandExecuted?: boolean;
  commandType?: string;
  commandResult?: any;
  sections?: {
    update?: string;
    progress?: string;
    event?: string;
  };
  query?: string;
  timestamp?: string;
}

interface RolePermissions {
  canViewTeamData: boolean;
  canEditOwnProgress: boolean;
  canSendMessages: boolean;
  canChangeOracleState: boolean;
  canViewAllTeams?: boolean;
  canSendBroadcasts?: boolean;
  canEditAnyTeam?: boolean;
  canUseGraphRAG?: boolean;
  canUseMultiModel?: boolean;
}

const rolePermissions: Record<UserRole, RolePermissions> = {
  builder: {
    canViewTeamData: true,
    canEditOwnProgress: true,
    canSendMessages: true,
    canChangeOracleState: false,
    canUseGraphRAG: true,
    canUseMultiModel: true
  },
  lead: {
    canViewTeamData: true,
    canEditOwnProgress: true,
    canSendMessages: true,
    canChangeOracleState: true,
    canViewAllTeams: true,
    canSendBroadcasts: true,
    canEditAnyTeam: true,
    canUseGraphRAG: true,
    canUseMultiModel: true
  },
  mentor: {
    canViewTeamData: true,
    canEditOwnProgress: false,
    canSendMessages: true,
    canChangeOracleState: false,
    canViewAllTeams: true,
    canSendBroadcasts: true,
    canUseGraphRAG: true,
    canUseMultiModel: true
  },
  guest: {
    canViewTeamData: false,
    canEditOwnProgress: false,
    canSendMessages: true,
    canChangeOracleState: false,
    canUseGraphRAG: false,
    canUseMultiModel: false
  },
  unassigned: {
    canViewTeamData: false,
    canEditOwnProgress: false,
    canSendMessages: false,
    canChangeOracleState: false,
    canUseGraphRAG: false,
    canUseMultiModel: false
  }
};

export const SuperOracle = ({ selectedRole, teamId, userId }: SuperOracleProps) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<SuperOracleResponse[]>([]);
  const [activeTab, setActiveTab] = useState("chat");
  const [enableGraphRAG, setEnableGraphRAG] = useState(false);
  const [enableMultiModel, setEnableMultiModel] = useState(false);
  const [preferredModel, setPreferredModel] = useState<'auto' | 'openai' | 'gemini' | 'claude'>('auto');
  const [queryType, setQueryType] = useState<'chat' | 'resources' | 'connect' | 'analyze' | 'graph' | 'multi_model'>('chat');
  const { toast } = useToast();

  const permissions = rolePermissions[selectedRole];

  // Initialize GraphRAG and MultiModel based on role permissions
  useEffect(() => {
    setEnableGraphRAG(permissions.canUseGraphRAG || false);
    setEnableMultiModel(permissions.canUseMultiModel || false);
  }, [permissions]);

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
                receiver_role: 'builder' as any,
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
        // Handle slash commands through Super Oracle with enhanced AI capabilities
        let commandType = slashCommand.type;
        let enhancedQuery = slashCommand.query;
        
        // Enhance queries with context for better AI understanding
        switch (commandType) {
          case 'motivation':
            enhancedQuery = `Find motivation and inspiration for: ${slashCommand.query || 'startup success'}. Include success stories, motivational content, and actionable advice.`;
            commandType = 'resources';
            break;
          case 'status':
            enhancedQuery = `Show me comprehensive team status updates, progress tracking, and recent activities for the PieFi accelerator. Include team milestones, achievements, and upcoming goals.`;
            commandType = 'chat';
            break;
          case 'resources':
            enhancedQuery = `Find high-quality, relevant resources for: ${slashCommand.query}. Include tutorials, documentation, tools, and best practices. Prioritize the most current and authoritative sources.`;
            break;
          case 'connect':
            enhancedQuery = `Find relevant connections and networking opportunities for: ${slashCommand.query}. Include professionals, mentors, and experts in this field. Provide LinkedIn profiles and contact information when available.`;
            break;
          case 'find':
            enhancedQuery = `Search for and connect with: ${slashCommand.query}. Find relevant people, resources, and opportunities.`;
            commandType = 'connect';
            break;
          case 'help':
            enhancedQuery = `Provide comprehensive help and guidance for the PieFi accelerator. Show available commands, features, and how to get the most out of the system.`;
            commandType = 'chat';
            break;
          case 'message':
            enhancedQuery = `Help me send a message: ${slashCommand.query}. Provide guidance on effective communication and help format the message appropriately.`;
            commandType = 'chat';
            break;
          case 'update':
            enhancedQuery = `Help me update progress: ${slashCommand.query}. Provide guidance on effective progress tracking and milestone documentation.`;
            commandType = 'chat';
            break;
        }

        console.log('Enhanced slash command query:', enhancedQuery);

        // Route through Super Oracle with enhanced capabilities
        const response = await supabase.functions.invoke('super-oracle', {
          body: {
            query: enhancedQuery,
            type: commandType,
            role: selectedRole,
            teamId,
            userId,
            context: { 
              hasTeam: Boolean(teamId),
              commandType: slashCommand.type,
              originalQuery: slashCommand.query,
              isSlashCommand: true
            },
            preferredModel,
            enableGraphRAG: true, // Always enable GraphRAG for slash commands
            enableMultiModel: enableMultiModel
          }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        // Add response to history with enhanced metadata
        const newResponse: SuperOracleResponse = {
          ...response.data,
          commandType: slashCommand.type,
          commandExecuted: true,
          query: query,
          timestamp: new Date().toISOString()
        };

        setResponses(prev => [newResponse, ...prev]);
        setQuery("");

        toast({
          title: `/${slashCommand.type} executed with Super Oracle`,
          description: `Enhanced AI processing with ${response.data.model_used} and GraphRAG`,
        });

      } else {
        // Handle regular queries through Super Oracle
        console.log('Submitting to Super Oracle:', {
          query,
          type: queryType,
          enableGraphRAG,
          enableMultiModel,
          preferredModel
        });

        const response = await supabase.functions.invoke('super-oracle', {
          body: {
            query: query.trim(),
            type: queryType,
            role: selectedRole,
            teamId,
            userId,
            context: { hasTeam: Boolean(teamId) },
            preferredModel,
            enableGraphRAG,
            enableMultiModel
          }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const newResponse: SuperOracleResponse = {
          ...response.data,
          query: query,
          timestamp: new Date().toISOString()
        };

        setResponses(prev => [newResponse, ...prev]);
        setQuery("");

        toast({
          title: `Super Oracle Response`,
          description: `Processed in ${newResponse.processing_time}ms using ${newResponse.model_used}`,
        });
      }

    } catch (error) {
      console.error('Super Oracle query error:', error);
      toast({
        title: "Super Oracle Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderResponse = (response: SuperOracleResponse, index: number) => (
    <div key={index} className="space-y-4">
      {/* Query Display */}
      <div className="text-sm text-muted-foreground mb-2">
        <strong>You:</strong> {response.query}
      </div>

      {/* Model and Strategy Info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-xs">
          {response.model_used}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {response.search_strategy}
        </Badge>
        <span>Confidence: {Math.round(response.confidence * 100)}%</span>
        <span>Sources: {response.sources}</span>
        <span>Time: {response.processing_time}ms</span>
      </div>

      {/* GraphRAG Data */}
      {response.graph_data && (
        <Card className="glow-border bg-purple-500/5 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Network className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">🧠 Knowledge Graph</span>
              <Badge variant="outline">{response.graph_data.entities?.length || 0} entities</Badge>
              <Badge variant="outline">{response.graph_data.relationships?.length || 0} relationships</Badge>
            </div>
            
            {response.graph_data.entities && response.graph_data.entities.length > 0 && (
              <div className="space-y-2 mb-3">
                <h5 className="text-sm font-medium">Entities Found:</h5>
                <div className="flex flex-wrap gap-2">
                  {response.graph_data.entities.slice(0, 6).map((entity: any, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {entity.name} ({entity.type})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              Graph Confidence: {Math.round((response.graph_data.confidence || 0) * 100)}%
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-Model Insights */}
      {response.multi_model_insights && Object.keys(response.multi_model_insights).length > 0 && (
        <Card className="glow-border bg-green-500/5 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">🤖 Multi-Model Analysis</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(response.multi_model_insights).map(([model, insight]: [string, any]) => (
                <div key={model} className="p-3 rounded-lg bg-background/50 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs capitalize">{model}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {Math.round((insight.confidence || 0) * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {insight.answer?.substring(0, 100)}...
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            <h4 className="font-semibold text-sm text-primary">Super Oracle Response</h4>
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

  const commandExamples = {
    builder: [
      "/resources react hooks tutorials",
      "/connect frontend developers",
      "/find UI/UX designers",
      "/update completed authentication system",
      "/message mentors: need help with deployment",
      "Analyze my React component architecture",
      "Build a knowledge graph for my project"
    ],
    mentor: [
      "/resources startup funding guides", 
      "/connect experienced CTOs",
      "/find blockchain experts",
      "/message builders: great progress this week",
      "Analyze startup funding strategies",
      "Build knowledge graph for fintech trends"
    ],
    lead: [
      "/resources team management tools",
      "/connect venture capitalists",
      "/update milestone: all teams on track",
      "/message all: weekly check-in tomorrow",
      "Analyze team performance metrics",
      "Multi-model analysis of business strategy"
    ],
    guest: [
      "/motivation startup success stories",
      "/status show recent team updates",
      "What is the PieFi accelerator?",
      "Show me available resources"
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/20 ufo-pulse">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-glow">Super Oracle Command Center</h2>
          <p className="text-muted-foreground">Advanced AI with GraphRAG, Multi-Model AI, and Knowledge Graphs</p>
        </div>
        <Badge className="bg-primary/20 text-primary border-primary/30">
          {selectedRole} Mode
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 bg-card/50 backdrop-blur border-primary/20">
          <TabsTrigger value="chat" className="data-[state=active]:bg-primary/20">
            <MessageSquare className="h-4 w-4 mr-2" />
            Super Chat
          </TabsTrigger>
          <TabsTrigger value="graph" className="data-[state=active]:bg-primary/20">
            <Network className="h-4 w-4 mr-2" />
            GraphRAG
          </TabsTrigger>
          <TabsTrigger value="multi" className="data-[state=active]:bg-primary/20">
            <Layers className="h-4 w-4 mr-2" />
            Multi-Model
          </TabsTrigger>
          <TabsTrigger value="advanced" className="data-[state=active]:bg-primary/20">
            <Brain className="h-4 w-4 mr-2" />
            Advanced
          </TabsTrigger>
          <TabsTrigger value="commands" className="data-[state=active]:bg-primary/20">
            <Zap className="h-4 w-4 mr-2" />
            Commands
          </TabsTrigger>
          <TabsTrigger value="permissions" className="data-[state=active]:bg-primary/20">
            <Users className="h-4 w-4 mr-2" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary/20">
            <Cpu className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-6">
          {/* Query Input */}
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Brain className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary/60" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Ask the Super Oracle as a ${selectedRole}...`}
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

                {/* Query Type Selection */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Query Type:</span>
                    <Select value={queryType} onValueChange={(value: any) => setQueryType(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chat">Chat</SelectItem>
                        <SelectItem value="resources">Resources</SelectItem>
                        <SelectItem value="connect">Connect</SelectItem>
                        <SelectItem value="analyze">Analyze</SelectItem>
                        <SelectItem value="graph">Graph</SelectItem>
                        <SelectItem value="multi_model">Multi-Model</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Natural Language Examples */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">✨ Try these Super Oracle commands:</p>
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
                  <Brain className="h-8 w-8 text-primary/60 mx-auto mb-3" />
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Welcome to the Super Oracle! Your unified AI agent with GraphRAG, multi-model AI, and advanced capabilities.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRole === 'guest' 
                        ? 'Ask questions about PieFi and available resources'
                        : 'Use slash commands like /resources, /connect, /find or ask natural questions. All enhanced with GraphRAG and multi-model AI!'
                      }
                    </p>
                    <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-primary font-medium mb-2">🚀 Enhanced Features Available:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Badge variant="outline" className="text-xs">GraphRAG Knowledge Graphs</Badge>
                        <Badge variant="outline" className="text-xs">Multi-Model AI (GPT-4, Gemini, Claude)</Badge>
                        <Badge variant="outline" className="text-xs">Advanced Vector Search</Badge>
                        <Badge variant="outline" className="text-xs">Slash Commands</Badge>
                        <Badge variant="outline" className="text-xs">Team Integration</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="graph" className="space-y-6">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>GraphRAG Knowledge Graph</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={enableGraphRAG}
                    onCheckedChange={setEnableGraphRAG}
                    disabled={!permissions.canUseGraphRAG}
                  />
                  <span className="text-sm">Enable GraphRAG Knowledge Graph</span>
                  {!permissions.canUseGraphRAG && (
                    <Badge variant="outline" className="text-xs">Guest users cannot access</Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  GraphRAG builds knowledge graphs from your queries, connecting entities and relationships
                  to provide deeper context and more accurate responses.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-primary">🔍 Entity Extraction</h4>
                    <p className="text-xs text-muted-foreground">
                      Automatically identifies people, companies, technologies, and concepts
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-primary">🔗 Relationship Mining</h4>
                    <p className="text-xs text-muted-foreground">
                      Discovers connections between entities in your knowledge base
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-primary">🧠 Graph Traversal</h4>
                    <p className="text-xs text-muted-foreground">
                      Navigates the knowledge graph to find relevant context
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-primary">📊 Confidence Scoring</h4>
                    <p className="text-xs text-muted-foreground">
                      Measures the reliability of graph-based insights
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multi" className="space-y-6">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Multi-Model AI Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={enableMultiModel}
                    onCheckedChange={setEnableMultiModel}
                    disabled={!permissions.canUseMultiModel}
                  />
                  <span className="text-sm">Enable Multi-Model AI Analysis</span>
                  {!permissions.canUseMultiModel && (
                    <Badge variant="outline" className="text-xs">Guest users cannot access</Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Leverage multiple AI models (OpenAI GPT-4, Google Gemini, Anthropic Claude) 
                  for comprehensive analysis and higher confidence responses.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Preferred Model:</label>
                    <Select value={preferredModel} onValueChange={(value: any) => setPreferredModel(value)}>
                      <SelectTrigger className="w-full mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-Select (Recommended)</SelectItem>
                        <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="claude">Anthropic Claude</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <h4 className="font-medium text-blue-400 mb-2">OpenAI GPT-4</h4>
                      <p className="text-xs text-muted-foreground">
                        Excellent for technical tasks, code generation, and structured analysis
                      </p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <h4 className="font-medium text-green-400 mb-2">Google Gemini</h4>
                      <p className="text-xs text-muted-foreground">
                        Strong on creative tasks, design, and resource discovery
                      </p>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <h4 className="font-medium text-purple-400 mb-2">Anthropic Claude</h4>
                      <p className="text-xs text-muted-foreground">
                        Excels at analysis, conversation, and strategic thinking
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>🚀 Advanced AI Capabilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-primary">🧠 GraphRAG Knowledge Engine</h4>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <span>Entity Extraction & Recognition</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <span>Relationship Mining & Mapping</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <span>Knowledge Graph Traversal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <span>Context-Aware Responses</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <span>Confidence Scoring</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-primary">🤖 Multi-Model AI Orchestration</h4>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      <span>OpenAI GPT-4 (Technical Tasks)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <span>Google Gemini (Creative Tasks)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                      <span>Anthropic Claude (Analysis)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                      <span>Intelligent Model Routing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                      <span>Response Synthesis</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-primary">🔍 Enhanced Search & Retrieval</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h5 className="font-medium text-blue-400 mb-2">Vector Search</h5>
                    <p className="text-xs text-muted-foreground">
                      Advanced semantic search with embeddings and similarity matching
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <h5 className="font-medium text-green-400 mb-2">Hybrid Search</h5>
                    <p className="text-xs text-muted-foreground">
                      Combines traditional search with AI-powered insights
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <h5 className="font-medium text-purple-400 mb-2">Context Reranking</h5>
                    <p className="text-xs text-muted-foreground">
                      Intelligent result ranking based on user context and preferences
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-primary">⚡ Performance Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing Time Tracking</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Confidence Metrics</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Search Strategy Logging</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Fallback Handling</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Error Recovery</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Performance Monitoring</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                <h5 className="font-medium text-primary mb-2">🎯 What This Means for You</h5>
                <p className="text-sm text-muted-foreground">
                  The Super Oracle combines the best of multiple AI models with advanced knowledge graphs to provide 
                  deeper, more contextual, and more accurate responses. Every query is enhanced with GraphRAG insights, 
                  and the system automatically selects the optimal AI model for your specific needs. This results in 
                  responses that are not just accurate, but truly intelligent and actionable.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commands" className="space-y-6">
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

              <div className="space-y-2">
                <h4 className="font-medium text-primary">🧠 Advanced AI Features</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• "Build a knowledge graph for [topic]"</p>
                  <p>• "Analyze [subject] using multiple AI models"</p>
                  <p>• "Find deep connections between [concept1] and [concept2]"</p>
                  <p>• "Multi-model analysis of [topic]"</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
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

                  <div className={`flex items-center gap-3 p-3 rounded-lg ${permissions.canUseGraphRAG ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <div className={`w-3 h-3 rounded-full ${permissions.canUseGraphRAG ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="text-sm">GraphRAG Access</span>
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

                  <div className={`flex items-center gap-3 p-3 rounded-lg ${permissions.canUseMultiModel ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <div className={`w-3 h-3 rounded-full ${permissions.canUseMultiModel ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="text-sm">Multi-Model AI</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Super Oracle Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-primary">Current Configuration</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>GraphRAG:</span>
                      <Badge variant={enableGraphRAG ? "default" : "secondary"}>
                        {enableGraphRAG ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Multi-Model:</span>
                      <Badge variant={enableMultiModel ? "default" : "secondary"}>
                        {enableMultiModel ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Preferred Model:</span>
                      <Badge variant="outline" className="capitalize">
                        {preferredModel}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Query Type:</span>
                      <Badge variant="outline" className="capitalize">
                        {queryType.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-primary">Advanced Features</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Slash Commands:</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Team Integration:</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Progress Tracking:</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Messaging:</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
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