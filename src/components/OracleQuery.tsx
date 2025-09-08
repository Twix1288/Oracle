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
      "What blockers should I focus on today?",
      "How can I improve our development process?",
      "What resources are available for technical challenges?"
    ],
    mentor: [
      "Which teams need the most attention?",
      "What are common challenges across my teams?",
      "How can I better support struggling teams?"
    ],
    lead: [
      "What's the overall program health?",
      "Which teams are at risk of missing milestones?",
      "What resources need to be allocated?"
    ],
    guest: [
      "What is this incubator program about?",
      "What types of teams are in the program?",
      "How does the mentorship process work?"
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
              </div>
              
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-foreground/90">
                  {response.answer}
                </p>
                
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