import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Zap, 
  Send, 
  Sparkles, 
  Clock, 
  CheckCircle, 
  MessageCircle, 
  Handshake, 
  UserPlus,
  Heart,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TakeActionButtonProps {
  actionType: 'connection' | 'collaboration' | 'mentorship' | 'skill_exchange' | 'general';
  targetUserId?: string;
  targetUserName?: string;
  targetUserSkills?: string[];
  projectContext?: string;
  suggestionId?: string;
  suggestionDescription?: string;
  confidence?: number;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export const TakeActionButton: React.FC<TakeActionButtonProps> = ({
  actionType,
  targetUserId,
  targetUserName,
  targetUserSkills = [],
  projectContext,
  suggestionId,
  suggestionDescription,
  confidence = 0.8,
  variant = 'default',
  size = 'default',
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const generateActionMessage = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      let prompt = '';
      
      switch (actionType) {
        case 'connection':
          prompt = `Generate a professional connection request message for ${targetUserName || 'this person'}. 
          Context: ${suggestionDescription || 'Oracle suggested this connection'}
          Your skills: ${profile?.skills?.join(', ') || 'Various skills'}
          Their skills: ${targetUserSkills.join(', ')}
          Make it specific about why you want to connect and what you can offer.`;
          break;
          
        case 'collaboration':
          prompt = `Generate a collaboration interest message for ${targetUserName || 'this person'}.
          Project context: ${projectContext || 'General collaboration opportunity'}
          Your skills: ${profile?.skills?.join(', ') || 'Various skills'}
          Their skills: ${targetUserSkills.join(', ')}
          Express genuine interest in working together and highlight complementary skills.`;
          break;
          
        case 'mentorship':
          prompt = `Generate a mentorship request message for ${targetUserName || 'this person'}.
          Context: ${suggestionDescription || 'Oracle suggested this mentorship opportunity'}
          Your learning goals: ${profile?.goals?.join(', ') || 'General growth'}
          Their expertise: ${targetUserSkills.join(', ')}
          Be humble, specific about what you want to learn, and show appreciation for their expertise.`;
          break;
          
        case 'skill_exchange':
          prompt = `Generate a skill exchange proposal message for ${targetUserName || 'this person'}.
          Your skills to offer: ${profile?.skills?.join(', ') || 'Various skills'}
          Skills you want to learn: ${targetUserSkills.join(', ')}
          Context: ${suggestionDescription || 'Oracle suggested this skill exchange'}
          Propose a fair exchange and be specific about what you can teach and what you want to learn.`;
          break;
          
        default:
          prompt = `Generate a professional message based on this Oracle suggestion: "${suggestionDescription || 'General opportunity'}"
          Your profile: ${profile?.role || 'builder'} with skills in ${profile?.skills?.join(', ') || 'various areas'}
          Be specific, genuine, and actionable in your approach.`;
      }

      const { data: aiMessage, error: aiError } = await supabase.functions.invoke('super-oracle', {
        body: {
          query: prompt,
          type: 'chat',
          role: 'builder',
          userId: user.id
        }
      });

      if (aiError) throw aiError;

      if (aiMessage?.answer) {
        setGeneratedMessage(aiMessage.answer);
      } else {
        // Fallback message
        setGeneratedMessage(generateFallbackMessage());
      }
    } catch (error) {
      console.error('Error generating action message:', error);
      setGeneratedMessage(generateFallbackMessage());
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFallbackMessage = () => {
    const baseMessage = `Hi${targetUserName ? ` ${targetUserName}` : ''}! `;
    
    switch (actionType) {
      case 'connection':
        return `${baseMessage}I'd love to connect and explore collaboration opportunities. ${suggestionDescription || 'Oracle suggested we might work well together.'}`;
      case 'collaboration':
        return `${baseMessage}I'm interested in collaborating on ${projectContext || 'your projects'}. I have experience with ${profile?.skills?.join(', ') || 'various technologies'} and would love to contribute.`;
      case 'mentorship':
        return `${baseMessage}I'd love to learn from your expertise in ${targetUserSkills.join(', ')}. ${suggestionDescription || 'Oracle suggested you might be a great mentor for me.'}`;
      case 'skill_exchange':
        return `${baseMessage}I'd love to do a skill exchange! I can teach you ${profile?.skills?.join(', ') || 'various skills'} in exchange for learning ${targetUserSkills.join(', ')}.`;
        default:
          return `${baseMessage}${suggestionDescription || 'I would love to explore opportunities to work together.'}`;
    }
  };

  const executeAction = async () => {
    if (!user || !generatedMessage.trim()) return;

    setIsSending(true);
    try {
      let successMessage = '';

      if (targetUserId) {
        // Send direct message
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            receiver_id: targetUserId,
            content: generatedMessage,
            sender_role: profile?.role || 'builder',
            receiver_role: 'builder'
          });

        if (messageError) throw messageError;

        // Create connection request
        const { error: connectionError } = await supabase
          .from('connection_requests')
          .insert({
            requester_id: user.id,
            requested_id: targetUserId,
            request_type: actionType,
            message: generatedMessage,
            oracle_generated: true,
            status: 'pending'
          });

        if (connectionError) throw connectionError;

        successMessage = `Your ${actionType} request has been sent to ${targetUserName || 'the user'}!`;
      } else {
        // General action (no specific target)
        successMessage = `Oracle has generated your ${actionType} message! You can copy it and send it manually.`;
      }

      // Log the action for analytics
      if (suggestionId) {
        await supabase
          .from('oracle_logs')
          .insert({
            query: `Take action: ${actionType}`,
            response: generatedMessage,
            query_type: 'action_taken',
            user_role: profile?.role || 'builder',
            confidence: confidence,
            processing_time: 0,
            search_strategy: 'action_generation',
            model_used: 'gpt-4o'
          });
      }

      toast({
        title: "Action Executed!",
        description: successMessage,
      });

      setIsOpen(false);
      setGeneratedMessage('');

    } catch (error: any) {
      console.error('Error executing action:', error);
      toast({
        title: "Error",
        description: `Failed to execute action: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'connection': return <UserPlus className="h-4 w-4" />;
      case 'collaboration': return <Handshake className="h-4 w-4" />;
      case 'mentorship': return <TrendingUp className="h-4 w-4" />;
      case 'skill_exchange': return <Heart className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'connection': return 'bg-blue-100 text-blue-800';
      case 'collaboration': return 'bg-green-100 text-green-800';
      case 'mentorship': return 'bg-purple-100 text-purple-800';
      case 'skill_exchange': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getButtonText = () => {
    switch (actionType) {
      case 'connection': return 'Connect';
      case 'collaboration': return 'Collaborate';
      case 'mentorship': return 'Request Mentorship';
      case 'skill_exchange': return 'Exchange Skills';
      default: return 'Take Action';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={`${className} ${variant === 'default' ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600' : ''}`}
        >
          {getActionIcon(actionType)}
          <span className="ml-2">{getButtonText()}</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getActionIcon(actionType)}
            {getButtonText()}
            {confidence > 0 && (
              <Badge variant="outline" className="text-xs">
                {Math.round(confidence * 100)}% match
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Oracle will generate a personalized message for you to send.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getActionColor(actionType)}>
                  {actionType.replace('_', ' ')}
                </Badge>
                {targetUserSkills.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {targetUserSkills.slice(0, 3).join(', ')}
                    {targetUserSkills.length > 3 && ` +${targetUserSkills.length - 3} more`}
                  </Badge>
                )}
              </div>
              {suggestionDescription && (
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Oracle Suggestion:</strong> {suggestionDescription}
                </p>
              )}
              {projectContext && (
                <p className="text-sm text-muted-foreground">
                  <strong>Project:</strong> {projectContext}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Message Generation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Generated Message</label>
              <Button
                variant="outline"
                size="sm"
                onClick={generateActionMessage}
                disabled={isGenerating}
                className="text-xs"
              >
                {isGenerating ? (
                  <>
                    <Clock className="h-3 w-3 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Generate
                  </>
                )}
              </Button>
            </div>

            <div className="min-h-[120px] p-3 border rounded-lg bg-muted/30">
              {generatedMessage ? (
                <p className="text-sm leading-relaxed">{generatedMessage}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Click "AI Generate" to create a personalized message...
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3" />
              <span>
                {targetUserId 
                  ? `This will send both a connection request and a direct message to ${targetUserName || 'the user'}`
                  : 'You can copy this message and send it manually'
                }
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4">
            <Button
              onClick={executeAction}
              disabled={isSending || !generatedMessage.trim()}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {isSending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {targetUserId ? 'Send Message' : 'Copy Message'}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};