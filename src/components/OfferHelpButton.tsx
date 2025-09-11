import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Heart, Send, Sparkles, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OfferHelpButtonProps {
  targetUserId: string;
  targetUserName: string;
  targetUserSkills?: string[];
  projectContext?: string;
  connectionType?: 'collaboration' | 'mentorship' | 'skill_exchange';
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export const OfferHelpButton: React.FC<OfferHelpButtonProps> = ({
  targetUserId,
  targetUserName,
  targetUserSkills = [],
  projectContext,
  connectionType = 'collaboration',
  variant = 'default',
  size = 'default',
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const generateHelpMessage = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      const { data: aiMessage, error: aiError } = await supabase.functions.invoke('super-oracle', {
        body: {
          query: `Generate a helpful, professional message offering assistance to ${targetUserName}. 
          
          Context:
          - Target user skills: ${targetUserSkills.join(', ')}
          - Connection type: ${connectionType}
          - Project context: ${projectContext || 'General collaboration'}
          - Your role: ${profile?.role || 'builder'}
          - Your skills: ${profile?.skills?.join(', ') || 'Various skills'}
          
          Make it specific, genuine, and actionable. Ask what they're working on and how you can help.`,
          type: 'chat',
          role: 'builder',
          userId: user.id
        }
      });

      if (aiError) throw aiError;

      if (aiMessage?.answer) {
        setHelpMessage(aiMessage.answer);
      } else {
        // Fallback message
        setHelpMessage(`Hi ${targetUserName}! I'd love to help with your projects. I noticed you're working with ${targetUserSkills.join(', ')} and I have experience in those areas. What are you currently working on? I'm happy to collaborate, share knowledge, or provide support in any way that would be helpful!`);
      }
    } catch (error) {
      console.error('Error generating help message:', error);
      // Fallback message
      setHelpMessage(`Hi ${targetUserName}! I'd love to help with your projects. What are you currently working on? I'm happy to collaborate, share knowledge, or provide support in any way that would be helpful!`);
    } finally {
      setIsGenerating(false);
    }
  };

  const sendHelpOffer = async () => {
    if (!user || !helpMessage.trim()) return;

    setIsSending(true);
    try {
      // Create connection request
      const { error: connectionError } = await supabase
        .from('connection_requests')
        .insert({
          requester_id: user.id,
          requested_id: targetUserId,
          request_type: connectionType,
          message: helpMessage,
          oracle_generated: true,
          oracle_confidence: 0.8,
          status: 'pending'
        });

      if (connectionError) throw connectionError;

      // Send message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: targetUserId,
          content: helpMessage,
          sender_role: 'builder',
          receiver_role: 'builder'
        });

      if (messageError) throw messageError;

      toast({
        title: "Help Offer Sent!",
        description: `Your offer to help ${targetUserName} has been sent. They'll receive a notification.`,
      });

      setIsOpen(false);
      setHelpMessage('');

    } catch (error: any) {
      console.error('Error sending help offer:', error);
      toast({
        title: "Error",
        description: `Failed to send help offer: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const getConnectionTypeColor = (type: string) => {
    switch (type) {
      case 'collaboration': return 'bg-blue-100 text-blue-800';
      case 'mentorship': return 'bg-purple-100 text-purple-800';
      case 'skill_exchange': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={`${className} ${variant === 'default' ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600' : ''}`}
        >
          <Heart className="h-4 w-4 mr-2" />
          Offer Help
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Offer Help to {targetUserName}
          </DialogTitle>
          <DialogDescription>
            Send a personalized message offering your assistance and expertise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getConnectionTypeColor(connectionType)}>
                  {connectionType.replace('_', ' ')}
                </Badge>
                {targetUserSkills.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {targetUserSkills.slice(0, 3).join(', ')}
                    {targetUserSkills.length > 3 && ` +${targetUserSkills.length - 3} more`}
                  </Badge>
                )}
              </div>
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
              <label className="text-sm font-medium">Your Message</label>
              <Button
                variant="outline"
                size="sm"
                onClick={generateHelpMessage}
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

            <Textarea
              placeholder="Write your help offer message here..."
              value={helpMessage}
              onChange={(e) => setHelpMessage(e.target.value)}
              rows={6}
              className="resize-none"
            />

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3" />
              <span>This will send both a connection request and a direct message</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4">
            <Button
              onClick={sendHelpOffer}
              disabled={isSending || !helpMessage.trim()}
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
            >
              {isSending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Help Offer
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