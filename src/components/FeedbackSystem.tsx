import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, Star, MessageSquare, TrendingUp, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackSystemProps {
  oracleResponseId: string;
  query: string;
  response: string;
  modelUsed: string;
  confidence: number;
  onFeedbackSubmitted?: (feedback: any) => void;
}

interface FeedbackData {
  satisfaction: number;
  helpful: boolean;
  feedback_text: string;
  improvement_suggestions: string[];
  response_quality: 'excellent' | 'good' | 'average' | 'poor';
  accuracy: 'very_accurate' | 'accurate' | 'somewhat_accurate' | 'inaccurate';
  relevance: 'very_relevant' | 'relevant' | 'somewhat_relevant' | 'irrelevant';
}

export const FeedbackSystem: React.FC<FeedbackSystemProps> = ({
  oracleResponseId,
  query,
  response,
  modelUsed,
  confidence,
  onFeedbackSubmitted
}) => {
  const [feedback, setFeedback] = useState<FeedbackData>({
    satisfaction: 0,
    helpful: false,
    feedback_text: '',
    improvement_suggestions: [],
    response_quality: 'good',
    accuracy: 'accurate',
    relevance: 'relevant'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false);
  const { toast } = useToast();

  const handleSatisfactionRating = (rating: number) => {
    setFeedback(prev => ({ ...prev, satisfaction: rating }));
  };

  const handleHelpfulness = (helpful: boolean) => {
    setFeedback(prev => ({ ...prev, helpful }));
  };

  const handleQuickFeedback = (type: 'excellent' | 'good' | 'needs_improvement') => {
    const feedbackMap = {
      excellent: { satisfaction: 5, helpful: true, response_quality: 'excellent' as const, accuracy: 'very_accurate' as const, relevance: 'very_relevant' as const },
      good: { satisfaction: 4, helpful: true, response_quality: 'good' as const, accuracy: 'accurate' as const, relevance: 'relevant' as const },
      needs_improvement: { satisfaction: 2, helpful: false, response_quality: 'poor' as const, accuracy: 'inaccurate' as const, relevance: 'irrelevant' as const }
    };
    
    setFeedback(prev => ({ ...prev, ...feedbackMap[type] }));
  };

  const submitFeedback = async () => {
    if (feedback.satisfaction === 0) {
      toast({
        title: "Please provide feedback",
        description: "Rate your satisfaction with the response.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Submit feedback to oracle_logs table
      const { error: updateError } = await supabase
        .from('oracle_logs')
        .update({
          user_satisfaction: feedback.satisfaction,
          user_feedback: feedback.feedback_text,
          helpful: feedback.helpful,
          updated_at: new Date().toISOString()
        })
        .eq('id', oracleResponseId);

      if (updateError) throw updateError;

      // Store feedback in oracle_logs table since oracle_feedback may not exist
      const { error: feedbackError } = await supabase
        .from('oracle_logs')
        .update({
          feedback: feedback.feedback_text,
          confidence: feedback.helpful ? (feedback.satisfaction / 5) : 0.1
        })
        .eq('id', oracleResponseId);

      if (feedbackError) throw feedbackError;

      // Trigger learning loop analysis
      await supabase.functions.invoke('oracle-learning-loop', {
        body: {
          oracle_log_id: oracleResponseId,
          feedback_data: feedback,
          action: 'analyze_feedback'
        }
      });

      toast({
        title: "Feedback Submitted!",
        description: "Thank you for helping improve the Oracle. Your feedback will be used to enhance future responses.",
      });

      onFeedbackSubmitted?.(feedback);
      
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSatisfactionColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSatisfactionIcon = (rating: number) => {
    if (rating >= 4) return <ThumbsUp className="h-4 w-4" />;
    if (rating >= 3) return <Star className="h-4 w-4" />;
    return <ThumbsDown className="h-4 w-4" />;
  };

  return (
    <Card className="mt-4 border-l-4 border-l-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Help Improve Oracle</CardTitle>
          <Badge variant="outline" className="text-xs">
            <Brain className="h-3 w-3 mr-1" />
            Learning Mode
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Your feedback helps Oracle learn and provide better responses
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Feedback Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Quick feedback:</span>
          <Button
            size="sm"
            variant={feedback.satisfaction >= 4 ? "default" : "outline"}
            onClick={() => handleQuickFeedback('excellent')}
            className="text-xs h-7"
          >
            <ThumbsUp className="h-3 w-3 mr-1" />
            Excellent
          </Button>
          <Button
            size="sm"
            variant={feedback.satisfaction === 4 ? "default" : "outline"}
            onClick={() => handleQuickFeedback('good')}
            className="text-xs h-7"
          >
            <Star className="h-3 w-3 mr-1" />
            Good
          </Button>
          <Button
            size="sm"
            variant={feedback.satisfaction <= 2 ? "destructive" : "outline"}
            onClick={() => handleQuickFeedback('needs_improvement')}
            className="text-xs h-7"
          >
            <ThumbsDown className="h-3 w-3 mr-1" />
            Needs Work
          </Button>
        </div>

        {/* Detailed Satisfaction Rating */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Satisfaction:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleSatisfactionRating(rating)}
                  className={`p-1 rounded transition-colors ${
                    feedback.satisfaction >= rating
                      ? getSatisfactionColor(rating)
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {getSatisfactionIcon(rating)}
                </button>
              ))}
            </div>
            {feedback.satisfaction > 0 && (
              <span className={`text-xs font-medium ${getSatisfactionColor(feedback.satisfaction)}`}>
                {feedback.satisfaction}/5
              </span>
            )}
          </div>
        </div>

        {/* Helpfulness Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Was this helpful?</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={feedback.helpful ? "default" : "outline"}
              onClick={() => handleHelpfulness(true)}
              className="text-xs h-7"
            >
              <ThumbsUp className="h-3 w-3 mr-1" />
              Yes
            </Button>
            <Button
              size="sm"
              variant={!feedback.helpful && feedback.satisfaction > 0 ? "destructive" : "outline"}
              onClick={() => handleHelpfulness(false)}
              className="text-xs h-7"
            >
              <ThumbsDown className="h-3 w-3 mr-1" />
              No
            </Button>
          </div>
        </div>

        {/* Detailed Feedback Toggle */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowDetailedFeedback(!showDetailedFeedback)}
          className="text-xs h-7"
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          {showDetailedFeedback ? 'Hide' : 'Show'} Detailed Feedback
        </Button>

        {/* Detailed Feedback Form */}
        {showDetailedFeedback && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium">Response Quality</label>
                <select
                  value={feedback.response_quality}
                  onChange={(e) => setFeedback(prev => ({ ...prev, response_quality: e.target.value as any }))}
                  className="w-full text-xs p-1 border rounded"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="average">Average</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Accuracy</label>
                <select
                  value={feedback.accuracy}
                  onChange={(e) => setFeedback(prev => ({ ...prev, accuracy: e.target.value as any }))}
                  className="w-full text-xs p-1 border rounded"
                >
                  <option value="very_accurate">Very Accurate</option>
                  <option value="accurate">Accurate</option>
                  <option value="somewhat_accurate">Somewhat Accurate</option>
                  <option value="inaccurate">Inaccurate</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Relevance</label>
                <select
                  value={feedback.relevance}
                  onChange={(e) => setFeedback(prev => ({ ...prev, relevance: e.target.value as any }))}
                  className="w-full text-xs p-1 border rounded"
                >
                  <option value="very_relevant">Very Relevant</option>
                  <option value="relevant">Relevant</option>
                  <option value="somewhat_relevant">Somewhat Relevant</option>
                  <option value="irrelevant">Irrelevant</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium">Additional Comments</label>
              <Textarea
                placeholder="What could be improved? What worked well?"
                value={feedback.feedback_text}
                onChange={(e) => setFeedback(prev => ({ ...prev, feedback_text: e.target.value }))}
                className="text-xs min-h-[60px]"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Your feedback improves Oracle for everyone</span>
          </div>
          <Button
            size="sm"
            onClick={submitFeedback}
            disabled={isSubmitting || feedback.satisfaction === 0}
            className="text-xs h-7"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
