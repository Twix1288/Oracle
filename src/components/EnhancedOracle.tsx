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
  }
};

export const EnhancedOracle = ({ selectedRole, teamId, userId }: EnhancedOracleProps) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<OracleResponse[]>([]);
  const [activeTab, setActiveTab] = useState("chat");
  const { toast } = useToast();

  const permissions = rolePermissions[selectedRole];

  // Natural language command patterns
  const commandPatterns = {
    logProgress: /^(log|update|record|add)\s+(today'?s?\s+)?(progress|update|work|status)[:.]?\s*(.*)/i,
    sendMessage: /^(send|message|tell|notify)\s+(.*?)\s*[:.]?\s*(.*)/i,
    getTeamStatus: /^(what|show|get|check)\s+(did|has|is)\s+(.*?)\s+(do|done|doing|update|status)/i,
    broadcastUpdate: /^(broadcast|announce|send\s+to\s+all|tell\s+everyone)[:.]?\s*(.*)/i,
    createReminder: /^(remind|schedule|set\s+reminder)\s+(.*?)\s+(at|on|in)\s+(.*)/i
  };

  const detectCommand = (text: string) => {
    for (const [commandType, pattern] of Object.entries(commandPatterns)) {
      const match = text.match(pattern);
      if (match) {
        return { type: commandType, match, hasPermission: checkCommandPermission(commandType) };
      }
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
      // Check for natural language commands
      const command = detectCommand(query);
      let commandResult = null;

      if (command) {
        if (!command.hasPermission) {
          toast({
            title: "Permission Denied",
            description: `Your role (${selectedRole}) doesn't have permission to execute this command.`,
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        commandResult = await executeCommand(command.type, command.match, query);
      }

      // Always send to Oracle for enhanced response
      const { data, error } = await supabase.functions.invoke('enhanced-oracle', {
        body: { 
          query, 
          role: selectedRole, 
          teamId,
          userId,
          commandExecuted: Boolean(commandResult),
          commandType: command?.type,
          commandResult 
        }
      });

      if (error) throw error;

      const response: OracleResponse = {
        ...data,
        commandExecuted: Boolean(commandResult),
        commandType: command?.type,
        commandResult
      };

      setResponses(prev => [response, ...prev]);
      setQuery("");

      if (commandResult?.success) {
        toast({
          title: "Command Executed",
          description: commandResult.message
        });
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

  const naturalLanguageExamples = {
    builder: [
      "Log today's progress: completed user authentication",
      "What blockers should I focus on today?",
      "Show me my team's latest updates"
    ],
    mentor: [
      "What did Team Alpha do this week?", 
      "Send message to John: great progress on the API",
      "Which teams need the most attention?"
    ],
    lead: [
      "Broadcast: submit presentations by Friday",
      "What's the overall program health?",
      "Log milestone: MVP development complete"
    ],
    guest: [
      "What is this incubator program about?",
      "How does the mentorship process work?",
      "What types of teams are in the program?"
    ]
  };

  const renderResponse = (response: OracleResponse, index: number) => (
    <div key={index} className="space-y-4">
      {/* Command Execution Result */}
      {response.commandExecuted && response.commandResult && (
        <Card className="glow-border bg-primary/5 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Command Executed</span>
            </div>
            <p className="text-sm">{response.commandResult.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Structured Oracle Response */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-full bg-primary/20">
              <Sparkles className="h-3 w-3 text-primary" />
            </div>
            <h4 className="font-semibold text-sm text-primary">Oracle Transmission</h4>
            {response.sources > 0 && (
              <Badge variant="outline" className="text-xs">
                {response.sources} sources
              </Badge>
            )}
          </div>

          {/* Structured Sections */}
          {(response.sections || response.commandResult?.sections) && (
            <div className="space-y-3">
              {(response.sections?.update || response.commandResult?.sections?.update) && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">📝 Update</span>
                  </div>
                  <p className="text-sm">{response.sections?.update || response.commandResult?.sections?.update}</p>
                </div>
              )}

              {(response.sections?.progress || response.commandResult?.sections?.progress) && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">📊 Progress</span>
                  </div>
                  <p className="text-sm">{response.sections?.progress || response.commandResult?.sections?.progress}</p>
                </div>
              )}

              {(response.sections?.event || response.commandResult?.sections?.event) && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-400">📅 Event</span>
                  </div>
                  <p className="text-sm">{response.sections?.event || response.commandResult?.sections?.event}</p>
                </div>
              )}
            </div>
          )}

          {/* Main Oracle Response */}
          <div className="space-y-2">
            <div className="text-sm leading-relaxed whitespace-pre-wrap space-y-2">
              <ReactMarkdown
                components={{
                  h1: ({...props}) => <strong {...props} />,
                  h2: ({...props}) => <strong {...props} />,
                  h3: ({...props}) => <strong {...props} />,
                  ul: ({...props}) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                  ol: ({...props}) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
                  li: ({...props}) => <li className="mb-1" {...props} />,
                  strong: ({...props}) => <strong className="font-semibold" {...props} />,
                  p: ({...props}) => <p className="mb-2" {...props} />,
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
                  <p className="text-sm text-muted-foreground">✨ Try these natural language commands:</p>
                  <div className="flex flex-wrap gap-2">
                    {naturalLanguageExamples[selectedRole].map((example, index) => (
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

          {/* Responses */}
          <div className="space-y-6">
            {responses.map((response, index) => renderResponse(response, index))}
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