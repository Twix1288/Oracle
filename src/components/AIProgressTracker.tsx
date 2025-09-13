import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb,
  Brain,
  BarChart3,
  Users,
  Rocket,
  Clock,
  Activity
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface ProgressEntry {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  team_id: string;
  embedding_vector: string;
}

interface TeamProgress {
  overall_progress: number;
  stage: string;
  health_score: number;
  blockers: string[];
  achievements: string[];
  next_milestones: string[];
  ai_insights: string;
}

interface AIProgressTrackerProps {
  teamId?: string;
  userId?: string;
  showTeamView?: boolean;
}

export const AIProgressTracker: React.FC<AIProgressTrackerProps> = ({
  teamId,
  userId,
  showTeamView = true
}) => {
  const { user } = useAuth();
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [teamProgress, setTeamProgress] = useState<TeamProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user) {
      loadProgressData();
    }
  }, [user, teamId, userId]);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      
      // Load individual progress entries
      let entriesQuery = supabase
        .from('progress_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        entriesQuery = entriesQuery.eq('user_id', userId);
      } else if (user) {
        entriesQuery = entriesQuery.eq('user_id', user.id);
      }

      if (teamId) {
        entriesQuery = entriesQuery.eq('team_id', teamId);
      }

      const { data: entries, error: entriesError } = await entriesQuery;
      
      if (entriesError) throw entriesError;
      setProgressEntries(entries || []);

      // Generate AI insights for team progress
      if (teamId && showTeamView) {
        await generateTeamProgressInsights();
      }

    } catch (error) {
      console.error('Error loading progress data:', error);
      toast({
        title: "Error",
        description: "Failed to load progress data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTeamProgressInsights = async () => {
    try {
      // Get team context from current data instead of non-existent RPC
      if (!teamId) return;

      // Calculate progress metrics
      const completedEntries = progressEntries.filter(e => e.status === 'completed').length;
      const totalEntries = progressEntries.length;
      const overallProgress = totalEntries > 0 ? (completedEntries / totalEntries) * 100 : 0;

      // Analyze team health
      const recentEntries = progressEntries.filter(e => 
        new Date(e.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      const healthScore = Math.min(100, (recentEntries.length / 3) * 100); // 3+ entries per week = healthy

      // Identify blockers and achievements
      const blockers = progressEntries
        .filter(e => e.status === 'blocked')
        .map(e => e.title)
        .slice(0, 3);

      const achievements = progressEntries
        .filter(e => e.status === 'completed')
        .map(e => e.title)
        .slice(0, 5);

      // Generate AI insights using Oracle
      const { data: aiInsights } = await supabase.functions.invoke('super-oracle', {
        body: {
          query: `Analyze our team progress: ${totalEntries} total tasks, ${completedEntries} completed. Recent activity: ${recentEntries.length} entries this week. Provide insights and next steps.`,
          type: 'chat',
          role: 'builder',
          teamId: teamId,
          userId: user!.id
        }
      });

      setTeamProgress({
        overall_progress: Math.round(overallProgress),
        stage: 'development',
        health_score: Math.round(healthScore),
        blockers,
        achievements,
        next_milestones: [
          'Complete current sprint goals',
          'Address identified blockers',
          'Plan next development phase'
        ],
        ai_insights: aiInsights?.answer || 'Team is making steady progress. Continue current momentum.'
      });

    } catch (error) {
      console.error('Error generating team insights:', error);
    }
  };

  const getCategoryIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <BarChart3 className="w-4 h-4" />;
      case 'blocked': return <Target className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'blocked': return 'destructive';
      case 'pending': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Progress Tracker</h2>
          <p className="text-muted-foreground">
            Track your progress with AI-powered insights
          </p>
        </div>
        <Button className="gap-2">
          <Rocket className="w-4 h-4" />
          Add Progress
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          {showTeamView && <TabsTrigger value="team">Team View</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {teamProgress && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Overall Progress
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teamProgress.overall_progress}%</div>
                  <Progress value={teamProgress.overall_progress} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {progressEntries.filter(e => e.status === 'completed').length} of {progressEntries.length} tasks completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Team Health
                  </CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teamProgress.health_score}%</div>
                  <Progress value={teamProgress.health_score} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Based on recent activity and progress
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Current Stage
                  </CardTitle>
                  <Rocket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{teamProgress.stage}</div>
                  <Badge variant="secondary" className="mt-2">
                    Active
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamProgress?.achievements && teamProgress.achievements.length > 0 ? (
                  <ul className="space-y-2">
                    {teamProgress.achievements.map((achievement, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {achievement}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Complete some tasks to see achievements here
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Current Blockers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamProgress?.blockers && teamProgress.blockers.length > 0 ? (
                  <ul className="space-y-2">
                    {teamProgress.blockers.map((blocker, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                        {blocker}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No current blockers identified
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {progressEntries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No Progress Entries</p>
                <p className="text-muted-foreground">
                  Start tracking your progress to see insights here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {progressEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {getCategoryIcon(entry.status)}
                          {entry.title}
                        </CardTitle>
                        <CardDescription>{entry.description}</CardDescription>
                      </div>
                      <Badge variant={getStatusColor(entry.status)}>
                        {entry.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                AI-Generated Insights
              </CardTitle>
              <CardDescription>
                Personalized recommendations based on your progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamProgress?.ai_insights ? (
                <div className="prose prose-sm max-w-none">
                  <p>{teamProgress.ai_insights}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Complete more tasks to get personalized insights
                </p>
              )}
            </CardContent>
          </Card>

          {teamProgress?.next_milestones && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Suggested Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {teamProgress.next_milestones.map((milestone, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">{milestone}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {showTeamView && (
          <TabsContent value="team" className="space-y-6">
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Team Progress View</p>
              <p className="text-muted-foreground">
                Enhanced team analytics coming soon
              </p>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};