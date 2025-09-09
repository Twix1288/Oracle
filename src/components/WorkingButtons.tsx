import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export const WorkingButtons = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create Challenge Button
  const createChallenge = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('builder_challenges')
        .insert([{
          title: 'Complete a coding task',
          description: 'Finish implementing a new feature',
          challenge_type: 'development',
          target_metric: 1,
          current_progress: 0,
          reward_points: 50,
          user_id: user?.id,
          week_assigned: new Date().toISOString().split('T')[0],
          oracle_generated: false,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-challenges'] });
      toast({ title: "Challenge created successfully!" });
    },
  });

  // Create Progress Entry Button
  const createProgressEntry = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('progress_entries')
        .insert([{
          title: 'Weekly Progress Update',
          description: 'Completed user authentication feature',
          category: 'development',
          status: 'in_progress',
          user_id: user?.id,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress-entries'] });
      toast({ title: "Progress entry created!" });
    },
  });

  // Create Workshop Button
  const createWorkshop = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('workshops')
        .insert([{
          title: 'React Best Practices Workshop',
          description: 'Learn advanced React patterns and optimization techniques',
          host_id: user?.id,
          scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 90,
          max_attendees: 25,
          status: 'scheduled',
          attendees: [],
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
      toast({ title: "Workshop created!" });
    },
  });

  // Create Skill Offer Button
  const createSkillOffer = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('skill_offers')
        .insert([{
          skill: 'React Development',
          description: 'Expert in React, TypeScript, and modern frontend development',
          availability: '10 hours/week',
          owner_id: user?.id,
          status: 'active',
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-offers'] });
      toast({ title: "Skill offer created!" });
    },
  });

  // Send Message Button
  const sendMessage = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          sender_id: user?.id,
          receiver_id: user?.id,
          content: 'Hello! This is a test message from the working buttons.',
          sender_role: 'builder',
          receiver_role: 'builder',
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast({ title: "Message sent!" });
    },
  });

  // Create Team Button
  const createTeam = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .insert([{
          name: `Quick Team ${Date.now()}`,
          description: 'A team created using working buttons',
          project_name: 'Quick Project',
          project_description: 'A sample project for demonstration',
          stage: 'ideation',
          max_members: 5,
          team_creator_id: user?.id,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({ title: "Team created!" });
    },
  });

  // Create Notification Button
  const createNotification = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: user?.id,
          type: 'info',
          title: 'Working Button Notification',
          message: 'This notification was created using the working buttons!',
          data: { source: 'working_buttons' },
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "Notification created!" });
    },
  });

  // Create Collaboration Proposal Button
  const createCollaborationProposal = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('collaboration_proposals')
        .insert([{
          proposer_id: user?.id,
          target_id: user?.id,
          proposal_type: 'partnership',
          title: 'Working Button Collaboration Proposal',
          description: 'Let\'s work together on this exciting project!',
          timeline: '2 weeks',
          deliverables: ['Initial design', 'Prototype', 'Documentation'],
          status: 'pending',
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaboration-proposals'] });
      toast({ title: "Collaboration proposal created!" });
    },
  });

  // Form state for custom inputs
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  // Create Custom Challenge Button
  const createCustomChallenge = useMutation({
    mutationFn: async () => {
      if (!customTitle) throw new Error('Title is required');
      
      const { data, error } = await supabase
        .from('builder_challenges')
        .insert([{
          title: customTitle,
          description: customDescription || 'Custom challenge created via form',
          challenge_type: 'custom',
          target_metric: 1,
          current_progress: 0,
          reward_points: 25,
          user_id: user?.id,
          week_assigned: new Date().toISOString().split('T')[0],
          oracle_generated: false,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-challenges'] });
      toast({ title: "Custom challenge created!" });
      setCustomTitle('');
      setCustomDescription('');
    },
  });

  if (!user) {
    return <div>Please log in to use working buttons.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Working Database Buttons</h1>
      <p className="text-muted-foreground">These buttons actually work and interact with your database!</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Quick Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Create Challenge</CardTitle>
            <CardDescription>Add a new builder challenge</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => createChallenge.mutate()}
              disabled={createChallenge.isPending}
              className="w-full"
            >
              {createChallenge.isPending ? 'Creating...' : 'Create Challenge'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Progress Entry</CardTitle>
            <CardDescription>Add a progress update</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => createProgressEntry.mutate()}
              disabled={createProgressEntry.isPending}
              className="w-full"
            >
              {createProgressEntry.isPending ? 'Creating...' : 'Create Progress Entry'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Workshop</CardTitle>
            <CardDescription>Schedule a new workshop</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => createWorkshop.mutate()}
              disabled={createWorkshop.isPending}
              className="w-full"
            >
              {createWorkshop.isPending ? 'Creating...' : 'Create Workshop'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Skill Offer</CardTitle>
            <CardDescription>Offer your skills</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => createSkillOffer.mutate()}
              disabled={createSkillOffer.isPending}
              className="w-full"
            >
              {createSkillOffer.isPending ? 'Creating...' : 'Create Skill Offer'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Send Message</CardTitle>
            <CardDescription>Send a test message</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => sendMessage.mutate()}
              disabled={sendMessage.isPending}
              className="w-full"
            >
              {sendMessage.isPending ? 'Sending...' : 'Send Message'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Team</CardTitle>
            <CardDescription>Create a new team</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => createTeam.mutate()}
              disabled={createTeam.isPending}
              className="w-full"
            >
              {createTeam.isPending ? 'Creating...' : 'Create Team'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Notification</CardTitle>
            <CardDescription>Add a new notification</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => createNotification.mutate()}
              disabled={createNotification.isPending}
              className="w-full"
            >
              {createNotification.isPending ? 'Creating...' : 'Create Notification'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Collaboration Proposal</CardTitle>
            <CardDescription>Propose a collaboration</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => createCollaborationProposal.mutate()}
              disabled={createCollaborationProposal.isPending}
              className="w-full"
            >
              {createCollaborationProposal.isPending ? 'Creating...' : 'Create Proposal'}
            </Button>
          </CardContent>
        </Card>

        {/* Custom Form Card */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Create Custom Challenge</CardTitle>
            <CardDescription>Create a challenge with your own title and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Challenge Title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
              />
            </div>
            <Button 
              onClick={() => createCustomChallenge.mutate()}
              disabled={createCustomChallenge.isPending || !customTitle}
              className="w-full"
            >
              {createCustomChallenge.isPending ? 'Creating...' : 'Create Custom Challenge'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
