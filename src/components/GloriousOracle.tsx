import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Brain, Rocket, Send, Loader2, Zap, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UserRole } from "@/types/oracle";

interface GloriousOracleProps {
  selectedRole: UserRole;
  teamId?: string;
  onSubmitUpdate?: (params: { teamId: string; content: string; type: any; createdBy?: string }) => void;
}

export const GloriousOracle = ({ selectedRole, teamId, onSubmitUpdate }: GloriousOracleProps) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Array<{ query: string; response: string; timestamp: Date }>>([]);

  // Auto-suggestions based on role
  const getSuggestions = () => {
    switch (selectedRole) {
      case 'builder':
        return [
          "Help me prioritize my tasks for today",
          "What should I focus on for our MVP?",
          "How can we improve our team collaboration?",
          "Suggest next steps for our project milestone"
        ];
      case 'mentor':
        return [
          "Summarize recent team progress and blockers",
          "Identify teams needing immediate attention", 
          "Suggest resources for struggling teams",
          "Help me prepare for team check-ins"
        ];
      case 'lead':
        return [
          "Overview of all team statuses and health",
          "Identify cross-team collaboration opportunities",
          "Risk assessment across all projects",
          "Strategic recommendations for the program"
        ];
      case 'guest':
        return [
          "What can I learn from team updates?",
          "Show me interesting project insights",
          "Help me understand the program structure",
          "What are the key learnings from teams?"
        ];
      default:
        return [];
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) {
      toast.error("Please enter a query");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-oracle', {
        body: { query, role: selectedRole, teamId }
      });

      if (error) throw error;

      const oracleResponse = data?.answer || "I couldn't generate a response at this time.";
      setResponse(oracleResponse);
      
      // Add to conversation history
      setConversationHistory(prev => [...prev, {
        query,
        response: oracleResponse,
        timestamp: new Date()
      }]);

      // Auto-log important insights as updates for builders
      if (selectedRole === 'builder' && teamId && onSubmitUpdate && oracleResponse.length > 100) {
        const shouldLog = query.toLowerCase().includes('progress') || 
                         query.toLowerCase().includes('milestone') ||
                         query.toLowerCase().includes('blocker') ||
                         query.toLowerCase().includes('next step');
        
        if (shouldLog) {
          onSubmitUpdate({
            teamId,
            content: `Oracle Insight: ${query} - ${oracleResponse.substring(0, 200)}...`,
            type: 'oracle_insight',
            createdBy: 'Oracle Assistant'
          });
        }
      }

      setQuery("");
    } catch (error: any) {
      toast.error(`Oracle error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  return (
    <div className="space-y-6">
      {/* Glorious Header */}
      <Card className="glow-border bg-gradient-to-br from-primary/5 via-card/50 to-accent/5 backdrop-blur border-primary/30">
        <CardHeader className="text-center pb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/30 animate-pulse blur-xl"></div>
              <div className="relative p-4 rounded-full bg-primary/20 ufo-pulse">
                <Brain className="h-12 w-12 text-primary" />
              </div>
            </div>
          </div>
          <CardTitle className="text-4xl font-bold cosmic-text bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Oracle Intelligence Hub
          </CardTitle>
          <p className="text-xl text-muted-foreground mt-2">
            Your AI-powered mission control and strategic advisor
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge className="bg-primary/20 text-primary border-primary/30">
              Role: {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
            </Badge>
            {teamId && (
              <Badge className="bg-accent/20 text-accent border-accent/30">
                Team Context: Active
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Oracle Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Query Interface */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Ask the Oracle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Ask me anything about ${selectedRole === 'builder' ? 'your team progress, blockers, or next steps' : selectedRole === 'mentor' ? 'team health, guidance strategies, or resource allocation' : selectedRole === 'lead' ? 'program overview, strategic insights, or cross-team analysis' : 'the program, teams, and project insights'}...`}
                  className="min-h-[120px] bg-background/50 border-primary/20 focus:border-primary/40"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleQuery();
                    }
                  }}
                />
                <Button 
                  onClick={handleQuery}
                  disabled={isLoading || !query.trim()}
                  className="w-full ufo-gradient hover:opacity-90"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Oracle is thinking...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Consult Oracle
                    </>
                  )}
                </Button>
              </div>

              {response && (
                <div className="p-6 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    <h4 className="font-semibold text-primary">Oracle Response</h4>
                  </div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {response}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation History */}
          {conversationHistory.length > 0 && (
            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" />
                  Recent Consultations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {conversationHistory.slice(-3).reverse().map((item, index) => (
                    <div key={index} className="p-4 rounded-lg bg-background/30 border border-primary/10">
                      <div className="text-sm font-medium text-primary mb-2">
                        Q: {item.query}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {item.response.substring(0, 200)}...
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Suggestions Sidebar */}
        <div className="space-y-6">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-accent" />
                Quick Queries
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Try these {selectedRole}-specific prompts
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getSuggestions().map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full text-left justify-start h-auto p-3 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="text-sm leading-tight">
                      {suggestion}
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Oracle Stats */}
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Oracle Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Consultations Today</span>
                <span className="font-semibold">{conversationHistory.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Role Context</span>
                <Badge variant="outline" className="text-xs">
                  {selectedRole}
                </Badge>
              </div>
              {teamId && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Team Context</span>
                  <Badge variant="outline" className="text-xs bg-primary/10">
                    Active
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Oracle Wisdom */}
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent animate-pulse" />
                Oracle Wisdom
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground leading-relaxed">
                {selectedRole === 'builder' && "I help you navigate challenges, prioritize tasks, and accelerate your team's progress. Ask me about blockers, next steps, or strategic decisions."}
                {selectedRole === 'mentor' && "I provide insights across all your teams, identify patterns, and suggest guidance strategies. Use me to prepare for check-ins and spot early warning signs."}
                {selectedRole === 'lead' && "I offer program-wide visibility, strategic insights, and cross-team analysis. Consult me for resource allocation, risk assessment, and optimization opportunities."}
                {selectedRole === 'guest' && "I share knowledge and insights from the entire program. Explore project learnings, discover interesting patterns, and understand the innovation happening here."}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};