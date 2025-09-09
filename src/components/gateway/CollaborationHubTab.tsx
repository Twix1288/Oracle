import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Handshake, Plus, Clock, Users, Zap, Target, MessageCircle, Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MicroCollaboration {
  id: string;
  title: string;
  description: string;
  skills_needed: string[];
  estimated_hours: number;
  urgency: 'low' | 'medium' | 'high';
  collaboration_type: 'code_review' | 'pair_programming' | 'design_feedback' | 'mentorship' | 'brainstorming';
  creator: {
    id: string;
    name: string;
    avatar?: string;
    builder_level: string;
  };
  status: 'open' | 'in_progress' | 'completed';
  interested_count: number;
  created_at: string;
}

interface SkillExchange {
  id: string;
  offering_skill: string;
  seeking_skill: string;
  description: string;
  exchange_type: 'one_time' | 'ongoing' | 'workshop';
  creator: {
    id: string;
    name: string;
    avatar?: string;
    expertise_level: string;
  };
  interested_count: number;
  created_at: string;
}

interface Partnership {
  id: string;
  project_name: string;
  partnership_type: 'co_founder' | 'technical_partner' | 'design_partner' | 'business_partner';
  description: string;
  commitment_level: 'part_time' | 'full_time' | 'contract';
  equity_offered?: string;
  skills_needed: string[];
  creator: {
    id: string;
    name: string;
    avatar?: string;
    builder_level: string;
  };
  applications_count: number;
  created_at: string;
}

export const CollaborationHubTab = () => {
  const [activeView, setActiveView] = useState<'browse' | 'create'>('browse');
  const [microCollabs, setMicroCollabs] = useState<MicroCollaboration[]>([]);
  const [skillExchanges, setSkillExchanges] = useState<SkillExchange[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [collaborationType, setCollaborationType] = useState<'micro' | 'skill' | 'partnership'>('micro');
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Form states for creating new collaborations
  const [newCollab, setNewCollab] = useState({
    title: '',
    description: '',
    skills_needed: [],
    estimated_hours: 2,
    urgency: 'medium' as const,
    collaboration_type: 'code_review' as const
  });

  const [newSkillExchange, setNewSkillExchange] = useState({
    offering_skill: '',
    seeking_skill: '',
    description: '',
    exchange_type: 'one_time' as const
  });

  const [newPartnership, setNewPartnership] = useState({
    project_name: '',
    partnership_type: 'technical_partner' as const,
    description: '',
    commitment_level: 'part_time' as const,
    equity_offered: '',
    skills_needed: []
  });

  useEffect(() => {
    fetchCollaborations();
  }, []);

  const fetchCollaborations = async () => {
    try {
      // Mock data for now - in real implementation, these would come from database
      const mockMicroCollabs: MicroCollaboration[] = [
        {
          id: '1',
          title: 'Code Review: React Authentication Flow',
          description: 'Need a second pair of eyes on my JWT authentication implementation. Looking for someone experienced with React and security best practices.',
          skills_needed: ['React', 'Authentication', 'Security'],
          estimated_hours: 2,
          urgency: 'medium',
          collaboration_type: 'code_review',
          creator: {
            id: 'user1',
            name: 'Alex Chen',
            builder_level: 'intermediate'
          },
          status: 'open',
          interested_count: 3,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Pair Programming: API Integration',
          description: 'Working on integrating a third-party API and could use some help debugging the async/await patterns.',
          skills_needed: ['JavaScript', 'APIs', 'Node.js'],
          estimated_hours: 3,
          urgency: 'high',
          collaboration_type: 'pair_programming',
          creator: {
            id: 'user2',
            name: 'Sarah Martinez',
            builder_level: 'beginner'
          },
          status: 'open',
          interested_count: 5,
          created_at: new Date().toISOString()
        }
      ];

      const mockSkillExchanges: SkillExchange[] = [
        {
          id: '1',
          offering_skill: 'React Development',
          seeking_skill: 'UI/UX Design',
          description: 'I can teach React fundamentals and hooks in exchange for learning design principles and Figma.',
          exchange_type: 'ongoing',
          creator: {
            id: 'user3',
            name: 'David Park',
            expertise_level: 'advanced'
          },
          interested_count: 7,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          offering_skill: 'Python & AI',
          seeking_skill: 'Frontend Development',
          description: 'Experienced in Python, machine learning, and AI. Want to learn modern frontend frameworks.',
          exchange_type: 'workshop',
          creator: {
            id: 'user4',
            name: 'Maya Patel',
            expertise_level: 'expert'
          },
          interested_count: 12,
          created_at: new Date().toISOString()
        }
      ];

      const mockPartnerships: Partnership[] = [
        {
          id: '1',
          project_name: 'EcoTrack - Sustainability App',
          partnership_type: 'technical_partner',
          description: 'Looking for a technical co-founder to help build a mobile app for tracking environmental impact. I handle business and design.',
          commitment_level: 'part_time',
          equity_offered: '20-30%',
          skills_needed: ['React Native', 'Node.js', 'Database Design'],
          creator: {
            id: 'user5',
            name: 'Emma Johnson',
            builder_level: 'intermediate'
          },
          applications_count: 8,
          created_at: new Date().toISOString()
        }
      ];

      setMicroCollabs(mockMicroCollabs);
      setSkillExchanges(mockSkillExchanges);
      setPartnerships(mockPartnerships);
    } catch (error) {
      console.error('Error fetching collaborations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpressInterest = async (type: string, id: string) => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in to express interest.",
          variant: "destructive"
        });
        return;
      }

      // Create connection request based on type
      const { error } = await supabase
        .from('connection_requests')
        .insert({
          requester_id: user.id,
          requested_id: id, // This would be the creator's ID in real implementation
          request_type: type === 'micro' ? 'collaboration' : 
                       type === 'skill' ? 'skill_exchange' : 'partnership',
          message: `I'm interested in your ${type} opportunity. Let's discuss how we can work together!`,
          oracle_generated: false
        });

      if (error) throw error;

      toast({
        title: "Interest Expressed",
        description: "The creator will be notified of your interest!",
      });
    } catch (error) {
      console.error('Error expressing interest:', error);
      toast({
        title: "Error",
        description: "Failed to express interest.",
        variant: "destructive"
      });
    }
  };

  const handleCreateMicroCollab = async () => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in to create collaborations.",
          variant: "destructive"
        });
        return;
      }

      if (!newCollab.title || !newCollab.description) {
        toast({
          title: "Error",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }

      // Create micro collaboration
      const { error } = await supabase
        .from('collaboration_proposals')
        .insert({
          proposer_id: user.id,
          title: newCollab.title,
          description: newCollab.description,
          collaboration_type: newCollab.collaboration_type,
          urgency: newCollab.urgency,
          estimated_hours: newCollab.estimated_hours,
          skills_needed: newCollab.skills_needed,
          status: 'open'
        });

      if (error) throw error;

      toast({
        title: "Micro-Collaboration Created",
        description: "Your collaboration opportunity has been posted!",
      });

      // Reset form
      setNewCollab({
        title: '',
        description: '',
        skills_needed: [],
        estimated_hours: 2,
        urgency: 'medium',
        collaboration_type: 'code_review'
      });

      // Refresh data
      fetchCollaborations();
    } catch (error) {
      console.error('Error creating micro collaboration:', error);
      toast({
        title: "Error",
        description: "Failed to create collaboration. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCreateSkillExchange = async () => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in to create skill exchanges.",
          variant: "destructive"
        });
        return;
      }

      if (!newSkillExchange.offering_skill || !newSkillExchange.seeking_skill || !newSkillExchange.description) {
        toast({
          title: "Error",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }

      // Create skill exchange
      const { error } = await supabase
        .from('skill_offers')
        .insert({
          user_id: user.id,
          offering_skill: newSkillExchange.offering_skill,
          seeking_skill: newSkillExchange.seeking_skill,
          description: newSkillExchange.description,
          exchange_type: newSkillExchange.exchange_type,
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: "Skill Exchange Created",
        description: "Your skill exchange has been posted!",
      });

      // Reset form
      setNewSkillExchange({
        offering_skill: '',
        seeking_skill: '',
        description: '',
        exchange_type: 'one_time'
      });

      // Refresh data
      fetchCollaborations();
    } catch (error) {
      console.error('Error creating skill exchange:', error);
      toast({
        title: "Error",
        description: "Failed to create skill exchange. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCreatePartnership = async () => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in to create partnerships.",
          variant: "destructive"
        });
        return;
      }

      if (!newPartnership.project_name || !newPartnership.description) {
        toast({
          title: "Error",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }

      // Create partnership opportunity
      const { error } = await supabase
        .from('collaboration_proposals')
        .insert({
          proposer_id: user.id,
          title: `Partnership: ${newPartnership.project_name}`,
          description: newPartnership.description,
          collaboration_type: 'partnership',
          partnership_type: newPartnership.partnership_type,
          commitment_level: newPartnership.commitment_level,
          equity_offered: newPartnership.equity_offered,
          skills_needed: newPartnership.skills_needed,
          status: 'open'
        });

      if (error) throw error;

      toast({
        title: "Partnership Created",
        description: "Your partnership opportunity has been posted!",
      });

      // Reset form
      setNewPartnership({
        project_name: '',
        partnership_type: 'technical_partner',
        description: '',
        commitment_level: 'part_time',
        equity_offered: '',
        skills_needed: []
      });

      // Refresh data
      fetchCollaborations();
    } catch (error) {
      console.error('Error creating partnership:', error);
      toast({
        title: "Error",
        description: "Failed to create partnership. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBuilderLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-blue-100 text-blue-800';
      case 'intermediate': return 'bg-green-100 text-green-800';
      case 'advanced': return 'bg-purple-100 text-purple-800';
      case 'expert': return 'bg-gold-100 text-gold-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
      {/* Header with View Toggle */}
      <Card className="glow-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Collaboration Hub</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={activeView === 'browse' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('browse')}
              >
                Browse
              </Button>
              <Button
                variant={activeView === 'create' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('create')}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>
          </div>
          <CardDescription>
            Find micro-collaborations, skill exchanges, and partnership opportunities
          </CardDescription>
        </CardHeader>
      </Card>

      {activeView === 'browse' ? (
        <div className="space-y-6">
          {/* Micro-Collaborations */}
          <Card className="glow-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Micro-Collaborations</CardTitle>
                <Badge variant="outline">{microCollabs.length}</Badge>
              </div>
              <CardDescription>
                Quick 1-4 hour collaborations to help each other out
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {microCollabs.map((collab) => (
                <div key={collab.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-sm">{collab.title}</h4>
                        <Badge className={getUrgencyColor(collab.urgency)}>
                          {collab.urgency}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {collab.collaboration_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-3">{collab.description}</p>
                      
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{collab.estimated_hours}h</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{collab.interested_count} interested</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-3">
                        {collab.skills_needed.map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={`https://avatar.vercel.sh/${collab.creator.name}`} />
                          <AvatarFallback className="text-xs">
                            {collab.creator.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-right">
                          <p className="text-xs font-medium">{collab.creator.name}</p>
                          <Badge className={`text-xs ${getBuilderLevelColor(collab.creator.builder_level)}`}>
                            {collab.creator.builder_level}
                          </Badge>
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        onClick={() => handleExpressInterest('micro', collab.id)}
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Help Out
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Skill Exchanges */}
          <Card className="glow-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Skill Exchanges</CardTitle>
                <Badge variant="outline">{skillExchanges.length}</Badge>
              </div>
              <CardDescription>
                Teach what you know, learn what you need
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {skillExchanges.map((exchange) => (
                <div key={exchange.id} className="border rounded-lg p-4 bg-green-50/20">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-sm">
                          {exchange.offering_skill} ↔ {exchange.seeking_skill}
                        </h4>
                        <Badge variant="outline" className="text-xs bg-green-100">
                          {exchange.exchange_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-3">{exchange.description}</p>
                      
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{exchange.interested_count} interested</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={`https://avatar.vercel.sh/${exchange.creator.name}`} />
                          <AvatarFallback className="text-xs">
                            {exchange.creator.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-right">
                          <p className="text-xs font-medium">{exchange.creator.name}</p>
                          <Badge className={`text-xs ${getBuilderLevelColor(exchange.creator.expertise_level)}`}>
                            {exchange.creator.expertise_level}
                          </Badge>
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        onClick={() => handleExpressInterest('skill', exchange.id)}
                      >
                        <Target className="h-3 w-3 mr-1" />
                        Exchange
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Partnerships */}
          <Card className="glow-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">Partnership Opportunities</CardTitle>
                <Badge variant="outline">{partnerships.length}</Badge>
              </div>
              <CardDescription>
                Long-term collaborations and co-founder opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {partnerships.map((partnership) => (
                <div key={partnership.id} className="border rounded-lg p-4 bg-purple-50/20">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-sm">{partnership.project_name}</h4>
                        <Badge variant="outline" className="text-xs bg-purple-100">
                          {partnership.partnership_type.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {partnership.commitment_level.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-3">{partnership.description}</p>
                      
                      <div className="flex items-center gap-4 mb-3">
                        {partnership.equity_offered && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-green-600">Equity: {partnership.equity_offered}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{partnership.applications_count} applications</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-3">
                        {partnership.skills_needed.map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={`https://avatar.vercel.sh/${partnership.creator.name}`} />
                          <AvatarFallback className="text-xs">
                            {partnership.creator.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-right">
                          <p className="text-xs font-medium">{partnership.creator.name}</p>
                          <Badge className={`text-xs ${getBuilderLevelColor(partnership.creator.builder_level)}`}>
                            {partnership.creator.builder_level}
                          </Badge>
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        onClick={() => handleExpressInterest('partnership', partnership.id)}
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        // Create new collaboration form
        <Card className="glow-border">
          <CardHeader>
            <CardTitle className="text-lg">Create New Collaboration</CardTitle>
            <CardDescription>
              Start a new collaboration opportunity for the community
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant={collaborationType === 'micro' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCollaborationType('micro')}
              >
                Micro-Collaboration
              </Button>
              <Button
                variant={collaborationType === 'skill' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCollaborationType('skill')}
              >
                Skill Exchange
              </Button>
              <Button
                variant={collaborationType === 'partnership' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCollaborationType('partnership')}
              >
                Partnership
              </Button>
            </div>

            {collaborationType === 'micro' && (
              <div className="space-y-4">
                <Input
                  placeholder="Title (e.g., Code Review: React Component)"
                  value={newCollab.title}
                  onChange={(e) => setNewCollab({...newCollab, title: e.target.value})}
                />
                <Textarea
                  placeholder="Describe what you need help with..."
                  value={newCollab.description}
                  onChange={(e) => setNewCollab({...newCollab, description: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select value={newCollab.urgency} onValueChange={(value: any) => setNewCollab({...newCollab, urgency: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newCollab.collaboration_type} onValueChange={(value: any) => setNewCollab({...newCollab, collaboration_type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="code_review">Code Review</SelectItem>
                      <SelectItem value="pair_programming">Pair Programming</SelectItem>
                      <SelectItem value="design_feedback">Design Feedback</SelectItem>
                      <SelectItem value="mentorship">Mentorship</SelectItem>
                      <SelectItem value="brainstorming">Brainstorming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleCreateMicroCollab}>
                  Create Micro-Collaboration
                </Button>
              </div>
            )}

            {collaborationType === 'skill' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Skill you're offering"
                    value={newSkillExchange.offering_skill}
                    onChange={(e) => setNewSkillExchange({...newSkillExchange, offering_skill: e.target.value})}
                  />
                  <Input
                    placeholder="Skill you're seeking"
                    value={newSkillExchange.seeking_skill}
                    onChange={(e) => setNewSkillExchange({...newSkillExchange, seeking_skill: e.target.value})}
                  />
                </div>
                <Textarea
                  placeholder="Describe the exchange arrangement..."
                  value={newSkillExchange.description}
                  onChange={(e) => setNewSkillExchange({...newSkillExchange, description: e.target.value})}
                />
                <Select value={newSkillExchange.exchange_type} onValueChange={(value: any) => setNewSkillExchange({...newSkillExchange, exchange_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Exchange Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time Session</SelectItem>
                    <SelectItem value="ongoing">Ongoing Exchange</SelectItem>
                    <SelectItem value="workshop">Workshop Style</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="w-full" onClick={handleCreateSkillExchange}>
                  Create Skill Exchange
                </Button>
              </div>
            )}

            {collaborationType === 'partnership' && (
              <div className="space-y-4">
                <Input
                  placeholder="Project name"
                  value={newPartnership.project_name}
                  onChange={(e) => setNewPartnership({...newPartnership, project_name: e.target.value})}
                />
                <Textarea
                  placeholder="Describe the partnership opportunity..."
                  value={newPartnership.description}
                  onChange={(e) => setNewPartnership({...newPartnership, description: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select value={newPartnership.partnership_type} onValueChange={(value: any) => setNewPartnership({...newPartnership, partnership_type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Partnership Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="co_founder">Co-founder</SelectItem>
                      <SelectItem value="technical_partner">Technical Partner</SelectItem>
                      <SelectItem value="design_partner">Design Partner</SelectItem>
                      <SelectItem value="business_partner">Business Partner</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newPartnership.commitment_level} onValueChange={(value: any) => setNewPartnership({...newPartnership, commitment_level: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Commitment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="part_time">Part-time</SelectItem>
                      <SelectItem value="full_time">Full-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  placeholder="Equity offered (optional)"
                  value={newPartnership.equity_offered}
                  onChange={(e) => setNewPartnership({...newPartnership, equity_offered: e.target.value})}
                />
                <Button className="w-full" onClick={handleCreatePartnership}>
                  Create Partnership Opportunity
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};