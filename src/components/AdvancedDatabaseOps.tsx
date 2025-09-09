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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const AdvancedDatabaseOps = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form states
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    challenge_type: '',
    target_metric: 1,
    reward_points: 10,
  });

  const [progressForm, setProgressForm] = useState({
    title: '',
    description: '',
    category: '',
    due_date: '',
  });

  const [workshopForm, setWorkshopForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60,
    max_attendees: 20,
  });

  const [skillForm, setSkillForm] = useState({
    skill: '',
    description: '',
    availability: '',
  });

  const [messageForm, setMessageForm] = useState({
    receiver_id: '',
    content: '',
    team_id: '',
  });

  // Fetch teams
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

  // Fetch users for messaging
  const { data: users } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Mutations
  const createChallengeMutation = useMutation({
    mutationFn: async (data: typeof challengeForm) => {
      const { data: result, error } = await supabase
        .from('builder_challenges')
        .insert([{
          ...data,
          user_id: user?.id,
          week_assigned: new Date().toISOString().split('T')[0],
          oracle_generated: false,
        }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-challenges'] });
      toast({ title: "Challenge created successfully!" });
      setChallengeForm({ title: '', description: '', challenge_type: '', target_metric: 1, reward_points: 10 });
    },
  });

  const createProgressMutation = useMutation({
    mutationFn: async (data: typeof progressForm) => {
      const { data: result, error } = await supabase
        .from('progress_entries')
        .insert([{
          ...data,
          team_id: profile?.team_id,
          user_id: user?.id,
          status: 'in_progress',
        }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress-entries'] });
      toast({ title: "Progress entry created!" });
      setProgressForm({ title: '', description: '', category: '', due_date: '' });
    },
  });

  const createWorkshopMutation = useMutation({
    mutationFn: async (data: typeof workshopForm) => {
      const { data: result, error } = await supabase
        .from('workshops')
        .insert([{
          ...data,
          host_id: user?.id,
          status: 'scheduled',
          attendees: [],
        }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
      toast({ title: "Workshop created!" });
      setWorkshopForm({ title: '', description: '', scheduled_at: '', duration_minutes: 60, max_attendees: 20 });
    },
  });

  const createSkillMutation = useMutation({
    mutationFn: async (data: typeof skillForm) => {
      const { data: result, error } = await supabase
        .from('skill_offers')
        .insert([{
          ...data,
          owner_id: user?.id,
          status: 'active',
        }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-offers'] });
      toast({ title: "Skill offer created!" });
      setSkillForm({ skill: '', description: '', availability: '' });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: typeof messageForm) => {
      const { data: result, error } = await supabase
        .from('messages')
        .insert([{
          ...data,
          sender_id: user?.id,
          sender_role: profile?.role || 'builder',
          receiver_role: 'builder',
        }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast({ title: "Message sent!" });
      setMessageForm({ receiver_id: '', content: '', team_id: '' });
    },
  });

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
      toast({ title: "Joined team successfully!" });
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (teamData: { name: string; description: string; project_name: string }) => {
      const { data, error } = await supabase
        .from('teams')
        .insert([{
          ...teamData,
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
      toast({ title: "Team created successfully!" });
    },
  });

  if (!user) {
    return <div>Please log in to use database operations.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Advanced Database Operations</h1>
      <p className="text-muted-foreground">Interactive forms for database operations</p>

      <Tabs defaultValue="challenges" className="space-y-4">
        <TabsList>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="workshops">Workshops</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        {/* Challenges Tab */}
        <TabsContent value="challenges">
          <Card>
            <CardHeader>
              <CardTitle>Create Builder Challenge</CardTitle>
              <CardDescription>Set up a new challenge for yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Challenge Title"
                  value={challengeForm.title}
                  onChange={(e) => setChallengeForm(prev => ({ ...prev, title: e.target.value }))}
                />
                <Select
                  value={challengeForm.challenge_type}
                  onValueChange={(value) => setChallengeForm(prev => ({ ...prev, challenge_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Challenge Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="learning">Learning</SelectItem>
                    <SelectItem value="collaboration">Collaboration</SelectItem>
                    <SelectItem value="networking">Networking</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Target Metric"
                  type="number"
                  value={challengeForm.target_metric}
                  onChange={(e) => setChallengeForm(prev => ({ ...prev, target_metric: parseInt(e.target.value) || 1 }))}
                />
                <Input
                  placeholder="Reward Points"
                  type="number"
                  value={challengeForm.reward_points}
                  onChange={(e) => setChallengeForm(prev => ({ ...prev, reward_points: parseInt(e.target.value) || 10 }))}
                />
                <Textarea
                  placeholder="Description"
                  className="col-span-2"
                  value={challengeForm.description}
                  onChange={(e) => setChallengeForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Button 
                onClick={() => createChallengeMutation.mutate(challengeForm)}
                disabled={createChallengeMutation.isPending || !challengeForm.title || !challengeForm.challenge_type}
                className="w-full"
              >
                {createChallengeMutation.isPending ? 'Creating...' : 'Create Challenge'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle>Create Progress Entry</CardTitle>
              <CardDescription>Track your progress and milestones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Entry Title"
                  value={progressForm.title}
                  onChange={(e) => setProgressForm(prev => ({ ...prev, title: e.target.value }))}
                />
                <Select
                  value={progressForm.category}
                  onValueChange={(value) => setProgressForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="documentation">Documentation</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Due Date"
                  type="date"
                  value={progressForm.due_date}
                  onChange={(e) => setProgressForm(prev => ({ ...prev, due_date: e.target.value }))}
                />
                <Textarea
                  placeholder="Description"
                  className="col-span-2"
                  value={progressForm.description}
                  onChange={(e) => setProgressForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Button 
                onClick={() => createProgressMutation.mutate(progressForm)}
                disabled={createProgressMutation.isPending || !progressForm.title || !progressForm.category}
                className="w-full"
              >
                {createProgressMutation.isPending ? 'Creating...' : 'Create Progress Entry'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workshops Tab */}
        <TabsContent value="workshops">
          <Card>
            <CardHeader>
              <CardTitle>Create Workshop</CardTitle>
              <CardDescription>Schedule a new workshop or learning session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Workshop Title"
                  value={workshopForm.title}
                  onChange={(e) => setWorkshopForm(prev => ({ ...prev, title: e.target.value }))}
                />
                <Input
                  placeholder="Duration (minutes)"
                  type="number"
                  value={workshopForm.duration_minutes}
                  onChange={(e) => setWorkshopForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                />
                <Input
                  placeholder="Max Attendees"
                  type="number"
                  value={workshopForm.max_attendees}
                  onChange={(e) => setWorkshopForm(prev => ({ ...prev, max_attendees: parseInt(e.target.value) || 20 }))}
                />
                <Input
                  placeholder="Scheduled Date & Time"
                  type="datetime-local"
                  value={workshopForm.scheduled_at}
                  onChange={(e) => setWorkshopForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                />
                <Textarea
                  placeholder="Description"
                  className="col-span-2"
                  value={workshopForm.description}
                  onChange={(e) => setWorkshopForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Button 
                onClick={() => createWorkshopMutation.mutate(workshopForm)}
                disabled={createWorkshopMutation.isPending || !workshopForm.title || !workshopForm.scheduled_at}
                className="w-full"
              >
                {createWorkshopMutation.isPending ? 'Creating...' : 'Create Workshop'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle>Create Skill Offer</CardTitle>
              <CardDescription>Offer your skills to the community</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Skill Name"
                  value={skillForm.skill}
                  onChange={(e) => setSkillForm(prev => ({ ...prev, skill: e.target.value }))}
                />
                <Input
                  placeholder="Availability (e.g., 10 hours/week)"
                  value={skillForm.availability}
                  onChange={(e) => setSkillForm(prev => ({ ...prev, availability: e.target.value }))}
                />
                <Textarea
                  placeholder="Description"
                  className="col-span-2"
                  value={skillForm.description}
                  onChange={(e) => setSkillForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Button 
                onClick={() => createSkillMutation.mutate(skillForm)}
                disabled={createSkillMutation.isPending || !skillForm.skill}
                className="w-full"
              >
                {createSkillMutation.isPending ? 'Creating...' : 'Create Skill Offer'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Send Message</CardTitle>
              <CardDescription>Send a message to another user</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={messageForm.receiver_id}
                  onValueChange={(value) => setMessageForm(prev => ({ ...prev, receiver_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Receiver" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={messageForm.team_id}
                  onValueChange={(value) => setMessageForm(prev => ({ ...prev, team_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Team (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Message Content"
                  className="col-span-2"
                  value={messageForm.content}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
              <Button 
                onClick={() => sendMessageMutation.mutate(messageForm)}
                disabled={sendMessageMutation.isPending || !messageForm.receiver_id || !messageForm.content}
                className="w-full"
              >
                {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <div className="space-y-4">
            {/* Create Team */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Team</CardTitle>
                <CardDescription>Start a new team and project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Team Name"
                    id="team-name"
                  />
                  <Input
                    placeholder="Project Name"
                    id="project-name"
                  />
                  <Textarea
                    placeholder="Team Description"
                    className="col-span-2"
                    id="team-description"
                  />
                </div>
                <Button 
                  onClick={() => {
                    const name = (document.getElementById('team-name') as HTMLInputElement)?.value;
                    const description = (document.getElementById('team-description') as HTMLInputElement)?.value;
                    const project_name = (document.getElementById('project-name') as HTMLInputElement)?.value;
                    
                    if (name) {
                      createTeamMutation.mutate({ name, description, project_name });
                    }
                  }}
                  disabled={createTeamMutation.isPending}
                  className="w-full"
                >
                  {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
                </Button>
              </CardContent>
            </Card>

            {/* Join Team */}
            <Card>
              <CardHeader>
                <CardTitle>Join Existing Team</CardTitle>
                <CardDescription>Join a team that's looking for members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select onValueChange={(teamId) => joinTeamMutation.mutate(teamId)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Team to Join" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex flex-col">
                          <span>{team.name}</span>
                          <span className="text-sm text-muted-foreground">{team.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
