import React, { useState } from 'react';
import { ActionButton } from './ActionButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ConnectButtonProps {
  targetId: string;
  targetName?: string;
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
}

export function ConnectButton({ targetId, targetName, onSuccess, variant = 'default', size = 'default' }: ConnectButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleConnect = async () => {
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
          action: 'connect',
          actor_id: user.id,
          target_id: targetId,
          body: {
            message: message.trim() || `Hi! I'd like to connect with you.`
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send connection request');
      }

      const result = await response.json();
      
      toast({
        title: "Connection Request Sent!",
        description: `Your request has been sent${targetName ? ` to ${targetName}` : ''}.`,
      });

      setIsOpen(false);
      setMessage('');
      onSuccess?.();
      
    } catch (error) {
      console.error('Connect error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send connection request. Please try again.",
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
          Connect
        </ActionButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Connect{targetName ? ` with ${targetName}` : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself and explain why you'd like to connect..."
              rows={4}
            />
          </div>
          <ActionButton 
            onClick={handleConnect}
            className="w-full"
          >
            Send Connection Request
          </ActionButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}