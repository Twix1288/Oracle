import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Zap } from "lucide-react";
import type { UserRole } from "@/types/oracle";

interface OracleQueryProps {
  onQuery: (query: string, role: UserRole) => void;
  isLoading: boolean;
  response?: any;
  selectedRole: UserRole;
}

export const OracleQuery = ({ onQuery, isLoading, response, selectedRole }: OracleQueryProps) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onQuery(query.trim(), selectedRole);
    }
  };

  const suggestedQueries = {
    builder: [
      "What GraphRAG insights can you share about React development?",
      "How can I improve my React component architecture?",
      "Find me collaborators with complementary skills",
      "What resources are available for technical challenges?",
      "Analyze the knowledge graph for frontend technologies"
    ],
    mentor: [
      "Which teams need the most attention according to GraphRAG?",
      "What are common challenges across my teams?",
      "How can I better support struggling teams using AI insights?",
      "Show me the knowledge connections between different teams",
      "Analyze collaboration patterns in the knowledge graph"
    ],
    lead: [
      "What's the overall program health from GraphRAG analysis?",
      "Which teams are at risk of missing milestones?",
      "What resources need to be allocated based on data patterns?",
      "Show me the complete knowledge network view",
      "Generate strategic insights from the knowledge graph"
    ],
    guest: [
      "What is this incubator program about?",
      "What types of teams are in the program?",
      "How does the mentorship process work?",
      "Show me available public resources"
    ]
  };

  return (
    <Card className="glow-border bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/20 ufo-pulse">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <span className="text-glow">Consult the Oracle</span>
          <Badge className="bg-primary/20 text-primary border-primary/30">
            {selectedRole} Mode
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Query Input */}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary/60" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Ask the Oracle as a ${selectedRole}...`}
              className="pl-10 bg-background/50 border-primary/20 focus:border-primary/50 text-glow"
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading || !query.trim()}
            className="ufo-gradient hover:opacity-90 min-w-[100px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Transmit"
            )}
          </Button>
        </form>

        {/* Suggested Queries */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">✨ Quick transmissions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQueries[selectedRole].map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setQuery(suggestion)}
                disabled={isLoading}
                className="text-xs border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

      {/* Oracle Response */}
      {response && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-primary/20">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <h4 className="font-semibold text-sm text-primary">Oracle Transmission</h4>
              {response.cache_hit && (
                <Badge variant="outline" className="text-xs bg-green-100/50 text-green-700">
                  ⚡ Cached
                </Badge>
              )}
              {response.search_strategy && (
                <Badge variant="outline" className="text-xs">
                  {response.search_strategy.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
            
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-foreground/90">
                {response.answer}
              </p>
              
              {/* GraphRAG Knowledge Graph Display */}
              {response.knowledge_graph && response.knowledge_graph.nodes && response.knowledge_graph.nodes.length > 0 && (
                <div className="bg-orange-50/50 p-3 rounded border-l-2 border-orange-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-600">GraphRAG Knowledge Network</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    🧠 Found {response.knowledge_graph.nodes.length} knowledge nodes with {response.knowledge_graph.edges?.length || 0} connections
                  </p>
                  {response.knowledge_graph.query_keywords && (
                    <div className="flex flex-wrap gap-1">
                      {response.knowledge_graph.query_keywords.slice(0, 4).map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-orange-100/50">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Performance Metrics */}
              {response.performance_metrics && (
                <div className="bg-blue-50/50 p-2 rounded text-xs text-muted-foreground">
                  <div className="grid grid-cols-2 gap-2">
                    <span>Avg Response: {response.performance_metrics.averageResponseTime?.toFixed(0)}ms</span>
                    <span>Cache Rate: {(response.performance_metrics.cacheHitRate * 100)?.toFixed(1)}%</span>
                  </div>
                </div>
              )}
              
              {response.sources > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                  <span>Knowledge synthesized from {response.sources} data sources</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </CardContent>
    </Card>
  );
};