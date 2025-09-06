import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Radar, Users, MessageCircle, Sparkles, Clock, Target } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BuilderProfile {
  id: string;
  full_name: string;
  bio: string;
  skills: string[];
  builder_level: string;
  availability_hours: number;
  learning_goals: string[];
  project_goals: string;
  oracle_confidence?: number;
  oracle_reasoning?: string;
  recent_activity?: string;
}

interface OracleSuggestion {
  id: string;
  suggested_builder: BuilderProfile;
  match_reason: string;
  confidence: number;
  connection_type: 'collaboration' | 'mentorship' | 'skill_exchange';
  created_at: string;
}

export const BuilderRadarTab = () => {
  const [activeBuilders, setActiveBuilders] = useState<BuilderProfile[]>([]);
  const [oracleSuggestions, setOracleSuggestions] = useState<OracleSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [proactiveMessages, setProactiveMessages] = useState<any[]>([]);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchActiveBuilders();
      fetchOracleSuggestions();
      generateProactiveMessages();
    }
  }, [user]);

  const fetchActiveBuilders = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id)
        .not('builder_level', 'is', null)
        .order('oracle_last_interaction', { ascending: false, nullsFirst: false })
        .limit(12);

      if (error) throw error;

      setActiveBuilders(data || []);
    } catch (error) {
      console.error('Error fetching active builders:', error);
    }
  };

  const fetchOracleSuggestions = async () => {
    try {
      // Simulate Oracle-generated suggestions based on user profile
      const mockSuggestions: OracleSuggestion[] = [
        {
          id: '1',
          suggested_builder: {
            id: 'builder1',
            full_name: 'Alex Chen',
            bio: 'Full-stack developer passionate about AI and blockchain',
            skills: ['React', 'Node.js', 'Solidity'],
            builder_level: 'advanced',
            availability_hours: 15,
            learning_goals: ['Web3 Development', 'Smart Contracts'],
            project_goals: 'Building decentralized applications',
            oracle_confidence: 0.92
          },
          match_reason: 'Complementary skills: Your frontend expertise + their blockchain knowledge',
          confidence: 0.92,
          connection_type: 'collaboration',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          suggested_builder: {
            id: 'builder2',
            full_name: 'Sarah Martinez',
            bio: 'UX Designer turning ideas into beautiful, user-friendly experiences',
            skills: ['Figma', 'User Research', 'Prototyping'],
            builder_level: 'intermediate',
            availability_hours: 12,
            learning_goals: ['Frontend Development', 'React'],
            project_goals: 'Creating design systems for startups',
            oracle_confidence: 0.87
          },
          match_reason: 'Perfect skill exchange: Teach development, learn design',
          confidence: 0.87,
          connection_type: 'skill_exchange',
          created_at: new Date().toISOString()
        }
      ];

      setOracleSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Error fetching Oracle suggestions:', error);
    }
  };

  const generateProactiveMessages = async () => {
    // Simulate proactive Oracle messages
    const messages = [
      {
        id: '1',
        type: 'connection_opportunity',
        message: "🚀 I noticed 3 builders working on React projects this week. Want me to introduce you?",
        action: 'View Connections',
        urgency: 'medium'
      },
      {
        id: '2',
        type: 'skill_match',
        message: "💡 Alex just posted about needing help with authentication. Your expertise could help!",
        action: 'Offer Help',
        urgency: 'high'
      },
      {
        id: '3',
        type: 'learning_opportunity',
        message: "📚 Sarah is hosting a design workshop next week. Perfect for your learning goals!",
        action: 'Join Workshop',
        urgency: 'low'
      }
    ];

    setProactiveMessages(messages);
  };

  const handleConnectRequest = async (builderId: string, connectionType: string) => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .insert({
          requester_id: user?.id,
          requested_id: builderId,
          request_type: connectionType,
          message: `Hi! I'd love to connect and explore ${connectionType} opportunities.`,
          oracle_generated: true
        });

      if (error) throw error;

      toast({
        title: "Connection Request Sent",
        description: "Oracle will notify them of your interest to connect!",
      });
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast({
        title: "Error",
        description: "Failed to send connection request.",
        variant: "destructive"
      });
    }
  };

  const getBuilderLevelColor = (level: string) => {
    switch (level) {
      case 'novice': return 'bg-blue-100 text-blue-800';
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
      {/* Oracle Proactive Messages */}
      <Card className="glow-border bg-gradient-to-r from-primary/5 to-primary-glow/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Oracle Insights</CardTitle>
          </div>
          <CardDescription>
            AI-powered connection opportunities based on your profile and activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {proactiveMessages.map((message) => (
            <div key={message.id} className="flex items-start justify-between p-4 rounded-lg bg-background/50 border border-primary/20">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">{message.message}</p>
                <Badge variant="outline" className="text-xs">
                  {message.type.replace('_', ' ')}
                </Badge>
              </div>
              <Button size="sm" className="ml-4">
                {message.action}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Oracle Suggestions */}
      <Card className="glow-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Oracle Suggestions</CardTitle>
          </div>
          <CardDescription>
            Perfect matches based on complementary skills and goals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {oracleSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="border border-green-200/50 rounded-lg p-4 bg-green-50/20">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={`https://avatar.vercel.sh/${suggestion.suggested_builder.full_name}`} />
                  <AvatarFallback>
                    {suggestion.suggested_builder.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{suggestion.suggested_builder.full_name}</h4>
                    <Badge className={getBuilderLevelColor(suggestion.suggested_builder.builder_level)}>
                      {suggestion.suggested_builder.builder_level}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-green-100">
                      {Math.round(suggestion.confidence * 100)}% match
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2">{suggestion.suggested_builder.bio}</p>
                  
                  <div className="flex items-center gap-2 mb-3">
                    {suggestion.suggested_builder.skills.slice(0, 3).map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="bg-primary/10 p-2 rounded text-xs text-primary mb-3">
                    <strong>Oracle says:</strong> {suggestion.match_reason}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleConnectRequest(suggestion.suggested_builder.id, suggestion.connection_type)}
                      className="text-xs"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Connect
                    </Button>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.connection_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Active Builders */}
      <Card className="glow-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Active Builders</CardTitle>
          </div>
          <CardDescription>
            Builders actively working on projects and open to connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeBuilders.map((builder) => (
              <div key={builder.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://avatar.vercel.sh/${builder.full_name}`} />
                    <AvatarFallback>
                      {builder.full_name?.split(' ').map(n => n[0]).join('') || 'B'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{builder.full_name || 'Anonymous Builder'}</h4>
                      <Badge className={`text-xs ${getBuilderLevelColor(builder.builder_level || 'novice')}`}>
                        {builder.builder_level || 'novice'}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {builder.bio || 'Building the future, one project at a time.'}
                    </p>
                    
                    <div className="flex items-center gap-1 mb-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {builder.availability_hours || 10}h/week
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(builder.skills || []).slice(0, 2).map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    
                    <Button 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => handleConnectRequest(builder.id, 'collaboration')}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Connect
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};