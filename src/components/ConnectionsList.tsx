import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserPlus, 
  MessageCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Star,
  Search,
  Filter,
  MoreVertical,
  Send,
  Heart,
  Zap,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { OfferHelpButton } from '@/components/OfferHelpButton';
import { TakeActionButton } from '@/components/TakeActionButton';

interface Connection {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    bio: string;
    skills: string[];
    builder_level: string;
    availability_hours: number;
    status: 'online' | 'away' | 'offline';
  };
  connection_type: 'friend' | 'mentor' | 'mentee' | 'collaborator';
  status: 'connected' | 'pending' | 'blocked';
  connected_at: string;
  last_interaction: string;
  mutual_connections: number;
  collaboration_count: number;
  satisfaction_score: number;
}

interface ConnectionRequest {
  id: string;
  requester: {
    id: string;
    name: string;
    avatar?: string;
    bio: string;
    skills: string[];
    builder_level: string;
  };
  request_type: 'friend' | 'mentor' | 'mentee' | 'collaborator';
  message: string;
  oracle_generated: boolean;
  oracle_confidence?: number;
  created_at: string;
}

export const ConnectionsList: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'friends' | 'mentors' | 'collaborators'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'satisfaction'>('recent');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('connections');
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchConnections();
      fetchConnectionRequests();
    }
  }, [user]);

  const fetchConnections = async () => {
    try {
      setIsLoading(true);
      
      // Get accepted connections from builder_connections table
      const { data: acceptedConnections, error: connectionsError } = await supabase
        .from('builder_connections')
        .select(`
          *,
          connector:profiles!builder_connections_connector_id_fkey(*),
          connectee:profiles!builder_connections_connectee_id_fkey(*)
        `)
        .eq('status', 'active')
        .or(`connector_id.eq.${user?.id},connectee_id.eq.${user?.id}`);

      if (connectionsError) throw connectionsError;

      // Transform data into connections format
      const connectionsData: Connection[] = (acceptedConnections || []).map(connection => {
        const isConnector = connection.connector_id === user?.id;
        const otherUser = isConnector ? connection.connectee : connection.connector;
        
        return {
          id: `conn_${connection.id}`,
          user: {
            id: otherUser.id,
            name: otherUser.full_name || 'Anonymous Builder',
            avatar: otherUser.avatar_url,
            bio: otherUser.bio || 'Building the future, one project at a time.',
            skills: otherUser.skills || [],
            builder_level: otherUser.builder_level || 'novice',
            availability_hours: otherUser.availability_hours || 10,
            status: Math.random() > 0.7 ? 'online' : Math.random() > 0.5 ? 'away' : 'offline'
          },
          connection_type: connection.connection_type as any,
          status: 'connected',
          connected_at: connection.created_at,
          last_interaction: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          mutual_connections: Math.floor(Math.random() * 10),
          collaboration_count: Math.floor(Math.random() * 5),
          satisfaction_score: 3.5 + Math.random() * 1.5
        };
      });

      setConnections(connectionsData);
    } catch (error: any) {
      console.error('Error fetching connections:', error);
      // Use mock data as fallback
      setConnections(generateMockConnections());
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConnectionRequests = async () => {
    try {
      // Get pending requests where current user is the requested
      const { data: pendingRequests, error: pendingError } = await supabase
        .from('connection_requests')
        .select(`
          *,
          requester:profiles!connection_requests_requester_id_fkey(*)
        `)
        .eq('requested_id', user?.id)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      const requestsData: ConnectionRequest[] = (pendingRequests || []).map(request => ({
        id: request.id,
        requester: {
          id: request.requester.id,
          name: request.requester.full_name || 'Anonymous Builder',
          avatar: request.requester.avatar_url,
          bio: request.requester.bio || 'Building the future, one project at a time.',
          skills: request.requester.skills || [],
          builder_level: request.requester.builder_level || 'novice'
        },
        request_type: request.request_type as any,
        message: request.message,
        oracle_generated: request.oracle_generated || false,
        oracle_confidence: 0.8,
        created_at: request.created_at
      }));

      setConnectionRequests(requestsData);
    } catch (error: any) {
      console.error('Error fetching connection requests:', error);
      setConnectionRequests([]);
    }
  };

  const generateMockConnections = (): Connection[] => {
    return [
      {
        id: '1',
        user: {
          id: 'user1',
          name: 'Alex Chen',
          bio: 'Full-stack developer passionate about AI and blockchain',
          skills: ['React', 'Node.js', 'Solidity', 'Python'],
          builder_level: 'advanced',
          availability_hours: 15,
          status: 'online'
        },
        connection_type: 'collaborator',
        status: 'connected',
        connected_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        last_interaction: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        mutual_connections: 3,
        collaboration_count: 2,
        satisfaction_score: 4.5
      },
      {
        id: '2',
        user: {
          id: 'user2',
          name: 'Sarah Martinez',
          bio: 'UX Designer turning complex ideas into beautiful experiences',
          skills: ['Figma', 'User Research', 'Prototyping'],
          builder_level: 'intermediate',
          availability_hours: 12,
          status: 'away'
        },
        connection_type: 'friend',
        status: 'connected',
        connected_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        last_interaction: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        mutual_connections: 7,
        collaboration_count: 1,
        satisfaction_score: 4.2
      },
      {
        id: '3',
        user: {
          id: 'user3',
          name: 'Michael Rodriguez',
          bio: 'DevOps engineer scaling applications from zero to millions',
          skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform'],
          builder_level: 'expert',
          availability_hours: 8,
          status: 'offline'
        },
        connection_type: 'mentor',
        status: 'connected',
        connected_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        last_interaction: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        mutual_connections: 2,
        collaboration_count: 0,
        satisfaction_score: 4.8
      }
    ];
  };

  const handleAcceptConnection = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ 
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Send acceptance message
      const request = connectionRequests.find(r => r.id === requestId);
      if (request) {
        await supabase
          .from('messages')
          .insert({
            sender_id: user?.id,
            receiver_id: request.requester.id,
            content: `Hi ${request.requester.name}! I'd love to connect and explore ${request.request_type} opportunities. Looking forward to collaborating!`,
            sender_role: 'builder',
            receiver_role: 'builder'
          });
      }

      toast({
        title: "Connection Accepted!",
        description: `You're now connected with ${request?.requester.name}. A welcome message has been sent.`,
      });

      // Refresh data
      fetchConnections();
      fetchConnectionRequests();

    } catch (error: any) {
      console.error('Error accepting connection:', error);
      toast({
        title: "Error",
        description: "Failed to accept connection. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeclineConnection = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ 
          status: 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Connection Declined",
        description: "The connection request has been declined.",
      });

      // Refresh data
      fetchConnectionRequests();

    } catch (error: any) {
      console.error('Error declining connection:', error);
      toast({
        title: "Error",
        description: "Failed to decline connection. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getConnectionTypeColor = (type: string) => {
    switch (type) {
      case 'friend': return 'bg-blue-100 text-blue-800';
      case 'mentor': return 'bg-purple-100 text-purple-800';
      case 'mentee': return 'bg-green-100 text-green-800';
      case 'collaborator': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredConnections = connections.filter(connection => {
    const matchesSearch = connection.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        connection.user.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterType === 'all' || 
      (filterType === 'friends' && connection.connection_type === 'friend') ||
      (filterType === 'mentors' && connection.connection_type === 'mentor') ||
      (filterType === 'collaborators' && connection.connection_type === 'collaborator');
    return matchesSearch && matchesFilter;
  });

  const sortedConnections = [...filteredConnections].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.last_interaction).getTime() - new Date(a.last_interaction).getTime();
      case 'name':
        return a.user.name.localeCompare(b.user.name);
      case 'satisfaction':
        return b.satisfaction_score - a.satisfaction_score;
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="glow-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glow-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Connections</CardTitle>
            <Badge variant="outline" className="bg-primary/10">
              {connections.length} connected
            </Badge>
          </div>
          <CardDescription>
            Your network of builders, mentors, and collaborators
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connections">My Connections</TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {connectionRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {connectionRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-6">
          {/* Search and Filters */}
          <Card className="glow-border">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search connections..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="border rounded px-3 py-2 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="friends">Friends</option>
                  <option value="mentors">Mentors</option>
                  <option value="collaborators">Collaborators</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border rounded px-3 py-2 text-sm"
                >
                  <option value="recent">Recent Activity</option>
                  <option value="name">Name</option>
                  <option value="satisfaction">Satisfaction</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Connections List */}
          <div className="space-y-4">
            {sortedConnections.map((connection) => (
              <Card key={connection.id} className="glow-border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={connection.user.avatar} />
                        <AvatarFallback>
                          {connection.user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${getStatusColor(connection.user.status)}`} />
                    </div>

                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">{connection.user.name}</h3>
                            <Badge className={getConnectionTypeColor(connection.connection_type)}>
                              {connection.connection_type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              {connection.satisfaction_score.toFixed(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{connection.user.bio}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {connection.user.availability_hours}h/week
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {connection.mutual_connections} mutual
                            </div>
                            <div className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {connection.collaboration_count} collabs
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1">
                        {connection.user.skills.slice(0, 4).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {connection.user.skills.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{connection.user.skills.length - 4} more
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <TakeActionButton
                          actionType="connection"
                          targetUserId={connection.user.id}
                          targetUserName={connection.user.name}
                          targetUserSkills={connection.user.skills}
                          size="sm"
                          className="flex-1"
                        />
                        <OfferHelpButton
                          targetUserId={connection.user.id}
                          targetUserName={connection.user.name}
                          targetUserSkills={connection.user.skills}
                          size="sm"
                          variant="outline"
                        />
                        <Button size="sm" variant="ghost">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {sortedConnections.length === 0 && (
              <Card className="glow-border">
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No connections found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Try adjusting your search criteria.' : 'Start building your network by connecting with other builders!'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          {/* Connection Requests */}
          <div className="space-y-4">
            {connectionRequests.map((request) => (
              <Card key={request.id} className="glow-border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={request.requester.avatar} />
                      <AvatarFallback>
                        {request.requester.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">{request.requester.name}</h3>
                            <Badge className={getConnectionTypeColor(request.request_type)}>
                              {request.request_type}
                            </Badge>
                            {request.oracle_generated && (
                              <Badge variant="outline" className="text-xs bg-primary/10">
                                <Zap className="h-3 w-3 mr-1" />
                                AI Suggested
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{request.requester.bio}</p>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {request.requester.skills.slice(0, 3).map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Message:</p>
                        <p className="text-sm text-muted-foreground">{request.message}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleAcceptConnection(request.id)}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineConnection(request.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {connectionRequests.length === 0 && (
              <Card className="glow-border">
                <CardContent className="p-8 text-center">
                  <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                  <p className="text-muted-foreground">
                    You're all caught up! New connection requests will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};