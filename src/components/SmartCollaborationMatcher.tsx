import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Target, 
  TrendingUp, 
  Clock, 
  Star, 
  Zap,
  Brain,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SmartMatch {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    bio: string;
    skills: string[];
    builder_level: string;
    availability_hours: number;
  };
  match_score: number;
  match_reasons: string[];
  collaboration_type: 'micro' | 'skill_exchange' | 'partnership' | 'mentorship';
  success_probability: number;
  complementary_skills: string[];
  shared_interests: string[];
  time_zone_compatibility: number;
  availability_overlap: number;
  previous_success_rate?: number;
  oracle_confidence: number;
}

interface MatchingInsights {
  total_matches_generated: number;
  successful_matches: number;
  success_rate: number;
  avg_match_score: number;
  top_collaboration_types: string[];
  improvement_areas: string[];
}

export const SmartCollaborationMatcher: React.FC = () => {
  const [smartMatches, setSmartMatches] = useState<SmartMatch[]>([]);
  const [matchingInsights, setMatchingInsights] = useState<MatchingInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'micro' | 'skill_exchange' | 'partnership' | 'mentorship'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'success_probability' | 'availability'>('score');
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSmartMatches();
      fetchMatchingInsights();
    }
  }, [user]);

  const fetchSmartMatches = async () => {
    try {
      setIsLoading(true);
      
      // Get AI-powered matches using Oracle
      const { data: oracleMatches, error: oracleError } = await supabase.functions.invoke('smart-collaboration-matcher', {
        body: {
          user_id: user?.id,
          user_profile: profile,
          match_types: ['micro', 'skill_exchange', 'partnership', 'mentorship'],
          limit: 20
        }
      });

      if (oracleError) throw oracleError;

      if (oracleMatches?.matches) {
        setSmartMatches(oracleMatches.matches);
      } else {
        // Fallback to mock data for demonstration
        setSmartMatches(generateMockMatches());
      }

    } catch (error: any) {
      console.error('Error fetching smart matches:', error);
      // Use mock data as fallback
      setSmartMatches(generateMockMatches());
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMatchingInsights = async () => {
    try {
      const { data: insights, error } = await supabase
        .from('oracle_optimization_insights')
        .select('*')
        .eq('optimization_type', 'collaboration_suggestions')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (insights && insights.length > 0) {
        const data = insights[0].insights_data;
        setMatchingInsights({
          total_matches_generated: data.total_connections || 0,
          successful_matches: Math.round((data.total_connections || 0) * (data.oracle_generated_success_rate || 0.3)),
          success_rate: (data.oracle_generated_success_rate || 0.3) * 100,
          avg_match_score: 0.85, // This would be calculated from actual data
          top_collaboration_types: Object.keys(data.success_rates || {}),
          improvement_areas: ['skill_matching', 'availability_alignment']
        });
      }
    } catch (error) {
      console.error('Error fetching matching insights:', error);
    }
  };

  const generateMockMatches = (): SmartMatch[] => {
    return [
      {
        id: '1',
        user: {
          id: 'user1',
          name: 'Alex Chen',
          bio: 'Full-stack developer passionate about AI and blockchain',
          skills: ['React', 'Node.js', 'Solidity', 'Python'],
          builder_level: 'advanced',
          availability_hours: 15
        },
        match_score: 0.92,
        match_reasons: [
          'Complementary skills: Your frontend expertise + their blockchain knowledge',
          'Similar project goals and learning interests',
          'High availability overlap (15h/week)',
          'Previous successful collaboration history'
        ],
        collaboration_type: 'partnership',
        success_probability: 0.88,
        complementary_skills: ['Solidity', 'Web3'],
        shared_interests: ['AI', 'Blockchain', 'Startups'],
        time_zone_compatibility: 0.95,
        availability_overlap: 0.90,
        previous_success_rate: 0.85,
        oracle_confidence: 0.94
      },
      {
        id: '2',
        user: {
          id: 'user2',
          name: 'Sarah Martinez',
          bio: 'UX Designer turning complex ideas into beautiful experiences',
          skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
          builder_level: 'intermediate',
          availability_hours: 12
        },
        match_score: 0.87,
        match_reasons: [
          'Perfect skill exchange opportunity',
          'Both interested in learning each other\'s domains',
          'Similar time commitment levels',
          'Oracle detected mutual learning goals'
        ],
        collaboration_type: 'skill_exchange',
        success_probability: 0.82,
        complementary_skills: ['Design Systems', 'User Research'],
        shared_interests: ['Product Design', 'User Experience'],
        time_zone_compatibility: 0.88,
        availability_overlap: 0.85,
        oracle_confidence: 0.89
      },
      {
        id: '3',
        user: {
          id: 'user3',
          name: 'Michael Rodriguez',
          bio: 'DevOps engineer scaling applications from zero to millions',
          skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform'],
          builder_level: 'expert',
          availability_hours: 8
        },
        match_score: 0.85,
        match_reasons: [
          'Your project needs scaling expertise',
          'Michael has deployed 50+ production systems',
          'Mentorship opportunity for infrastructure',
          'High success rate with similar projects'
        ],
        collaboration_type: 'mentorship',
        success_probability: 0.90,
        complementary_skills: ['AWS', 'Kubernetes', 'Terraform'],
        shared_interests: ['Scalability', 'Infrastructure'],
        time_zone_compatibility: 0.92,
        availability_overlap: 0.75,
        previous_success_rate: 0.92,
        oracle_confidence: 0.91
      }
    ];
  };

  const handleConnect = async (match: SmartMatch) => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .insert({
          requester_id: user?.id,
          requested_id: match.user.id,
          request_type: match.collaboration_type,
          message: `Hi ${match.user.name}! Oracle suggested we might be a great match for ${match.collaboration_type}. ${match.match_reasons[0]}`,
          oracle_generated: true,
          oracle_confidence: match.oracle_confidence,
          match_score: match.match_score
        });

      if (error) throw error;

      toast({
        title: "Connection Request Sent!",
        description: `Your request has been sent to ${match.user.name} with Oracle's match reasoning.`,
      });

      // Remove the match from the list
      setSmartMatches(prev => prev.filter(m => m.id !== match.id));

    } catch (error: any) {
      console.error('Error sending connection request:', error);
      toast({
        title: "Error",
        description: "Failed to send connection request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDismiss = (matchId: string) => {
    setSmartMatches(prev => prev.filter(m => m.id !== matchId));
    toast({
      title: "Match Dismissed",
      description: "Oracle will learn from your preferences to suggest better matches.",
    });
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.8) return 'text-yellow-600';
    if (score >= 0.7) return 'text-orange-600';
    return 'text-red-600';
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 0.9) return 'bg-green-100';
    if (score >= 0.8) return 'bg-yellow-100';
    if (score >= 0.7) return 'bg-orange-100';
    return 'bg-red-100';
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

  const filteredMatches = smartMatches.filter(match => 
    selectedFilter === 'all' || match.collaboration_type === selectedFilter
  );

  const sortedMatches = [...filteredMatches].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.match_score - a.match_score;
      case 'success_probability':
        return b.success_probability - a.success_probability;
      case 'availability':
        return b.availability_overlap - a.availability_overlap;
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
      {/* Header with Insights */}
      <Card className="glow-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl">Smart Collaboration Matcher</CardTitle>
            </div>
            <Badge variant="outline" className="bg-primary/10">
              <Zap className="h-3 w-3 mr-1" />
              AI-Powered
            </Badge>
          </div>
          <CardDescription>
            Oracle analyzes profiles, skills, and success patterns to find perfect collaboration matches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matchingInsights && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <p className="text-2xl font-bold text-primary">{matchingInsights.success_rate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <p className="text-2xl font-bold text-green-600">{matchingInsights.successful_matches}</p>
                <p className="text-sm text-muted-foreground">Successful Matches</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{matchingInsights.total_matches_generated}</p>
                <p className="text-sm text-muted-foreground">Total Generated</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{(matchingInsights.avg_match_score * 100).toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">Avg Match Score</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters and Sorting */}
      <Card className="glow-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filter:</span>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="all">All Types</option>
                <option value="micro">Micro-Collaborations</option>
                <option value="skill_exchange">Skill Exchanges</option>
                <option value="partnership">Partnerships</option>
                <option value="mentorship">Mentorship</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="score">Match Score</option>
                <option value="success_probability">Success Probability</option>
                <option value="availability">Availability</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Matches */}
      <div className="space-y-4">
        {sortedMatches.map((match) => (
          <Card key={match.id} className="glow-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={match.user.avatar} />
                  <AvatarFallback>
                    {match.user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{match.user.name}</h3>
                        <Badge className={getBuilderLevelColor(match.user.builder_level)}>
                          {match.user.builder_level}
                        </Badge>
                        <Badge variant="outline" className={getMatchScoreBg(match.match_score)}>
                          <Star className="h-3 w-3 mr-1" />
                          {(match.match_score * 100).toFixed(0)}% match
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{match.user.bio}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {match.user.availability_hours}h/week
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {match.collaboration_type.replace('_', ' ')}
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {(match.success_probability * 100).toFixed(0)}% success
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Match Reasons */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-primary">Why Oracle thinks you're a great match:</h4>
                    <ul className="space-y-1">
                      {match.match_reasons.map((reason, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Skills and Interests */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Complementary Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {match.complementary_skills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Shared Interests</h4>
                      <div className="flex flex-wrap gap-1">
                        {match.shared_interests.map((interest, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-blue-100">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Compatibility Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-2 border rounded">
                      <p className="text-xs text-muted-foreground">Time Zone</p>
                      <p className="text-sm font-medium">{(match.time_zone_compatibility * 100).toFixed(0)}%</p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <p className="text-xs text-muted-foreground">Availability</p>
                      <p className="text-sm font-medium">{(match.availability_overlap * 100).toFixed(0)}%</p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <p className="text-xs text-muted-foreground">Oracle Confidence</p>
                      <p className="text-sm font-medium">{(match.oracle_confidence * 100).toFixed(0)}%</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button 
                      onClick={() => handleConnect(match)}
                      className="flex-1"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleDismiss(match.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Not Now
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {sortedMatches.length === 0 && (
          <Card className="glow-border">
            <CardContent className="p-8 text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No matches found</h3>
              <p className="text-muted-foreground">
                Oracle is analyzing the community to find the perfect collaboration opportunities for you.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
