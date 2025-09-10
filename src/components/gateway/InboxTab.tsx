import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Inbox, MessageCircle, Handshake, Sparkles, Clock, CheckCircle, X, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ConnectionRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_avatar?: string;
  requester_bio?: string;
  requester_skills?: string[];
  request_type: string;
  message: string;
  status: string;
  created_at: string;
  oracle_generated: boolean;
}

interface CollaborationInvitation {
  id: string;
  project_name: string;
  project_description: string;
  inviter_name: string;
  inviter_avatar?: string;
  collaboration_type: string;
  message: string;
  status: string;
  created_at: string;
  project_id: string;
}

interface OracleSuggestion {
  id: string;
  type: 'connection' | 'collaboration' | 'mentor' | 'resource';
  title: string;
  description: string;
  confidence: number;
  evidence: string[];
  action_required: boolean;
  created_at: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

export const InboxTab = () => {
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [collaborationInvitations, setCollaborationInvitations] = useState<CollaborationInvitation[]>([]);
  const [oracleSuggestions, setOracleSuggestions] = useState<OracleSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchInboxData();
    } else {
      setMockData();
    }
  }, [user]);

  const setMockData = () => {
    // Mock connection requests
    const mockRequests: ConnectionRequest[] = [
      {
        id: 'req-1',
        requester_id: 'user-1',
        requester_name: 'Alex Chen',
        requester_avatar: 'https://avatar.vercel.sh/Alex%20Chen',
        requester_bio: 'Full-stack developer passionate about AI and blockchain',
        requester_skills: ['React', 'Node.js', 'Solidity'],
        request_type: 'collaboration',
        message: 'Hi! I noticed your EcoTracker project and think my blockchain skills could complement your work. Would love to discuss potential collaboration!',
        status: 'pending',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        oracle_generated: true
      },
      {
        id: 'req-2',
        requester_id: 'user-2',
        requester_name: 'Sarah Martinez',
        requester_avatar: 'https://avatar.vercel.sh/Sarah%20Martinez',
        requester_bio: 'UX Designer specializing in mobile experiences',
        requester_skills: ['Figma', 'User Research', 'Prototyping'],
        request_type: 'skill_exchange',
        message: 'I\'d love to help with design for your projects in exchange for learning about development!',
        status: 'pending',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        oracle_generated: false
      }
    ];

    // Mock collaboration invitations
    const mockInvitations: CollaborationInvitation[] = [
      {
        id: 'inv-1',
        project_name: 'AI Recipe Generator',
        project_description: 'Building a smart recipe recommendation system using machine learning',
        inviter_name: 'Michael Rodriguez',
        inviter_avatar: 'https://avatar.vercel.sh/Michael%20Rodriguez',
        collaboration_type: 'Frontend Development',
        message: 'We need a React expert to build the user interface for our AI recipe platform. Interested?',
        status: 'pending',
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        project_id: 'project-123'
      }
    ];

    // Mock Oracle suggestions
    const mockSuggestions: OracleSuggestion[] = [
      {
        id: 'oracle-1',
        type: 'connection',
        title: 'High-Match Developer Found',
        description: 'Emily Watson (ML Engineer) has complementary skills for your EcoTracker project',
        confidence: 0.94,
        evidence: [
          'Both working on environmental impact projects',
          'Your React skills + her Python/ML expertise = perfect match',
          'She\'s actively seeking frontend collaboration'
        ],
        action_required: true,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'pending'
      },
      {
        id: 'oracle-2',
        type: 'collaboration',
        title: 'Project Synergy Detected',
        description: 'DataViz Dashboard project could integrate with your EcoTracker app',
        confidence: 0.87,
        evidence: [
          'Both projects focus on data visualization',
          'Potential for shared user base',
          'Complementary technology stacks'
        ],
        action_required: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      },
      {
        id: 'oracle-3',
        type: 'mentor',
        title: 'Mentor Match Available',
        description: 'Lisa Thompson (Product Strategy Expert) matches your growth goals',
        confidence: 0.91,
        evidence: [
          'Expertise in product-market fit (your stated learning goal)',
          'Experience with environmental tech startups',
          'Available for mentorship with 5+ hour/week availability'
        ],
        action_required: true,
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      }
    ];

    setConnectionRequests(mockRequests);
    setCollaborationInvitations(mockInvitations);
    setOracleSuggestions(mockSuggestions);
    setIsLoading(false);
  };

  const fetchInboxData = async () => {
    try {
      // Fetch connection requests  
      const { data: requests, error: requestsError } = await supabase
        .from('connection_requests')
        .select(`
          id,
          requester_id,
          requested_id,
          request_type,
          message,
          status,
          created_at,
          oracle_generated,
          profiles!connection_requests_requester_id_fkey (
            full_name,
            avatar_url,
            bio,
            skills
          )
        `)
        .eq('requested_id', user?.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('Connection requests error:', requestsError);
        // Fallback to basic query without join
        const { data: basicRequests } = await supabase
          .from('connection_requests')
          .select('*')
          .eq('requested_id', user?.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        const transformedBasicRequests = (basicRequests || []).map(req => ({
          id: req.id,
          requester_id: req.requester_id,
          requester_name: 'Builder',
          requester_avatar: undefined,
          requester_bio: undefined,
          requester_skills: [],
          request_type: req.request_type,
          message: req.message,
          status: req.status,
          created_at: req.created_at,
          oracle_generated: req.oracle_generated
        }));

        setConnectionRequests(transformedBasicRequests);
      } else {
        // Transform the data to match our interface
        const transformedRequests = (requests || []).map(req => ({
          id: req.id,
          requester_id: req.requester_id,
          requester_name: req.profiles?.full_name || 'Unknown User',
          requester_avatar: req.profiles?.avatar_url,
          requester_bio: req.profiles?.bio,
          requester_skills: req.profiles?.skills || [],
          request_type: req.request_type,
          message: req.message,
          status: req.status,
          created_at: req.created_at,
          oracle_generated: req.oracle_generated
        }));

        setConnectionRequests(transformedRequests);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching inbox data:', error);
      setIsLoading(false);
    }
  };

  const handleConnectionResponse = async (requestId: string, response: 'accepted' | 'declined') => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ 
          status: response,
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      if (response === 'accepted') {
        // Create connection record
        const request = connectionRequests.find(r => r.id === requestId);
        if (request) {
          await supabase
            .from('builder_connections')
            .insert({
              connector_id: request.requester_id,
              connectee_id: user?.id,
              connection_type: request.request_type,
              status: 'active'
            });
        }
      }

      toast({
        title: response === 'accepted' ? "Connection Accepted" : "Request Declined",
        description: response === 'accepted' 
          ? "You're now connected! Check your network." 
          : "Request has been declined.",
      });

      // Refresh data
      fetchInboxData();
    } catch (error) {
      console.error('Error responding to connection:', error);
      toast({
        title: "Error",
        description: "Failed to respond to connection request.",
        variant: "destructive"
      });
    }
  };

  const handleCollaborationResponse = async (invitationId: string, response: 'accepted' | 'declined') => {
    try {
      // Update collaboration invitation status
      const { error } = await supabase
        .from('collaboration_proposals')
        .update({ 
          status: response,
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) throw error;

      if (response === 'accepted') {
        // Create team membership or connection
        const invitation = collaborationInvitations.find(i => i.id === invitationId);
        if (invitation) {
          // Add user to the project team
          await supabase
            .from('members')
            .insert({
              team_id: invitation.project_id,
              user_id: user?.id,
              role: invitation.collaboration_type,
              status: 'active'
            });
        }
      }

      toast({
        title: response === 'accepted' ? "Collaboration Accepted" : "Invitation Declined",
        description: response === 'accepted' 
          ? "You've joined the project team!" 
          : "Invitation has been declined.",
      });

      // Refresh data
      fetchInboxData();
    } catch (error) {
      console.error('Error responding to collaboration:', error);
      toast({
        title: "Error",
        description: "Failed to respond to collaboration invitation.",
        variant: "destructive"
      });
    }
  };

  const handleOracleAction = async (suggestionId: string, action: 'accept' | 'dismiss') => {
    const suggestion = oracleSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    if (action === 'accept') {
      // Take action based on suggestion type
      if (suggestion.type === 'connection') {
        // Create connection request
        toast({
          title: "Connection Request Sent",
          description: "Oracle will facilitate the introduction!",
        });
      } else if (suggestion.type === 'collaboration') {
        // Navigate to project or send collaboration request
        toast({
          title: "Collaboration Interest Sent",
          description: "The project team will be notified!",
        });
      } else if (suggestion.type === 'mentor') {
        // Send mentorship request
        toast({
          title: "Mentorship Request Sent",
          description: "Your potential mentor will be contacted!",
        });
      }
    }

    // Update suggestion status
    setOracleSuggestions(prev => 
      prev.map(s => 
        s.id === suggestionId 
          ? { ...s, status: action === 'accept' ? 'accepted' : 'dismissed' }
          : s
      )
    );

    toast({
      title: action === 'accept' ? "Action Taken" : "Suggestion Dismissed",
      description: action === 'accept' 
        ? "Oracle has initiated the recommended action." 
        : "Suggestion has been dismissed.",
    });
  };

  const getRequestTypeColor = (type: string) => {
    switch (type) {
      case 'collaboration': return 'bg-blue-100 text-blue-800';
      case 'mentorship': return 'bg-purple-100 text-purple-800';
      case 'skill_exchange': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSuggestionTypeIcon = (type: string) => {
    switch (type) {
      case 'connection': return <Users className="h-4 w-4" />;
      case 'collaboration': return <Handshake className="h-4 w-4" />;
      case 'mentor': return <Sparkles className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const pendingCount = connectionRequests.length + collaborationInvitations.length + 
    oracleSuggestions.filter(s => s.status === 'pending').length;

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
      {/* Inbox Header */}
      <Card className="glow-border bg-gradient-to-r from-primary/5 to-primary-glow/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Inbox</CardTitle>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {pendingCount} pending
                </Badge>
              )}
            </div>
          </div>
          <CardDescription>
            Connection requests, collaboration invitations, and Oracle suggestions
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Oracle Suggestions */}
      {oracleSuggestions.filter(s => s.status === 'pending').length > 0 && (
        <Card className="glow-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Oracle Suggestions</CardTitle>
              <Badge variant="outline" className="text-xs">
                AI-powered
              </Badge>
            </div>
            <CardDescription>
              Personalized opportunities based on your profile and activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {oracleSuggestions.filter(s => s.status === 'pending').map((suggestion) => (
              <div key={suggestion.id} className="border border-primary/20 rounded-lg p-4 bg-primary/5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSuggestionTypeIcon(suggestion.type)}
                      <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(suggestion.confidence * 100)}% match
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-xs font-medium text-primary">Oracle Evidence:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {suggestion.evidence.map((item, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground">{item}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleOracleAction(suggestion.id, 'accept')}
                        className="text-xs"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Take Action
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleOracleAction(suggestion.id, 'dismiss')}
                        className="text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Connection Requests */}
      {connectionRequests.length > 0 && (
        <Card className="glow-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Connection Requests</CardTitle>
              <Badge variant="outline" className="text-xs">
                {connectionRequests.length} pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectionRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={request.requester_avatar} />
                    <AvatarFallback>
                      {request.requester_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{request.requester_name}</h4>
                      <Badge className={getRequestTypeColor(request.request_type)}>
                        {request.request_type.replace('_', ' ')}
                      </Badge>
                      {request.oracle_generated && (
                        <Badge variant="outline" className="text-xs bg-primary/10">
                          Oracle Match
                        </Badge>
                      )}
                    </div>
                    
                    {request.requester_bio && (
                      <p className="text-xs text-muted-foreground mb-2">{request.requester_bio}</p>
                    )}
                    
                    {request.requester_skills && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {request.requester_skills.slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-sm mb-3 p-3 bg-muted/50 rounded-lg">"{request.message}"</p>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleConnectionResponse(request.id, 'accepted')}
                        className="text-xs"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleConnectionResponse(request.id, 'declined')}
                        className="text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Collaboration Invitations */}
      {collaborationInvitations.length > 0 && (
        <Card className="glow-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Collaboration Invitations</CardTitle>
              <Badge variant="outline" className="text-xs">
                {collaborationInvitations.length} pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {collaborationInvitations.map((invitation) => (
              <div key={invitation.id} className="border border-green-200/50 rounded-lg p-4 bg-green-50/20">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={invitation.inviter_avatar} />
                    <AvatarFallback>
                      {invitation.inviter_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{invitation.project_name}</h4>
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        {invitation.collaboration_type}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2">by {invitation.inviter_name}</p>
                    <p className="text-xs text-muted-foreground mb-3">{invitation.project_description}</p>
                    
                    <p className="text-sm mb-3 p-3 bg-background/50 rounded-lg">"{invitation.message}"</p>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(invitation.created_at).toLocaleDateString()}</span>
                    </div>
                    
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          className="text-xs"
                          onClick={() => handleCollaborationResponse(invitation.id, 'accepted')}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => handleCollaborationResponse(invitation.id, 'declined')}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-xs"
                          onClick={() => {
                            toast({
                              title: "Viewing Project",
                              description: `Opening project: ${invitation.project_name}`,
                            });
                          }}
                        >
                          View Project
                        </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {pendingCount === 0 && (
        <Card className="glow-border">
          <CardContent className="p-12 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">
              No pending requests or suggestions. Oracle will notify you of new opportunities.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};