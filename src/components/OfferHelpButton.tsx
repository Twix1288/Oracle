import React, { useState } from 'react';
import { ActionButton } from './ActionButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OfferHelpButtonProps {
  targetId?: string;
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
}

export function OfferHelpButton({ targetId, onSuccess, variant = 'default', size = 'default' }: OfferHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [skill, setSkill] = useState('');
  const [availability, setAvailability] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  const handleOfferHelp = async () => {
    if (!skill.trim()) {
      toast({
        title: "Error",
        description: "Please specify the skill you want to offer help with.",
        variant: "destructive",
      });
      return;
    }

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
          action: 'offer_help',
          actor_id: user.id,
          target_id: targetId,
          body: {
            skill: skill.trim(),
            availability: availability.trim(),
            description: description.trim()
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to offer help');
      }

      const result = await response.json();
      
      toast({
        title: "Help Offered!",
        description: `Your ${skill} expertise is now available to help others.`,
      });

      setIsOpen(false);
      setSkill('');
      setAvailability('');
      setDescription('');
      onSuccess?.();
      
    } catch (error) {
      console.error('Offer help error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to offer help. Please try again.",
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
          Offer Help
        </ActionButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Offer Your Help</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="skill">Skill/Expertise *</Label>
            <Input
              id="skill"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="e.g. React Development, UI/UX Design, Marketing"
            />
          </div>
          <div>
            <Label htmlFor="availability">Availability</Label>
            <Input
              id="availability"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder="e.g. Weekends, 2-3 hours/week, Full-time"
            />
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe how you can help..."
              rows={3}
            />
          </div>
          <ActionButton 
            onClick={handleOfferHelp}
            className="w-full"
          >
            Submit Help Offer
          </ActionButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}