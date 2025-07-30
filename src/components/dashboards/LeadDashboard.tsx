import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, MessageSquare, Activity, Settings, Plus, Eye } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { TeamDashboard } from "../TeamDashboard";
import { MessagingCenter } from "../MessagingCenter";
import { OracleAnalytics } from "../OracleAnalytics";
import { AccessCodeManager } from "../AccessCodeManager";
import type { Team, Member, Update, UserRole } from "@/types/oracle";

interface LeadDashboardProps {
  teams: Team[];
  members: Member[];
  updates: Update[];
  teamStatuses: any[];
  selectedRole: UserRole;
  onExit: () => void;
}

export const LeadDashboard = ({ teams, members, updates, teamStatuses, onExit }: LeadDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  const getEngagementMetrics = () => {
    const totalTeams = teams.length;
    const activeTeams = teamStatuses.filter(status => 
      status.last_update && new Date(status.last_update) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    const recentUpdates = updates.filter(update => 
      new Date(update.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    return { totalTeams, activeTeams, recentUpdates };
  };

  const metrics = getEngagementMetrics();

  return (
    <>
      <DashboardHeader 
        role="lead" 
        onExit={onExit}
      />
      <div className="container mx-auto px-6 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/20 ufo-pulse">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-glow">Lead Command Center</h1>
          <p className="text-muted-foreground">Full mission control and oversight</p>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Teams</p>
                <p className="text-2xl font-bold">{metrics.totalTeams}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm text-muted-foreground">Active This Week</p>
                <p className="text-2xl font-bold">{metrics.activeTeams}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm text-muted-foreground">Today's Updates</p>
                <p className="text-2xl font-bold">{metrics.recentUpdates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-card/50 backdrop-blur border-primary/20">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20">
            <Eye className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="teams" className="data-[state=active]:bg-primary/20">
            <Users className="h-4 w-4 mr-2" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-primary/20">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-primary/20">
            <Activity className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary/20">
            <Settings className="h-4 w-4 mr-2" />
            Access Control
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TeamDashboard 
            teams={teams} 
            teamStatuses={teamStatuses} 
            members={members} 
            selectedRole="lead" 
          />
        </TabsContent>

        <TabsContent value="teams">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Team Management</h3>
              <Button className="ufo-gradient">
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </div>
            <TeamDashboard 
              teams={teams} 
              teamStatuses={teamStatuses} 
              members={members} 
              selectedRole="lead" 
            />
          </div>
        </TabsContent>

        <TabsContent value="messages">
          <MessagingCenter role="lead" />
        </TabsContent>

        <TabsContent value="analytics">
          <OracleAnalytics role="lead" />
        </TabsContent>

        <TabsContent value="settings">
          <AccessCodeManager />
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
};