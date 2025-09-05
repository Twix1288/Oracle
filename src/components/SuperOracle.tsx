import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Send } from "lucide-react";
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
  search_strategy: string;
  // Query and timestamp
  query?: string;
  timestamp?: string;
  // Journey-specific responses
  detected_stage?: 'ideation' | 'development' | 'testing' | 'launch' | 'growth';
  feedback?: string;
  summary?: string;
  suggested_actions?: string[];
  // Team management responses
  command_result?: any;
  intent_parsed?: any;
  // RAG-specific responses
  documents?: any[];
  updates?: any[];
  // Resources and connections
  resources?: any[];
  connections?: any[];
  // Vectorization results
  vectorized?: boolean;
  similarity_score?: number;
  related_content?: any[];
  // GraphRAG results
  knowledge_graph?: any;
  graph_nodes?: any[];
  graph_relationships?: any[];
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
            }
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
          title: `/${slashCommand.type} executed`,
          description: `Processed with ${response.data.model_used}`,
        });

      } else {
        // Handle regular queries through Super Oracle
        const response = await supabase.functions.invoke('super-oracle', {
          body: {
            query: query.trim(),
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
          {response.model_used || 'GPT-4o'}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {response.search_strategy || 'RAG Search'}
        </Badge>
        <span>Confidence: {Math.round((response.confidence || 0) * 100)}%</span>
        <span>Sources: {response.sources || 0}</span>
        <span>Time: {response.processing_time || 0}ms</span>
      </div>

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

      {/* Resources Section */}
      {response.resources && response.resources.length > 0 && (
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-green-500/20">
                <Sparkles className="h-3 w-3 text-green-500" />
              </div>
              <h4 className="font-semibold text-sm text-green-600">Learning Resources</h4>
              <Badge variant="outline" className="text-xs">
                {response.resources?.length || 0} resources
              </Badge>
            </div>
            
            <div className="space-y-3">
              {response.resources?.map((resource, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-background/50 border border-green-200/20">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-sm text-green-700 mb-1">
                        <a 
                          href={resource.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {resource.title}
                        </a>
                      </h5>
                      <p className="text-xs text-muted-foreground mb-2">{resource.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-green-100/50">
                          {resource.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-blue-100/50">
                          {resource.difficulty}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{resource.source}</span>
                      </div>
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
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-blue-500/20">
                <Sparkles className="h-3 w-3 text-blue-500" />
              </div>
              <h4 className="font-semibold text-sm text-blue-600">Connections</h4>
              <Badge variant="outline" className="text-xs">
                {response.connections?.length || 0} connections
              </Badge>
            </div>
            
            <div className="space-y-3">
              {response.connections?.map((connection, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-background/50 border border-blue-200/20">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-sm text-blue-700 mb-1">
                        {connection.full_name || connection.name}
                      </h5>
                      <p className="text-xs text-muted-foreground mb-2">
                        {connection.title || connection.bio} {connection.company && `at ${connection.company}`}
                      </p>
                      {connection.skills && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {connection.skills.map((skill, skillIdx) => (
                            <Badge key={skillIdx} variant="outline" className="text-xs bg-blue-100/50">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {connection.expertise && (
                        <p className="text-xs text-muted-foreground mb-2">{connection.expertise}</p>
                      )}
                      {connection.linkedin && (
                        <a 
                          href={connection.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View LinkedIn Profile
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vectorization Results */}
      {response.vectorized && (
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-purple-500/20">
                <Sparkles className="h-3 w-3 text-purple-500" />
              </div>
              <h4 className="font-semibold text-sm text-purple-600">AI Intelligence</h4>
              <Badge variant="outline" className="text-xs">
                Vector Search
              </Badge>
            </div>
            
            <div className="p-3 rounded-lg bg-background/50 border border-purple-200/20">
              <p className="text-sm text-muted-foreground">
                Similarity Score: <span className="font-medium text-purple-600">{(response.similarity_score * 100).toFixed(1)}%</span>
              </p>
              {response.related_content && response.related_content.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Found {response.related_content.length} related content pieces
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Knowledge Graph Results */}
      {response.knowledge_graph && response.graph_nodes && response.graph_nodes.length > 0 && (
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-orange-500/20">
                <Sparkles className="h-3 w-3 text-orange-500" />
              </div>
              <h4 className="font-semibold text-sm text-orange-600">Knowledge Graph</h4>
              <Badge variant="outline" className="text-xs">
                {response.graph_nodes.length} nodes
              </Badge>
            </div>
            
            <div className="p-3 rounded-lg bg-background/50 border border-orange-200/20">
              <p className="text-sm text-muted-foreground mb-2">
                Built knowledge graph with {response.graph_nodes.length} nodes and {response.graph_relationships?.length || 0} relationships
              </p>
              <div className="text-xs text-muted-foreground">
                <p>Query: {response.knowledge_graph.query}</p>
                <p>User Context: {response.knowledge_graph.user_context}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
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
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-glow">Oracle</h2>
          <p className="text-muted-foreground">Ask the Oracle anything</p>
        </div>
        <Badge className="bg-primary/20 text-primary border-primary/30">
          {selectedRole} Mode
        </Badge>
      </div>

      {/* Query Input */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Sparkles className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary/60" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Ask the Oracle as a ${selectedRole}...`}
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
                  Welcome to the Oracle! Your AI assistant for the PieFi accelerator.
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedRole === 'guest' 
                    ? 'Ask questions about PieFi and available resources'
                    : 'Use slash commands like /resources, /connect, /find or ask natural questions.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};