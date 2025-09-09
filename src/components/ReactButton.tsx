import React from 'react';
import { ActionButton } from './ActionButton';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ReactButtonProps {
  feedItemId: string;
  feedItemType: string;
  interactionType: 'like' | 'comment' | 'share';
  targetId?: string;
  count?: number;
  isActive?: boolean;
  onSuccess?: () => void;
  body?: string; // For comments
  size?: 'default' | 'sm' | 'lg';
}

const getIcon = (type: string) => {
  switch (type) {
    case 'like':
      return Heart;
    case 'comment':
      return MessageCircle;
    case 'share':
      return Share2;
    default:
      return Heart;
  }
};

const getActionText = (type: string) => {
  switch (type) {
    case 'like':
      return 'Like';
    case 'comment':
      return 'Comment';
    case 'share':
      return 'Share';
    default:
      return 'React';
  }
};

export function ReactButton({ 
  feedItemId,
  feedItemType,
  interactionType,
  targetId,
  count = 0,
  isActive = false,
  onSuccess,
  body,
  size = 'sm'
}: ReactButtonProps) {
  const { toast } = useToast();
  const Icon = getIcon(interactionType);

  const handleReact = async () => {
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
          action: 'react',
          actor_id: user.id,
          target_id: targetId,
          body: {
            feed_item_id: feedItemId,
            feed_item_type: feedItemType,
            interaction_type: interactionType,
            body: body
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${interactionType}`);
      }

      const result = await response.json();
      
      toast({
        title: "Success!",
        description: `${getActionText(interactionType)} recorded.`,
      });

      onSuccess?.();
      
    } catch (error) {
      console.error('React error:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${interactionType}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  return (
    <ActionButton 
      onClick={handleReact}
      variant="ghost"
      size={size}
      className={`gap-1 ${isActive ? 'text-primary' : 'text-muted-foreground'} hover:text-primary`}
    >
      <Icon className={`h-4 w-4 ${isActive ? 'fill-current' : ''}`} />
      {count > 0 && <span className="text-xs">{count}</span>}
    </ActionButton>
  );
}