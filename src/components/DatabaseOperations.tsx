import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export const DatabaseOperations = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  // Fetch teams for dropdown
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's current team
  const { data: userTeam } = useQuery({
    queryKey: ['user-team', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Builder Challenges Operations
  const createChallengeMutation = useMutation({
    mutationFn: async (challengeData: {
      title: string;
      description: string;
      challenge_type: string;
      target_metric: number;
      reward_points: number;
    }) => {
      const { data, error } = await supabase
        .from('builder_challenges')
        .insert([{
          ...challengeData,
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

  const updateChallengeProgressMutation = useMutation({
    mutationFn: async ({ challengeId, progress }: { challengeId: string; progress: number }) => {
      const { data, error } = await supabase
        .from('builder_challenges')
        .update({ current_progress: progress })
        .eq('id', challengeId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-challenges'] });
      toast({ title: "Progress updated!" });
    },
  });

  // Connection Requests Operations
  const sendConnectionRequestMutation = useMutation({
    mutationFn: async ({ targetId, message, requestType }: { 
      targetId: string; 
      message: string; 
      requestType: string;
    }) => {
      const { data, error } = await supabase
        .from('connection_requests')
        .insert([{
          requester_id: user?.id,
          requested_id: targetId,
          message,
          request_type: requestType,
          oracle_generated: false,
          status: 'pending',
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connection-requests'] });
      toast({ title: "Connection request sent!" });
    },
  });

  const respondToConnectionRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const { data, error } = await supabase
        .from('connection_requests')
        .update({ 
          status,
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connection-requests'] });
      toast({ title: `Request ${status === 'accepted' ? 'accepted' : 'declined'}!` });
    },
  });

  // Collaboration Proposals Operations
  const createCollaborationProposalMutation = useMutation({
    mutationFn: async (proposalData: {
      target_id: string;
      project_id: string;
      proposal_type: string;
      title: string;
      description: string;
      timeline: string;
      deliverables: any[];
    }) => {
      const { data, error } = await supabase
        .from('collaboration_proposals')
        .insert([{
          ...proposalData,
          proposer_id: user?.id,
          status: 'pending',
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaboration-proposals'] });
      toast({ title: "Collaboration proposal sent!" });
    },
  });

  // Progress Entries Operations
  const createProgressEntryMutation = useMutation({
    mutationFn: async (entryData: {
      title: string;
      description: string;
      category: string;
      due_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('progress_entries')
        .insert([{
          ...entryData,
          team_id: userTeam?.team_id || selectedTeam,
          user_id: user?.id,
          status: 'in_progress',
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

  const completeProgressEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await supabase
        .from('progress_entries')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', entryId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress-entries'] });
      toast({ title: "Progress entry completed!" });
    },
  });

  // Notifications Operations
  const markNotificationAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "Notification marked as read!" });
    },
  });

  // Workshops Operations
  const createWorkshopMutation = useMutation({
    mutationFn: async (workshopData: {
      title: string;
      description: string;
      scheduled_at: string;
      duration_minutes: number;
      max_attendees: number;
    }) => {
      const { data, error } = await supabase
        .from('workshops')
        .insert([{
          ...workshopData,
          host_id: user?.id,
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

  const joinWorkshopMutation = useMutation({
    mutationFn: async (workshopId: string) => {
      // First get current attendees
      const { data: workshop, error: fetchError } = await supabase
        .from('workshops')
        .select('attendees')
        .eq('id', workshopId)
        .single();
      
      if (fetchError) throw fetchError;

      const currentAttendees = workshop.attendees || [];
      const updatedAttendees = [...currentAttendees, user?.id];

      const { data, error } = await supabase
        .from('workshops')
        .update({ attendees: updatedAttendees })
        .eq('id', workshopId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
      toast({ title: "Joined workshop!" });
    },
  });

  // Skill Offers Operations
  const createSkillOfferMutation = useMutation({
    mutationFn: async (skillData: {
      skill: string;
      description: string;
      availability: string;
    }) => {
      const { data, error } = await supabase
        .from('skill_offers')
        .insert([{
          ...skillData,
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

  // Messages Operations
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: {
      receiver_id: string;
      content: string;
      team_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          ...messageData,
          sender_id: user?.id,
          sender_role: profile?.role || 'builder',
          receiver_role: 'builder', // This would need to be fetched
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

  // Team Management Operations
  const joinTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const { data, error } = await supabase
        .from('members')
        .insert([{
          user_id: user?.id,
          team_id: teamId,
          role: 'builder',
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['user-team'] });
      toast({ title: "Joined team!" });
    },
  });

  const leaveTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const { data, error } = await supabase
        .from('members')
        .delete()
        .eq('user_id', user?.id)
        .eq('team_id', teamId)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['user-team'] });
      toast({ title: "Left team!" });
    },
  });

  if (!user) {
    return <div>Please log in to use database operations.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Database Operations</h1>
      
      {/* Builder Challenges */}
      <Card>
        <CardHeader>
          <CardTitle>Builder Challenges</CardTitle>
          <CardDescription>Create and manage personal challenges</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Challenge Title" id="challenge-title" />
            <Input placeholder="Challenge Type" id="challenge-type" />
            <Textarea placeholder="Description" id="challenge-description" className="col-span-2" />
            <Input placeholder="Target Metric" type="number" id="target-metric" />
            <Input placeholder="Reward Points" type="number" id="reward-points" />
          </div>
          <Button 
            onClick={() => {
              const title = (document.getElementById('challenge-title') as HTMLInputElement)?.value;
              const description = (document.getElementById('challenge-description') as HTMLInputElement)?.value;
              const challenge_type = (document.getElementById('challenge-type') as HTMLInputElement)?.value;
              const target_metric = parseInt((document.getElementById('target-metric') as HTMLInputElement)?.value || '1');
              const reward_points = parseInt((document.getElementById('reward-points') as HTMLInputElement)?.value || '10');
              
              if (title && challenge_type) {
                createChallengeMutation.mutate({
                  title,
                  description,
                  challenge_type,
                  target_metric,
                  reward_points,
                });
              }
            }}
            disabled={createChallengeMutation.isPending}
          >
            {createChallengeMutation.isPending ? 'Creating...' : 'Create Challenge'}
          </Button>
        </CardContent>
      </Card>

      {/* Progress Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Entries</CardTitle>
          <CardDescription>Track your progress and milestones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Entry Title" id="progress-title" />
            <Select onValueChange={(value) => setSelectedTeam(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Team" />
              </SelectTrigger>
              <SelectContent>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Category" id="progress-category" />
            <Input placeholder="Due Date" type="date" id="progress-due-date" />
            <Textarea placeholder="Description" id="progress-description" className="col-span-2" />
          </div>
          <Button 
            onClick={() => {
              const title = (document.getElementById('progress-title') as HTMLInputElement)?.value;
              const description = (document.getElementById('progress-description') as HTMLInputElement)?.value;
              const category = (document.getElementById('progress-category') as HTMLInputElement)?.value;
              const due_date = (document.getElementById('progress-due-date') as HTMLInputElement)?.value;
              
              if (title && category) {
                createProgressEntryMutation.mutate({
                  title,
                  description,
                  category,
                  due_date: due_date || undefined,
                });
              }
            }}
            disabled={createProgressEntryMutation.isPending}
          >
            {createProgressEntryMutation.isPending ? 'Creating...' : 'Create Progress Entry'}
          </Button>
        </CardContent>
      </Card>

      {/* Workshops */}
      <Card>
        <CardHeader>
          <CardTitle>Workshops</CardTitle>
          <CardDescription>Create and join workshops</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Workshop Title" id="workshop-title" />
            <Input placeholder="Duration (minutes)" type="number" id="workshop-duration" />
            <Input placeholder="Max Attendees" type="number" id="workshop-max-attendees" />
            <Input placeholder="Scheduled Date" type="datetime-local" id="workshop-scheduled" />
            <Textarea placeholder="Description" id="workshop-description" className="col-span-2" />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                const title = (document.getElementById('workshop-title') as HTMLInputElement)?.value;
                const description = (document.getElementById('workshop-description') as HTMLInputElement)?.value;
                const scheduled_at = (document.getElementById('workshop-scheduled') as HTMLInputElement)?.value;
                const duration_minutes = parseInt((document.getElementById('workshop-duration') as HTMLInputElement)?.value || '60');
                const max_attendees = parseInt((document.getElementById('workshop-max-attendees') as HTMLInputElement)?.value || '20');
                
                if (title && scheduled_at) {
                  createWorkshopMutation.mutate({
                    title,
                    description,
                    scheduled_at,
                    duration_minutes,
                    max_attendees,
                  });
                }
              }}
              disabled={createWorkshopMutation.isPending}
            >
              {createWorkshopMutation.isPending ? 'Creating...' : 'Create Workshop'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                const workshopId = prompt('Enter Workshop ID to join:');
                if (workshopId) {
                  joinWorkshopMutation.mutate(workshopId);
                }
              }}
              disabled={joinWorkshopMutation.isPending}
            >
              {joinWorkshopMutation.isPending ? 'Joining...' : 'Join Workshop'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Skill Offers */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Offers</CardTitle>
          <CardDescription>Offer your skills to the community</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Skill Name" id="skill-name" />
            <Input placeholder="Availability" id="skill-availability" />
            <Textarea placeholder="Description" id="skill-description" className="col-span-2" />
          </div>
          <Button 
            onClick={() => {
              const skill = (document.getElementById('skill-name') as HTMLInputElement)?.value;
              const description = (document.getElementById('skill-description') as HTMLInputElement)?.value;
              const availability = (document.getElementById('skill-availability') as HTMLInputElement)?.value;
              
              if (skill) {
                createSkillOfferMutation.mutate({
                  skill,
                  description,
                  availability,
                });
              }
            }}
            disabled={createSkillOfferMutation.isPending}
          >
            {createSkillOfferMutation.isPending ? 'Creating...' : 'Create Skill Offer'}
          </Button>
        </CardContent>
      </Card>

      {/* Team Management */}
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>Join or leave teams</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select onValueChange={(teamId) => setSelectedTeam(teamId)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Team to Join" />
              </SelectTrigger>
              <SelectContent>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => {
                if (selectedTeam) {
                  joinTeamMutation.mutate(selectedTeam);
                }
              }}
              disabled={joinTeamMutation.isPending || !selectedTeam}
            >
              {joinTeamMutation.isPending ? 'Joining...' : 'Join Team'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                if (userTeam?.team_id) {
                  leaveTeamMutation.mutate(userTeam.team_id);
                }
              }}
              disabled={leaveTeamMutation.isPending || !userTeam?.team_id}
            >
              {leaveTeamMutation.isPending ? 'Leaving...' : 'Leave Current Team'}
            </Button>
          </div>
          {userTeam?.team_id && (
            <Badge variant="secondary">
              Current Team: {teams?.find(t => t.id === userTeam.team_id)?.name}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Connection Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Requests</CardTitle>
          <CardDescription>Connect with other builders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Target User ID" id="connection-target" />
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Request Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="introduction">Introduction</SelectItem>
                <SelectItem value="collaboration">Collaboration</SelectItem>
                <SelectItem value="mentorship">Mentorship</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Message" id="connection-message" className="col-span-2" />
          </div>
          <Button 
            onClick={() => {
              const targetId = (document.getElementById('connection-target') as HTMLInputElement)?.value;
              const message = (document.getElementById('connection-message') as HTMLInputElement)?.value;
              
              if (targetId && message) {
                sendConnectionRequestMutation.mutate({
                  targetId,
                  message,
                  requestType: 'introduction',
                });
              }
            }}
            disabled={sendConnectionRequestMutation.isPending}
          >
            {sendConnectionRequestMutation.isPending ? 'Sending...' : 'Send Connection Request'}
          </Button>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>Send messages to other users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Receiver User ID" id="message-receiver" />
            <Input placeholder="Team ID (optional)" id="message-team" />
            <Textarea placeholder="Message Content" id="message-content" className="col-span-2" />
          </div>
          <Button 
            onClick={() => {
              const receiver_id = (document.getElementById('message-receiver') as HTMLInputElement)?.value;
              const content = (document.getElementById('message-content') as HTMLInputElement)?.value;
              const team_id = (document.getElementById('message-team') as HTMLInputElement)?.value;
              
              if (receiver_id && content) {
                sendMessageMutation.mutate({
                  receiver_id,
                  content,
                  team_id: team_id || undefined,
                });
              }
            }}
            disabled={sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
