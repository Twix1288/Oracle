import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, MessageCircle } from "lucide-react";
import type { UserRole } from "@/types/oracle";

interface QueryBarProps {
  onQuery: (query: string, role: UserRole) => void;
  isLoading: boolean;
  response?: any;
  selectedRole: UserRole;
}

export const QueryBar = ({ onQuery, isLoading, response, selectedRole }: QueryBarProps) => {
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
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Ask a question as a ${selectedRole}...`}
            className="pl-10"
            disabled={isLoading}
          />
        </div>
        <Button type="submit" disabled={isLoading || !query.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
        </Button>
      </form>

      {/* Suggested queries */}
      <div className="flex flex-wrap gap-2">
        {suggestedQueries[selectedRole].map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => setQuery(suggestion)}
            disabled={isLoading}
            className="text-xs"
          >
            {suggestion}
          </Button>
        ))}
      </div>

      {/* Response */}
      {response && (
        <Card className="p-4 bg-muted/50">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground">Oracle Response:</h4>
            <p className="text-sm leading-relaxed">{response.answer}</p>
            {response.sources > 0 && (
              <p className="text-xs text-muted-foreground">
                Based on {response.sources} knowledge base entries
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};