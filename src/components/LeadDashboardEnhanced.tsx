import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, KeyRound, UserPlus, BarChart3, Code, Bot } from 'lucide-react';
import { UserManagementDashboard } from './UserManagementDashboard';
import { AccessCodeSimplified } from './AccessCodeSimplified';
import { BuildCodeManager } from './BuildCodeManager';
import { DiscordBotManagement } from './DiscordBotManagement';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const LeadDashboardEnhanced = () => {
  const [activeTab, setActiveTab] = useState('users');

  // Get quick stats and teams
  const { data: stats } = useQuery({
    queryKey: ['lead-dashboard-stats'],
    queryFn: async () => {
      const [usersRes, teamsRes] = await Promise.all([
        supabase.from('profiles').select('role').neq('role', null),
        supabase.from('teams').select('id, stage')
      ]);

      const users = usersRes.data || [];
      const teams = teamsRes.data || [];

      return {
        totalUsers: users.length,
        pendingUsers: users.filter(u => u.role === 'guest').length,
        builders: users.filter(u => u.role === 'builder').length,
        mentors: users.filter(u => u.role === 'mentor').length,
        totalTeams: teams.length,
        activeTeams: teams.filter(t => ['development', 'testing', 'launch'].includes(t.stage)).length
      };
    }
  });

  // Get teams data for BuildCodeManager
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, description')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-purple-500/20">
          <Crown className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Leadership Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, teams, and program operations
          </p>
        </div>
      </div>

      {/* Quick Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Total Users', value: stats?.totalUsers || 0, color: 'text-blue-400', icon: Users },
          { label: 'Pending', value: stats?.pendingUsers || 0, color: 'text-yellow-400', icon: UserPlus },
          { label: 'Builders', value: stats?.builders || 0, color: 'text-blue-400', icon: Users },
          { label: 'Mentors', value: stats?.mentors || 0, color: 'text-green-400', icon: Users },
          { label: 'Teams', value: stats?.totalTeams || 0, color: 'text-purple-400', icon: BarChart3 },
          { label: 'Active', value: stats?.activeTeams || 0, color: 'text-green-400', icon: BarChart3 }
        ].map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="glow-border bg-card/50 backdrop-blur">
              <CardContent className="p-4 text-center">
                <IconComponent className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
                <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-card/50 backdrop-blur border-primary/20">
          <TabsTrigger 
            value="users" 
            className="data-[state=active]:bg-primary/20 flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Users
            {stats?.pendingUsers && stats.pendingUsers > 0 && (
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 text-xs">
                {stats.pendingUsers}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="codes" 
            className="data-[state=active]:bg-primary/20 flex items-center gap-2"
          >
            <Code className="h-4 w-4" />
            Build Codes
          </TabsTrigger>
          <TabsTrigger 
            value="invites" 
            className="data-[state=active]:bg-primary/20 flex items-center gap-2"
          >
            <KeyRound className="h-4 w-4" />
            Invitations
          </TabsTrigger>
          <TabsTrigger 
            value="discord" 
            className="data-[state=active]:bg-primary/20 flex items-center gap-2"
          >
            <Bot className="h-4 w-4" />
            Discord Bot
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="data-[state=active]:bg-primary/20 flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-0">
          <UserManagementDashboard />
        </TabsContent>

        <TabsContent value="codes" className="space-y-0">
          <BuildCodeManager teams={teams || []} />
        </TabsContent>

        <TabsContent value="invites" className="space-y-0">
          <AccessCodeSimplified />
        </TabsContent>

        <TabsContent value="discord" className="space-y-0">
          <DiscordBotManagement />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Program Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
                <p className="text-muted-foreground">
                  Detailed program analytics and insights will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};