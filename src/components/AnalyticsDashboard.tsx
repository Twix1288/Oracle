import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Brain, 
  Target, 
  Clock,
  Star,
  Activity,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AnalyticsData {
  total_interactions: number;
  avg_satisfaction: number;
  helpful_rate: number;
  model_performance: any;
  recent_trends: any;
  daily_metrics: any[];
  user_engagement: any;
  learning_insights: any;
}

interface PerformanceMetrics {
  total_interactions: number;
  avg_satisfaction: number;
  helpful_rate: number;
  model_performance: Record<string, any>;
  recent_trends: any;
}

export const AnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user]);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Get Oracle performance metrics
      const { data: metrics, error: metricsError } = await supabase
        .rpc('get_oracle_performance_metrics');

      if (metricsError) throw metricsError;

      if (metrics && metrics.length > 0) {
        setPerformanceMetrics(metrics[0]);
      }

      // Get daily metrics for the last 30 days
      const { data: dailyData, error: dailyError } = await supabase
        .from('oracle_logs')
        .select('created_at, user_satisfaction, helpful, model_used, processing_time')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (dailyError) throw dailyError;

      // Process daily data
      const dailyMetrics = processDailyMetrics(dailyData || []);
      setAnalyticsData({
        ...metrics?.[0],
        daily_metrics: dailyMetrics,
        user_engagement: await fetchUserEngagement(),
        learning_insights: await fetchLearningInsights()
      });

    } catch (error: any) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processDailyMetrics = (data: any[]) => {
    const dailyMap = new Map();
    
    data.forEach(entry => {
      const date = new Date(entry.created_at).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          interactions: 0,
          avg_satisfaction: 0,
          helpful_rate: 0,
          total_satisfaction: 0,
          helpful_count: 0
        });
      }
      
      const dayData = dailyMap.get(date);
      dayData.interactions += 1;
      dayData.total_satisfaction += entry.user_satisfaction || 0;
      dayData.helpful_count += entry.helpful ? 1 : 0;
    });

    // Calculate averages
    dailyMap.forEach(dayData => {
      dayData.avg_satisfaction = dayData.total_satisfaction / dayData.interactions;
      dayData.helpful_rate = (dayData.helpful_count / dayData.interactions) * 100;
    });

    return Array.from(dailyMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const fetchUserEngagement = async () => {
    try {
      const { data, error } = await supabase
        .from('oracle_logs')
        .select('user_id, created_at, user_satisfaction')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const uniqueUsers = new Set(data?.map(d => d.user_id) || []);
      const avgSatisfaction = data?.reduce((sum, d) => sum + (d.user_satisfaction || 0), 0) / (data?.length || 1);

      return {
        active_users: uniqueUsers.size,
        total_interactions: data?.length || 0,
        avg_satisfaction: avgSatisfaction
      };
    } catch (error) {
      console.error('Error fetching user engagement:', error);
      return { active_users: 0, total_interactions: 0, avg_satisfaction: 0 };
    }
  };

  const fetchLearningInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('oracle_learning_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0]?.insights_data || {};
    } catch (error) {
      console.error('Error fetching learning insights:', error);
      return {};
    }
  };

  const getSatisfactionColor = (score: number) => {
    if (score >= 4) return '#10b981'; // green
    if (score >= 3) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return '#10b981';
    if (rate >= 60) return '#f59e0b';
    return '#ef4444';
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
      <Card className="glow-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">Oracle Analytics Dashboard</CardTitle>
          </div>
          <CardDescription>
            Real-time insights into Oracle performance and learning progress
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glow-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Interactions</p>
                    <p className="text-2xl font-bold">{performanceMetrics?.total_interactions || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glow-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Satisfaction</p>
                    <p className="text-2xl font-bold" style={{ color: getSatisfactionColor(performanceMetrics?.avg_satisfaction || 0) }}>
                      {performanceMetrics?.avg_satisfaction?.toFixed(1) || '0.0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glow-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Helpful Rate</p>
                    <p className="text-2xl font-bold" style={{ color: getPerformanceColor(performanceMetrics?.helpful_rate || 0) }}>
                      {performanceMetrics?.helpful_rate?.toFixed(1) || '0.0'}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glow-border">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">{analyticsData?.user_engagement?.active_users || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Trends Chart */}
          <Card className="glow-border">
            <CardHeader>
              <CardTitle className="text-lg">Daily Performance Trends</CardTitle>
              <CardDescription>Oracle performance over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData?.daily_metrics || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="avg_satisfaction" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Satisfaction"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="helpful_rate" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="Helpful Rate %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Model Performance */}
          <Card className="glow-border">
            <CardHeader>
              <CardTitle className="text-lg">Model Performance</CardTitle>
              <CardDescription>Performance comparison across AI models</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceMetrics?.model_performance ? (
                <div className="space-y-4">
                  {Object.entries(performanceMetrics.model_performance).map(([model, data]: [string, any]) => (
                    <div key={model} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{model}</h4>
                        <p className="text-sm text-muted-foreground">
                          {data.total_queries} queries • {data.avg_satisfaction?.toFixed(1)} avg satisfaction
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge 
                          variant="outline" 
                          style={{ color: getSatisfactionColor(data.avg_satisfaction || 0) }}
                        >
                          {data.avg_satisfaction?.toFixed(1)}/5
                        </Badge>
                        <Badge 
                          variant="outline" 
                          style={{ color: getPerformanceColor(data.helpful_rate || 0) }}
                        >
                          {data.helpful_rate?.toFixed(1)}% helpful
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No model performance data available</p>
              )}
            </CardContent>
          </Card>

          {/* Performance Distribution */}
          <Card className="glow-border">
            <CardHeader>
              <CardTitle className="text-lg">Satisfaction Distribution</CardTitle>
              <CardDescription>Distribution of user satisfaction scores</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Poor (1-2)', value: performanceMetrics?.recent_trends?.satisfaction_distribution?.poor || 0 },
                  { name: 'Good (3)', value: performanceMetrics?.recent_trends?.satisfaction_distribution?.good || 0 },
                  { name: 'Excellent (4-5)', value: performanceMetrics?.recent_trends?.satisfaction_distribution?.excellent || 0 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-6">
          {/* Learning Insights */}
          <Card className="glow-border">
            <CardHeader>
              <CardTitle className="text-lg">Learning Insights</CardTitle>
              <CardDescription>AI learning progress and improvement areas</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData?.learning_insights ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Improvement Areas</h4>
                      <div className="space-y-2">
                        {analyticsData.learning_insights.improvement_areas?.map((area: string, index: number) => (
                          <Badge key={index} variant="outline" className="mr-2">
                            {area.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Success Factors</h4>
                      <div className="space-y-2">
                        {analyticsData.learning_insights.success_factors?.map((factor: string, index: number) => (
                          <Badge key={index} variant="outline" className="mr-2 bg-green-100">
                            {factor.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No learning insights available yet</p>
              )}
            </CardContent>
          </Card>

          {/* Learning Progress */}
          <Card className="glow-border">
            <CardHeader>
              <CardTitle className="text-lg">Learning Progress</CardTitle>
              <CardDescription>How Oracle is improving over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Learning progress will be displayed here as more feedback is collected
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          {/* User Engagement */}
          <Card className="glow-border">
            <CardHeader>
              <CardTitle className="text-lg">User Engagement</CardTitle>
              <CardDescription>How users are interacting with Oracle</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{analyticsData?.user_engagement?.active_users || 0}</p>
                  <p className="text-sm text-muted-foreground">Active Users (7 days)</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <MessageSquare className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{analyticsData?.user_engagement?.total_interactions || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Interactions</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Zap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">
                    {analyticsData?.user_engagement?.total_interactions > 0 
                      ? Math.round(analyticsData.user_engagement.total_interactions / analyticsData.user_engagement.active_users)
                      : 0
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Interactions per User</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
