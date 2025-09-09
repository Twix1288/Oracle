import React from 'react';
import { ActionButton } from './ActionButton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface JoinWorkshopButtonProps {
  workshopId: string;
  workshopTitle?: string;
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
}

export function JoinWorkshopButton({ 
  workshopId, 
  workshopTitle, 
  onSuccess, 
  variant = 'default', 
  size = 'default' 
}: JoinWorkshopButtonProps) {
  const { toast } = useToast();

  const handleJoinWorkshop = async () => {
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
          action: 'join_workshop',
          actor_id: user.id,
          target_id: workshopId,
          body: {}
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join workshop');
      }

      const result = await response.json();
      
      if (result.message === 'Already registered') {
        toast({
          title: "Already Registered",
          description: `You're already registered for ${workshopTitle || 'this workshop'}.`,
        });
      } else {
        toast({
          title: "Workshop Joined!",
          description: `You've successfully registered for ${workshopTitle || 'the workshop'}.`,
        });
      }

      onSuccess?.();
      
    } catch (error) {
      console.error('Join workshop error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join workshop. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <ActionButton 
      onClick={handleJoinWorkshop}
      variant={variant}
      size={size}
    >
      Join Workshop
    </ActionButton>
  );
}