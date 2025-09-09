import React, { useState } from 'react';
import { ActionButton } from './ActionButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ExpressInterestButtonProps {
  projectId: string;
  projectName?: string;
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
}

export function ExpressInterestButton({ 
  projectId, 
  projectName, 
  onSuccess, 
  variant = 'default', 
  size = 'default' 
}: ExpressInterestButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleExpressInterest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const graphragUrl = `https://dijskfbokusyxkcfwkrc.functions.supabase.co/graphrag`;
      
      const response = await fetch(`${graphragUrl}/button_action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'express_interest',
          actor_id: user.id,
          target_id: projectId,
          body: {
            project_id: projectId,
            message: message.trim()
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to express interest');
      }

      const result = await response.json();
      
      toast({
        title: "Interest Expressed!",
        description: `Your interest in ${projectName || 'the project'} has been sent to the team.`,
      });

      setIsOpen(false);
      setMessage('');
      onSuccess?.();
      
    } catch (error) {
      console.error('Express interest error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to express interest. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <ActionButton 
          onClick={() => setIsOpen(true)}
          variant={variant}
          size={size}
        >
          Express Interest
        </ActionButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Express Interest{projectName ? ` in ${projectName}` : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell the team why you're interested and how you can contribute..."
              rows={4}
            />
          </div>
          <ActionButton 
            onClick={handleExpressInterest}
            className="w-full"
          >
            Send Interest
          </ActionButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}