import React, { useState } from 'react';
import { ActionButton } from './ActionButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, User, FileText, Settings, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OracleSuggestButtonProps {
  project: {
    id: string;
    title: string;
    description: string;
  };
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
}

interface OracleSuggestion {
  type: 'person' | 'resource' | 'process';
  id: string | null;
  name: string | null;
  role_or_skill: string;
  confidence: number;
  reason_evidence_lines: number[];
  one_sentence_rationale: string;
}

interface OracleAction {
  who_to_contact_id: string | null;
  who_to_contact_name: string | null;
  message: string;
  why: string;
  priority: 'high' | 'medium' | 'low';
}

interface OracleResponse {
  suggestions: OracleSuggestion[];
  actions: OracleAction[];
  meta: {
    used_evidence_count: number;
    timestamp: string;
    explanation?: string;
  };
}

export function OracleSuggestButton({ 
  project, 
  onSuccess, 
  variant = 'default', 
  size = 'default' 
}: OracleSuggestButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<OracleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGetSuggestions = async () => {
    if (suggestions) {
      setIsOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const oracleUrl = `https://dijskfbokusyxkcfwkrc.functions.supabase.co/oracle_call`;
      
      const response = await fetch(oracleUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actor_id: user.id,
          project: {
            id: project.id,
            title: project.title,
            description: project.description
          },
          k: 6
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get Oracle suggestions');
      }

      const result: OracleResponse = await response.json();
      setSuggestions(result);
      setIsOpen(true);
      onSuccess?.();
      
    } catch (error) {
      console.error('Oracle suggest error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get Oracle suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'person':
        return <User className="h-4 w-4" />;
      case 'resource':
        return <FileText className="h-4 w-4" />;
      case 'process':
        return <Settings className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <>
      <ActionButton 
        onClick={handleGetSuggestions}
        variant={variant}
        size={size}
      >
        {isLoading ? (
          'Getting Suggestions...'
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Oracle Suggest
          </>
        )}
      </ActionButton>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Oracle Suggestions for {project.title}
            </DialogTitle>
          </DialogHeader>
          
          {suggestions && (
            <div className="space-y-6">
              {/* Suggestions Section */}
              {suggestions.suggestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Recommendations</h3>
                  <div className="grid gap-3">
                    {suggestions.suggestions.map((suggestion, index) => (
                      <Card key={index} className="border-l-4 border-l-primary">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            {getTypeIcon(suggestion.type)}
                            <span className="capitalize">{suggestion.type}</span>
                            <Badge variant="outline" className="ml-auto">
                              {Math.round(suggestion.confidence * 100)}% match
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {suggestion.name && (
                              <p className="font-medium">{suggestion.name}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {suggestion.role_or_skill}
                            </p>
                            <p className="text-sm">{suggestion.one_sentence_rationale}</p>
                            {suggestion.reason_evidence_lines.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Based on evidence #{suggestion.reason_evidence_lines.join(', #')}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Section */}
              {suggestions.actions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Recommended Actions</h3>
                  <div className="grid gap-3">
                    {suggestions.actions.map((action, index) => (
                      <Card key={index} className="border-l-4 border-l-secondary">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" />
                            <span>Action #{index + 1}</span>
                            <Badge 
                              variant={getPriorityColor(action.priority) as any}
                              className="ml-auto"
                            >
                              {action.priority} priority
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {action.who_to_contact_name && (
                              <p className="font-medium">
                                Contact: {action.who_to_contact_name}
                              </p>
                            )}
                            <p className="text-sm bg-muted p-2 rounded">
                              "{action.message}"
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {action.why}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta Information */}
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                <p>Analysis based on {suggestions.meta.used_evidence_count} evidence sources</p>
                <p>Generated at {new Date(suggestions.meta.timestamp).toLocaleString()}</p>
                {suggestions.meta.explanation && (
                  <p className="mt-1">Note: {suggestions.meta.explanation}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}