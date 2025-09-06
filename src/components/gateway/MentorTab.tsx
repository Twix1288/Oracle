import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, MessageSquare, Users, TrendingUp, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const MentorTab = () => {
  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  const [myMentees, setMyMentees] = useState<any[]>([]);
  const [teamInsights, setTeamInsights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMentorData();
  }, []);

  const loadMentorData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load connection requests for mentorship
      const { data: requests } = await supabase
        .from('connection_requests')
        .select(`
          *,
          requester:profiles!connection_requests_requester_id_fkey(
            id, full_name, avatar_url, skills, bio, experience_level
          )
        `)
        .eq('requested_id', user.id)
        .eq('request_type', 'mentorship')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setActiveRequests(requests || []);

      // Load current mentees (accepted connections)
      const { data: mentees } = await supabase
        .from('connection_requests')
        .select(`
          *,
          requester:profiles!connection_requests_requester_id_fkey(
            id, full_name, avatar_url, skills, bio, team_id,
            team:teams(name, project_name, stage)
          )
        `)
        .eq('requested_id', user.id)
        .eq('request_type', 'mentorship')
        .eq('status', 'accepted')
        .order('responded_at', { ascending: false });

      setMyMentees(mentees || []);

      // Load team insights for teams that need mentorship
      const { data: teams } = await supabase
        .from('teams')
        .select(`
          *,
          members:members(count),
          recent_updates:updates(content, type, created_at)
        `)
        .not('mentorship_areas', 'is', null)
        .order('last_activity', { ascending: false })
        .limit(10);

      setTeamInsights(teams || []);

    } catch (error) {
      console.error('Error loading mentor data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load mentor dashboard data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestResponse = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({
          status: action === 'accept' ? 'accepted' : 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: action === 'accept' ? "Request Accepted" : "Request Declined",
        description: `You have ${action}ed the mentorship request.`,
      });

      loadMentorData();
    } catch (error) {
      console.error('Error responding to request:', error);
      toast({
        title: "Error",
        description: "Failed to respond to request.",
        variant: "destructive"
      });
    }
  };

  const sendMessage = async (userId: string, userName: string) => {
    // This would open a messaging interface
    toast({
      title: "Message Feature",
      description: `Messaging with ${userName} - feature coming soon!`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading mentor dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500/20">
              <GraduationCap className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Mentor Dashboard</h2>
              <p className="text-muted-foreground">
                Guide the next generation of builders and share your expertise.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Requests ({activeRequests.length})
          </TabsTrigger>
          <TabsTrigger value="mentees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            My Mentees ({myMentees.length})
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Team Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4 mt-6">
          {activeRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
                <p className="text-muted-foreground">
                  You don't have any pending mentorship requests at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            activeRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={request.requester?.avatar_url} />
                      <AvatarFallback>
                        {request.requester?.full_name?.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{request.requester?.full_name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {request.requester?.bio}
                          </p>
                          
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline">
                              {request.requester?.experience_level}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(request.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {request.requester?.skills && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {request.requester.skills.slice(0, 4).map((skill: string) => (
                                <Badge key={skill} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {request.message && (
                            <div className="bg-muted/50 p-3 rounded-lg mb-3">
                              <p className="text-sm">{request.message}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleRequestResponse(request.id, 'accept')}
                        >
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRequestResponse(request.id, 'decline')}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="mentees" className="space-y-4 mt-6">
          {myMentees.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Mentees</h3>
                <p className="text-muted-foreground">
                  You don't have any active mentees yet. Accept some mentorship requests to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            myMentees.map((mentee) => (
              <Card key={mentee.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={mentee.requester?.avatar_url} />
                      <AvatarFallback>
                        {mentee.requester?.full_name?.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{mentee.requester?.full_name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {mentee.requester?.bio}
                          </p>
                          
                          {mentee.requester?.team && (
                            <div className="mb-3">
                              <p className="text-sm">
                                <strong>Team:</strong> {mentee.requester.team.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {mentee.requester.team.project_name} • {mentee.requester.team.stage}
                              </p>
                            </div>
                          )}

                          {mentee.requester?.skills && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {mentee.requester.skills.slice(0, 4).map((skill: string) => (
                                <Badge key={skill} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => sendMessage(mentee.requester.id, mentee.requester.full_name)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                        <Button size="sm" variant="outline">
                          <Calendar className="h-4 w-4 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 mt-6">
          <div className="grid gap-4">
            {teamInsights.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{team.name}</span>
                    <Badge variant="outline">{team.stage}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {team.project_description || team.description}
                    </p>
                    
                    <div>
                      <p className="text-sm font-medium">Mentorship Areas Needed:</p>
                      <p className="text-sm text-muted-foreground">{team.mentorship_areas}</p>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span>{team.members?.[0]?.count || 0} members</span>
                      <span>Last activity: {new Date(team.last_activity).toLocaleDateString()}</span>
                    </div>

                    <Button size="sm" variant="outline" className="w-full">
                      Offer Mentorship
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};