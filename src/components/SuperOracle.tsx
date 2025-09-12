import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole, UpdateType } from "@/types/oracle";
import ReactMarkdown from "react-markdown";
import { FeedbackSystem } from "./FeedbackSystem";

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
  error?: string;
  // Learning system fields
  oracle_log_id?: string;
  learning_insights?: any;
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
  mentor: {
    canViewTeamData: true,
    canEditOwnProgress: true,
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
  // Using sonner toast directly
  const { user, profile } = useAuth();

  const permissions = rolePermissions[selectedRole];

  // Enhanced slash command patterns - the main Oracle commands
  const detectSlashCommand = (text: string) => {
    const trimmed = text.trim();
    
    // New Oracle commands based on user requirements
    if (trimmed.startsWith('/ask oracle ')) {
      return { type: 'ask_oracle', query: trimmed.substring(12).trim() };
    }
    if (trimmed.startsWith('/suggest collaboration')) {
      return { type: 'suggest_collaboration', query: trimmed.substring(22).trim() || 'suggest collaboration opportunities' };
    }
    if (trimmed.startsWith('/view connections')) {
      return { type: 'view_connections', query: 'show my connections and suggest new ones' };
    }
    if (trimmed.startsWith('/offer help')) {
      return { type: 'offer_help', query: trimmed.substring(11).trim() || 'help me offer my skills to others' };
    }
    if (trimmed.startsWith('/join workshop')) {
      return { type: 'join_workshop', query: trimmed.substring(14).trim() || 'find workshops to join' };
    }
    if (trimmed.startsWith('/create project')) {
      return { type: 'create_project', query: trimmed.substring(15).trim() || 'help me create a new project' };
    }
    if (trimmed.startsWith('/post feed')) {
      return { type: 'post_feed', query: trimmed.substring(10).trim() || 'help me create a feed post' };
    }
    if (trimmed.startsWith('/create feed')) {
      return { type: 'create_feed', query: trimmed.substring(12).trim() || 'help me create a feed item' };
    }
    
    // Functional commands that actually execute actions
    if (trimmed.startsWith('/message ')) {
      const messageMatch = trimmed.match(/^\/message\s+([^:]+):\s*(.+)$/);
      if (messageMatch) {
        return { 
          type: 'send_message', 
          query: trimmed,
          recipient: messageMatch[1].trim(),
          message: messageMatch[2].trim()
        };
      }
      return { type: 'send_message', query: trimmed.substring(9).trim() };
    }
    if (trimmed.startsWith('/update ')) {
      return { 
        type: 'create_update', 
        query: trimmed.substring(8).trim() || 'help me create a project update'
      };
    }
    
    // AI-powered commands
    if (trimmed.startsWith('/ask oracle ')) {
      return { type: 'ask_oracle', query: trimmed.substring(12).trim() };
    }
    if (trimmed.startsWith('/view connections')) {
      return { type: 'view_connections', query: 'show me my network connections' };
    }
    if (trimmed.startsWith('/offer help')) {
      return { type: 'offer_help', query: 'find opportunities to help others' };
    }
    if (trimmed.startsWith('/join workshop')) {
      return { type: 'join_workshop', query: 'find workshops to join' };
    }
    if (trimmed.startsWith('/suggest collaboration')) {
      return { type: 'suggest_collaboration', query: 'suggest collaboration opportunities' };
    }
    
    // Legacy commands for backward compatibility
    if (trimmed.startsWith('/help')) {
      return { type: 'help', query: 'help with Oracle commands and features' };
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
              title: `Progress Update - ${new Date().toLocaleDateString()}`,
              content: progressContent,
              type: 'progress' as const,
              user_id: userId || 'system'
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
        
        // Handle functional commands that execute actions directly
        if (commandType === 'send_message') {
          try {
            if (!user?.id) {
              throw new Error('User not authenticated');
            }
            
            const recipient = slashCommand.recipient || 'team';
            const message = slashCommand.message || slashCommand.query;
            
            // Create the message in the database using the correct schema
            const { data: messageData, error: messageError } = await supabase
              .from('messages')
              .insert({
                content: message,
                sender_id: user.id,
                team_id: teamId || null
              })
              .select()
              .single();

            if (messageError) throw messageError;

            // Create a success response
            const successResponse: SuperOracleResponse = {
              answer: `✅ **Message sent successfully!**\n\n**Content:** ${message}\n**Recipient:** ${recipient}\n**Message ID:** ${messageData.id}\n\nYour message has been delivered and is now visible in the team chat.`,
              sources: 0,
              context_used: true,
              model_used: 'oracle_command',
              confidence: 1.0,
              processing_time: 0,
              search_strategy: 'direct_execution',
              query: query,
              timestamp: new Date().toISOString()
            };

            setResponses(prev => [successResponse, ...prev]);
            setQuery("");
            toast.success(`Message sent to ${recipient}`);
            return;
          } catch (error) {
            console.error('Message sending error:', error);
            toast.error(`Failed to send message: ${error.message}`);
            return;
          }
        }

        if (commandType === 'create_update') {
          try {
            if (!user?.id) {
              throw new Error('User not authenticated');
            }
            
            const updateContent = slashCommand.query;
            
            // Create the update in the database using the correct schema
            const { data: updateData, error: updateError } = await supabase
              .from('updates')
              .insert({
                title: `Project Update - ${new Date().toLocaleDateString()}`,
                content: updateContent,
                type: 'general',
                user_id: user.id
              })
              .select()
              .single();

            if (updateError) throw updateError;

            // Create a success response
            const successResponse: SuperOracleResponse = {
              answer: `✅ **Project update created successfully!**\n\n**Title:** ${updateData.title}\n**Content:** ${updateContent}\n**Update ID:** ${updateData.id}\n\nYour update has been posted and is now visible to your team and network.`,
              sources: 0,
              context_used: true,
              model_used: 'oracle_command',
              confidence: 1.0,
              processing_time: 0,
              search_strategy: 'direct_execution',
              query: query,
              timestamp: new Date().toISOString()
            };

            setResponses(prev => [successResponse, ...prev]);
            setQuery("");
            toast.success(`Project update created successfully`);
            return;
          } catch (error) {
            console.error('Update creation error:', error);
            toast.error(`Failed to create update: ${error.message}`);
            return;
          }
        }
        
        // Enhance queries with context for better AI understanding
        switch (commandType) {
          case 'ask_oracle':
            enhancedQuery = `Answer this question with detailed insights and evidence: ${slashCommand.query}. Provide comprehensive analysis and actionable recommendations.`;
            commandType = 'chat';
            break;
          case 'suggest_collaboration':
            enhancedQuery = `Analyze my profile and projects to suggest relevant collaboration opportunities. Find builders, projects, and teams that would be good matches for collaboration. ${slashCommand.query}`;
            commandType = 'connect';
            break;
          case 'view_connections':
            enhancedQuery = `Show me my current connections and suggest new people I should connect with based on my projects, skills, and goals. Analyze the network data and provide connection insights.`;
            commandType = 'connections_analysis';
            break;
          case 'offer_help':
            enhancedQuery = `Help me offer my skills and expertise to other builders. Analyze my skills and suggest who I can help and how. ${slashCommand.query}`;
            commandType = 'skill_matching';
            break;
          case 'join_workshop':
            enhancedQuery = `Find workshops and learning opportunities that match my interests and skill level. Suggest workshops I should join. ${slashCommand.query}`;
            commandType = 'workshop_matching';
            break;
          case 'create_project':
            enhancedQuery = `Guide me through creating a new project. Ask about project details, goals, tech stack, team needs, and help structure the project properly. ${slashCommand.query}`;
            commandType = 'project_creation';
            break;
          case 'post_feed':
          case 'create_feed':
            enhancedQuery = `Help me create an engaging feed post about my project progress, achievements, or updates. Provide suggestions for content, format, and engagement. ${slashCommand.query}`;
            commandType = 'content_creation';
            break;
          case 'help':
            enhancedQuery = `Show available Oracle commands and features:
            
            **Core Commands:**
            - \`/ask oracle [question]\` - Ask Oracle any question for detailed insights
            - \`/suggest collaboration\` - Get AI-powered collaboration suggestions
            - \`/view connections\` - Analyze your network and suggest new connections
            - \`/offer help\` - Find opportunities to help other builders
            - \`/join workshop\` - Find workshops and learning opportunities
            - \`/create project\` - Get help creating a new project
            - \`/post feed\` - Get help creating feed content
            
            **Functional Commands:**
            - \`/message [recipient]: [message]\` - Send a message to someone
            - \`/update [content]\` - Create a project update
            
            **Features:**
            - Natural language queries (just type normally)
            - Evidence-based suggestions with reasoning
            - Network analysis and relationship insights
            - Skill matching and collaboration opportunities
            - Learning feedback loop for continuous improvement
            
            Oracle provides intelligent, context-aware responses with evidence and actionable insights.`;
            commandType = 'chat';
            break;
        }

        console.log('Enhanced slash command query:', enhancedQuery);

        // For certain commands, enhance the query for better AI understanding
        if (['view_connections', 'offer_help', 'join_workshop', 'suggest_collaboration'].includes(commandType)) {
          // Enhance the query with specific context for better AI responses
          switch (commandType) {
            case 'view_connections':
              enhancedQuery = `Analyze my network and suggest new connections. Show me who I should connect with and why. ${enhancedQuery}`;
              break;
            case 'offer_help':
              enhancedQuery = `Find opportunities where I can help other builders. Show me people who need help with skills I have. ${enhancedQuery}`;
              break;
            case 'join_workshop':
              enhancedQuery = `Find workshops and learning opportunities that would be valuable for me. Show me upcoming workshops I should join. ${enhancedQuery}`;
              break;
            case 'suggest_collaboration':
              enhancedQuery = `Suggest collaboration opportunities. Find people I could work with on projects. ${enhancedQuery}`;
              break;
          }
        }

        // Route through Super Oracle with enhanced capabilities
        const response = await supabase.functions.invoke('super-oracle', {
          body: {
            query: enhancedQuery,
            type: commandType,
            role: selectedRole,
            teamId,
            userId: user?.id || userId,
            context: { 
              hasTeam: Boolean(teamId),
              commandType: slashCommand.type,
              originalQuery: slashCommand.query,
              isSlashCommand: true,
              userProfile: profile,
              userRole: selectedRole,
              userSkills: profile?.skills || [],
              userGoals: profile?.bio || '',
              userProjects: profile?.bio || ''
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

        console.log('📤 Slash command response received:', newResponse);
        setResponses(prev => [newResponse, ...prev]);
        setQuery("");

        toast.success(`/${slashCommand.type} executed - Processed with ${response.data.model_used}`);

      } else {
        // Handle regular queries through Super Oracle
        const response = await supabase.functions.invoke('super-oracle', {
          body: {
            query: query.trim(),
            type: 'chat',
            role: selectedRole,
            teamId,
            userId: user?.id || userId,
            context: { 
              hasTeam: Boolean(teamId),
              userProfile: profile,
              userRole: selectedRole,
              userSkills: profile?.skills || [],
              userGoals: profile?.bio || '',
              userProjects: profile?.bio || '',
              userBio: profile?.bio || '',
              userLevel: profile?.experience_level || 'novice'
            }
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

        console.log('📤 Regular query response received:', newResponse);
        setResponses(prev => [newResponse, ...prev]);
        setQuery("");

        toast.success(`Super Oracle Response - Processed in ${newResponse.processing_time}ms using ${newResponse.model_used}`);
      }

    } catch (error) {
      console.error('Super Oracle query error:', error);
      toast.error("Super Oracle Error - Failed to process your request. Please try again.");
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
              {response.answer ? (
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
              ) : (
                <div className="text-muted-foreground text-sm">
                  No response generated. Please try your query again.
                  {response.error && (
                    <div className="mt-2 text-red-500 text-xs">
                      Error: {response.error}
                    </div>
                  )}
                </div>
              )}
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
                {response.resources.length} resources
              </Badge>
            </div>
            
            <div className="space-y-3">
              {response.resources.map((resource, idx) => (
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
                {response.connections.length} connections
              </Badge>
            </div>
            
            <div className="space-y-3">
              {response.connections.map((connection, idx) => (
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

      {/* Feedback System */}
      {response.oracle_log_id && (
        <FeedbackSystem
          oracleResponseId={response.oracle_log_id}
          query={response.query || ''}
          response={response.answer}
          modelUsed={response.model_used}
          confidence={response.confidence}
          onFeedbackSubmitted={(feedback) => {
            console.log('Feedback submitted:', feedback);
            // Trigger learning loop analysis
            supabase.functions.invoke('oracle-learning-loop', {
              body: {
                oracle_log_id: response.oracle_log_id,
                feedback_data: feedback,
                action: 'analyze_feedback'
              }
            }).catch(console.error);
          }}
        />
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
    guest: [
      "/motivation startup success stories",
      "/status show recent team updates",
      "What is the PieFi accelerator?",
      "Show me available resources"
    ],
    unassigned: [
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