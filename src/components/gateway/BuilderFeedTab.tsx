import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Activity, Sparkles, TrendingUp, Users, MessageCircle, Heart, Share, Trophy, Target, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FeedItem {
  id: string;
  type: 'project_update' | 'milestone' | 'collaboration' | 'skill_learned' | 'connection_made' | 'oracle_spotlight';
  user: {
    id: string;
    name: string;
    avatar?: string;
    builder_level: string;
  };
  content: string;
  metadata?: any;
  reactions: {
    likes: number;
    comments: number;
    shares: number;
  };
  created_at: string;
  oracle_insights?: string;
  trending_score: number;
}

interface OracleSpotlight {
  id: string;
  title: string;
  description: string;
  featured_builders: Array<{
    name: string;
    achievement: string;
    avatar?: string;
  }>;
  insights: string;
  call_to_action: string;
}

interface TrendingTopic {
  id: string;
  topic: string;
  activity_count: number;
  trending_score: number;
  related_projects: number;
  growth_percentage: number;
}

export const BuilderFeedTab = () => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [oracleSpotlights, setOracleSpotlights] = useState<OracleSpotlight[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'following' | 'trending'>('all');
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchFeedData();
  }, [filter]);

  const fetchFeedData = async () => {
    try {
      // Mock data for the builder feed
      const mockFeedItems: FeedItem[] = [
        {
          id: '1',
          type: 'milestone',
          user: {
            id: 'user1',
            name: 'Alex Chen',
            builder_level: 'intermediate'
          },
          content: 'Just launched the MVP of my task management app! 🚀 After 3 months of development, finally got user authentication and real-time sync working.',
          metadata: {
            project_name: 'TaskFlow',
            milestone_type: 'MVP Launch',
            tech_stack: ['React', 'Node.js', 'Socket.io']
          },
          reactions: { likes: 24, comments: 8, shares: 3 },
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          oracle_insights: 'This achievement shows great progress in full-stack development. The real-time sync implementation is particularly noteworthy.',
          trending_score: 0.87
        },
        {
          id: '2',
          type: 'collaboration',
          user: {
            id: 'user2',
            name: 'Sarah Martinez',
            builder_level: 'advanced'
          },
          content: 'Had an amazing pair programming session with @David_Park today! We tackled a complex algorithm challenge and learned so much from each other\'s approaches.',
          metadata: {
            collaborator: 'David Park',
            session_duration: '3 hours',
            topic: 'Graph Algorithms'
          },
          reactions: { likes: 18, comments: 5, shares: 2 },
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          oracle_insights: 'Collaborative learning accelerates skill development. This type of peer learning is highly effective.',
          trending_score: 0.72
        },
        {
          id: '3',
          type: 'skill_learned',
          user: {
            id: 'user3',
            name: 'David Park',
            builder_level: 'beginner'
          },
          content: 'Finally understood React hooks! 🎉 The useEffect cleanup function was the missing piece. Thanks to everyone who helped in the community chat.',
          metadata: {
            skill: 'React Hooks',
            learning_method: 'Community Support',
            time_invested: '2 weeks'
          },
          reactions: { likes: 31, comments: 12, shares: 1 },
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          oracle_insights: 'Mastering React hooks is a significant milestone. This understanding will unlock many advanced patterns.',
          trending_score: 0.65
        },
        {
          id: '4',
          type: 'project_update',
          user: {
            id: 'user4',
            name: 'Maya Patel',
            builder_level: 'expert'
          },
          content: 'Week 4 update on the AI chatbot project: Implemented context awareness and memory persistence. The bot can now maintain conversations across sessions!',
          metadata: {
            project_name: 'SmartChat AI',
            week: 4,
            progress_percentage: 60,
            next_milestone: 'UI Polish'
          },
          reactions: { likes: 19, comments: 6, shares: 4 },
          created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          oracle_insights: 'Context-aware AI systems represent cutting-edge development. This progress demonstrates advanced ML integration skills.',
          trending_score: 0.78
        }
      ];

      const mockSpotlights: OracleSpotlight[] = [
        {
          id: '1',
          title: 'Rising Stars in Frontend Development',
          description: 'This week\'s spotlight features builders who made remarkable progress in modern frontend frameworks.',
          featured_builders: [
            { name: 'Emma Johnson', achievement: 'Built first React Native app', avatar: undefined },
            { name: 'Carlos Rodriguez', achievement: 'Mastered Vue.js 3 Composition API', avatar: undefined },
            { name: 'Aisha Kumar', achievement: 'Created stunning CSS animations', avatar: undefined }
          ],
          insights: 'Frontend development continues to evolve rapidly. These builders exemplify the importance of continuous learning and experimentation.',
          call_to_action: 'Connect with these builders to learn from their experience!'
        }
      ];

      const mockTrendingTopics: TrendingTopic[] = [
        {
          id: '1',
          topic: 'React Hooks',
          activity_count: 47,
          trending_score: 0.92,
          related_projects: 12,
          growth_percentage: 34
        },
        {
          id: '2',
          topic: 'AI Integration',
          activity_count: 23,
          trending_score: 0.86,
          related_projects: 8,
          growth_percentage: 56
        },
        {
          id: '3',
          topic: 'Full-Stack Development',
          activity_count: 31,
          trending_score: 0.78,
          related_projects: 15,
          growth_percentage: 28
        },
        {
          id: '4',
          topic: 'Mobile Development',
          activity_count: 18,
          trending_score: 0.71,
          related_projects: 6,
          growth_percentage: 41
        }
      ];

      setFeedItems(mockFeedItems);
      setOracleSpotlights(mockSpotlights);
      setTrendingTopics(mockTrendingTopics);
    } catch (error) {
      console.error('Error fetching feed data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReaction = async (itemId: string, reactionType: 'like' | 'comment' | 'share') => {
    try {
      // In real implementation, this would update the database
      setFeedItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                reactions: { 
                  ...item.reactions, 
                  [reactionType + 's']: item.reactions[reactionType + 's' as keyof typeof item.reactions] + 1 
                } 
              }
            : item
        )
      );
      
      toast({
        title: "Reaction Added",
        description: `You ${reactionType}d this post!`,
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'milestone': return <Trophy className="h-4 w-4 text-yellow-600" />;
      case 'collaboration': return <Users className="h-4 w-4 text-blue-600" />;
      case 'skill_learned': return <Target className="h-4 w-4 text-green-600" />;
      case 'project_update': return <Activity className="h-4 w-4 text-purple-600" />;
      case 'oracle_spotlight': return <Sparkles className="h-4 w-4 text-primary" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'milestone': return 'border-l-yellow-400 bg-yellow-50/50';
      case 'collaboration': return 'border-l-blue-400 bg-blue-50/50';
      case 'skill_learned': return 'border-l-green-400 bg-green-50/50';
      case 'project_update': return 'border-l-purple-400 bg-purple-50/50';
      case 'oracle_spotlight': return 'border-l-primary bg-primary/5';
      default: return 'border-l-gray-400 bg-gray-50/50';
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

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
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
      {/* Header with Filters */}
      <Card className="glow-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Builder Feed</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All Activity
              </Button>
              <Button
                variant={filter === 'trending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('trending')}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Trending
              </Button>
            </div>
          </div>
          <CardDescription>
            Real-time activity from builders in the community
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Oracle Spotlights */}
          {oracleSpotlights.map((spotlight) => (
            <Card key={spotlight.id} className="glow-border bg-gradient-to-r from-primary/5 to-primary-glow/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{spotlight.title}</CardTitle>
                  <Badge variant="outline" className="bg-primary/10">Oracle Spotlight</Badge>
                </div>
                <CardDescription>{spotlight.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {spotlight.featured_builders.map((builder, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded bg-background/50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://avatar.vercel.sh/${builder.name}`} />
                        <AvatarFallback className="text-xs">
                          {builder.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{builder.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{builder.achievement}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-primary/10 p-3 rounded-lg">
                  <p className="text-sm text-primary mb-2">{spotlight.insights}</p>
                  <Button size="sm" className="text-xs">
                    {spotlight.call_to_action}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Feed Items */}
          {feedItems.map((item) => (
            <Card key={item.id} className={`border-l-4 ${getActivityColor(item.type)}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://avatar.vercel.sh/${item.user.name}`} />
                    <AvatarFallback>
                      {item.user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">{item.user.name}</span>
                      <Badge className={`text-xs ${getBuilderLevelColor(item.user.builder_level)}`}>
                        {item.user.builder_level}
                      </Badge>
                      {getActivityIcon(item.type)}
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(item.created_at)}</span>
                    </div>
                    
                    <p className="text-sm text-foreground mb-3">{item.content}</p>
                    
                    {/* Metadata */}
                    {item.metadata && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.metadata.project_name && (
                          <Badge variant="outline" className="text-xs">
                            {item.metadata.project_name}
                          </Badge>
                        )}
                        {item.metadata.tech_stack && item.metadata.tech_stack.map((tech: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                        {item.metadata.skill && (
                          <Badge variant="outline" className="text-xs bg-green-50">
                            {item.metadata.skill}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Oracle Insights */}
                    {item.oracle_insights && (
                      <div className="bg-primary/10 p-2 rounded-lg mb-3">
                        <div className="flex items-center gap-1 mb-1">
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span className="text-xs font-medium text-primary">Oracle Insight:</span>
                        </div>
                        <p className="text-xs text-primary">{item.oracle_insights}</p>
                      </div>
                    )}
                    
                    {/* Reactions */}
                    <div className="flex items-center gap-4 pt-2 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleReaction(item.id, 'like')}
                      >
                        <Heart className="h-3 w-3 mr-1" />
                        {item.reactions.likes}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleReaction(item.id, 'comment')}
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        {item.reactions.comments}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleReaction(item.id, 'share')}
                      >
                        <Share className="h-3 w-3 mr-1" />
                        {item.reactions.shares}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Trending Topics */}
          <Card className="glow-border">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-base">Trending Topics</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {trendingTopics.map((topic, idx) => (
                <div key={topic.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">#{topic.topic}</span>
                      <Badge variant="outline" className="text-xs bg-orange-50">
                        +{topic.growth_percentage}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{topic.activity_count} posts</span>
                      <span>{topic.related_projects} projects</span>
                    </div>
                  </div>
                  <span className="text-lg">#{idx + 1}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="glow-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Community Pulse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Builders</span>
                <span className="text-sm font-semibold">127</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Projects This Week</span>
                <span className="text-sm font-semibold">23</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Collaborations</span>
                <span className="text-sm font-semibold">41</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Skills Learned</span>
                <span className="text-sm font-semibold">89</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};