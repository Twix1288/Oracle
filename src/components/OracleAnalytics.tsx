import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, TrendingUp, MessageSquare, Clock, Users, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/oracle";

interface OracleAnalyticsProps {
  role: UserRole;
  teamId?: string;
}

interface OracleLog {
  id: string;
  user_role: UserRole;
  user_id?: string;
  team_id?: string;
  query: string;
  response: string;
  sources_count: number;
  processing_time_ms?: number;
  created_at: string;
}

export const OracleAnalytics = ({ role, teamId }: OracleAnalyticsProps) => {
  const [timeRange, setTimeRange] = useState('7d');

  // Fetch Oracle logs
  const { data: oracleLogs = [], isLoading } = useQuery({
    queryKey: ['oracle_logs', role, teamId, timeRange],
    queryFn: async () => {
      let query = supabase.from('oracle_logs').select('*').order('created_at', { ascending: false });
      
      // Filter based on role access
      if (role === 'builder' && teamId) {
        query = query.eq('team_id', teamId);
      }
      
      // Apply time range filter
      const now = new Date();
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1;
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      query = query.gte('created_at', startDate.toISOString());
      
      const { data, error } = await query;
      if (error) throw error;
      return data as OracleLog[];
    },
  });

  const getAnalytics = () => {
    const totalQueries = oracleLogs.length;
    const avgProcessingTime = oracleLogs.reduce((acc, log) => acc + (log.processing_time_ms || 0), 0) / totalQueries || 0;
    const avgSourcesUsed = oracleLogs.reduce((acc, log) => acc + log.sources_count, 0) / totalQueries || 0;
    
    const queriesByRole = oracleLogs.reduce((acc, log) => {
      acc[log.user_role] = (acc[log.user_role] || 0) + 1;
      return acc;
    }, {} as Record<UserRole, number>);

    const topQueries = oracleLogs
      .reduce((acc, log) => {
        const query = log.query.toLowerCase();
        acc[query] = (acc[query] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalQueries,
      avgProcessingTime: Math.round(avgProcessingTime),
      avgSourcesUsed: Math.round(avgSourcesUsed * 10) / 10,
      queriesByRole,
      topQueries: Object.entries(topQueries)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    };
  };

  const analytics = getAnalytics();

  const getRoleColor = (userRole: UserRole) => {
    switch (userRole) {
      case 'lead': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'mentor': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'builder': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/20">
          <BarChart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Oracle Analytics</h2>
          <p className="text-muted-foreground">AI usage insights and patterns</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Queries</p>
                <p className="text-2xl font-bold">{analytics.totalQueries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{analytics.avgProcessingTime}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Sources Used</p>
                <p className="text-2xl font-bold">{analytics.avgSourcesUsed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-orange-400" />
              <div>
                <p className="text-sm text-muted-foreground">Most Active Role</p>
                <p className="text-lg font-bold">
                  {Object.entries(analytics.queriesByRole).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="queries" className="space-y-4">
        <TabsList className="bg-card/50 backdrop-blur border-primary/20">
          <TabsTrigger value="queries">Recent Queries</TabsTrigger>
          <TabsTrigger value="patterns">Usage Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="queries">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Recent Oracle Queries</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Loading analytics...</p>
              ) : oracleLogs.length === 0 ? (
                <p className="text-muted-foreground">No queries found</p>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {oracleLogs.slice(0, 20).map((log) => (
                    <div 
                      key={log.id} 
                      className="p-4 rounded-lg bg-background/30 border border-primary/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleColor(log.user_role)} variant="outline">
                            {log.user_role}
                          </Badge>
                          {log.sources_count > 0 && (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                              {log.sources_count} sources
                            </Badge>
                          )}
                          {log.processing_time_ms && (
                            <Badge variant="outline" className="bg-gray-500/10 text-gray-300 border-gray-500/30">
                              {log.processing_time_ms}ms
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Query:</p>
                          <p className="text-sm font-medium">{log.query}</p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Response:</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {log.response.length > 200 
                              ? `${log.response.substring(0, 200)}...` 
                              : log.response
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Queries by Role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.queriesByRole).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between">
                      <Badge className={getRoleColor(role as UserRole)} variant="outline">
                        {role}
                      </Badge>
                      <span className="text-sm font-medium">{count} queries</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Common Query Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topQueries.map(([query, count], index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">#{index + 1}</span>
                        <span className="text-xs text-muted-foreground">{count} times</span>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {query.length > 50 ? `${query.substring(0, 50)}...` : query}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};