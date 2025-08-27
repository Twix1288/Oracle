import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Send, FileText, Lightbulb, Link2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/oracle";
import ReactMarkdown from "react-markdown";

interface SimpleOracleProps {
  selectedRole: UserRole;
  teamId?: string;
  userId?: string;
}

interface OracleResponse {
  answer: string;
  sources: number;
  context_used: boolean;
  detected_stage?: string;
  suggested_frameworks?: string[];
  next_actions?: string[];
  stage_confidence?: number;
  resources?: string[];
  suggestions?: string[];
}

export const SimpleOracle = ({ selectedRole, teamId, userId }: SimpleOracleProps) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<OracleResponse | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    
    try {
      // Call the enhanced oracle function
      const { data, error } = await supabase.functions.invoke('enhanced-oracle', {
        body: { 
          query: query.trim(),
          role: selectedRole,
          teamId,
          userId 
        }
      });

      if (error) throw error;

      setResponse(data);
      setQuery("");

    } catch (error) {
      console.error('Oracle query error:', error);
      toast({
        title: "Oracle Error",
        description: "I'm having trouble connecting. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQueries = {
    builder: [
      "What resources do you recommend for MVP development?",
      "How can I validate my product idea?",
      "What are the best practices for user research?"
    ],
    mentor: [
      "What frameworks help guide early-stage teams?",
      "How can I provide better feedback to builders?",
      "What are common startup challenges?"
    ],
    lead: [
      "What metrics should I track for program success?",
      "How can I improve team collaboration?",
      "What resources help with fundraising?"
    ],
    guest: [
      "What is this incubator program about?",
      "How does the mentorship process work?",
      "What types of support do you provide?"
    ]
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="p-2 rounded-full bg-primary/20 ufo-pulse">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Ask the Oracle</h2>
          <Badge className="bg-primary/20 text-primary border-primary/30">
            {selectedRole}
          </Badge>
        </div>
        <p className="text-muted-foreground">Your AI assistant for personalized guidance and resources</p>
      </div>

      {/* Query Input */}
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Sparkles className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary/60" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Ask me anything as a ${selectedRole}...`}
                  className="pl-10 bg-background/50 border-primary/20 focus:border-primary/50"
                  disabled={isLoading}
                />
              </div>
              <Button 
                type="submit" 
                disabled={isLoading || !query.trim()}
                className="bg-primary hover:bg-primary/90 min-w-[100px]"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Ask
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Suggested Queries */}
      <Card className="bg-card/30 backdrop-blur border-primary/10">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Try these questions:
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {suggestedQueries[selectedRole].map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setQuery(suggestion)}
                className="text-xs h-8 bg-background/50 hover:bg-primary/10 border-primary/20"
                disabled={isLoading}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Oracle Response */}
      {response && (
        <Card className="bg-card/50 backdrop-blur border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-full bg-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-lg text-primary">Oracle Response</CardTitle>
              {response.sources > 0 && (
                <Badge variant="outline" className="text-xs">
                  {response.sources} sources
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main Response */}
            <div className="p-4 rounded-lg bg-background/50 border border-primary/10">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ ...props }) => <h3 className="font-semibold text-base text-primary mb-2" {...props} />,
                    h2: ({ ...props }) => <h4 className="font-medium text-sm text-primary mb-1" {...props} />,
                    ul: ({ ...props }) => <ul className="list-disc pl-4 space-y-1 mb-3" {...props} />,
                    ol: ({ ...props }) => <ol className="list-decimal pl-4 space-y-1 mb-3" {...props} />,
                    li: ({ ...props }) => <li className="text-sm leading-relaxed" {...props} />,
                    p: ({ ...props }) => <p className="mb-2 text-sm leading-relaxed" {...props} />,
                    strong: ({ ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                    code: ({ ...props }) => <code className="bg-muted/50 px-1 py-0.5 rounded text-xs font-mono" {...props} />,
                  }}
                >
                  {response.answer}
                </ReactMarkdown>
              </div>
            </div>

            {/* Resources Section - Show actual resources */}
            {response.resources && response.resources.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-primary">Resources & Learning Materials</h4>
                </div>
                <div className="grid gap-2">
                  {response.resources.map((resource, index) => (
                    <div key={index} className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-green-400 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: resource }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Frameworks Section */}
            {response.suggested_frameworks && response.suggested_frameworks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-primary">Recommended Frameworks</h4>
                </div>
                <div className="grid gap-2">
                  {response.suggested_frameworks.map((framework, index) => (
                    <div key={index} className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-blue-400 mt-0.5" />
                        <span className="text-sm text-foreground">{framework}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Actions Section */}
            {response.next_actions && response.next_actions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-primary">Next Steps</h4>
                </div>
                <div className="grid gap-2">
                  {response.next_actions.map((action, index) => (
                    <div key={index} className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-blue-400 mt-1">{index + 1}.</span>
                        <span className="text-sm text-foreground">{action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stage Information */}
            {response.detected_stage && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-primary">Current Journey Stage</h4>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground capitalize">{response.detected_stage}</span>
                    {response.stage_confidence && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(response.stage_confidence * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};