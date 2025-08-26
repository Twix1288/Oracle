import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SimpleOracle } from "@/components/SimpleOracle";
import { TeamDashboard } from "@/components/TeamDashboard";
import { MessagingCenter } from "@/components/MessagingCenter";
import { MasterAccessCodes } from "@/components/MasterAccessCodes";
import { LeadDashboardEnhanced } from "@/components/LeadDashboardEnhanced";
import { DiscordBotManagement } from "@/components/DiscordBotManagement";
import { OracleAnalytics } from "@/components/OracleAnalytics";
import { Users, MessageSquare, Target, BarChart3, Settings, Hash, TrendingUp, Clock, UserPlus } from "lucide-react";
import type { Team, Member, Update, UserRole, TeamStatus } from "@/types/oracle";

interface LeadDashboardProps {
  teams: Team[];
  members: Member[];
  updates: Update[];
  teamStatuses: TeamStatus[];
  selectedRole: UserRole;
  onExit: () => void;
}

export const LeadDashboard = ({ 
  teams, 
  members, 
  updates, 
  teamStatuses, 
  selectedRole, 
  onExit 
}: LeadDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate lead-specific metrics
  const totalTeams = teams?.length || 0;
  const totalMembers = members?.length || 0;
  const recentUpdates = updates?.filter(update => {
    const updateDate = new Date(update.created_at);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return updateDate >= threeDaysAgo;
  }).length || 0;

  return (
    <div className="min-h-screen bg-cosmic cosmic-sparkle">
      <DashboardHeader 
        role="lead" 
        onExit={onExit}
      />

      <div className="container mx-auto px-6 pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-card/50 backdrop-blur">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Teams</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="oracle" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Oracle</span>
            </TabsTrigger>
            <TabsTrigger value="master-codes" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Master Codes</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Management</span>
            </TabsTrigger>
            <TabsTrigger value="discord" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              <span className="hidden sm:inline">Discord Bot</span>
            </TabsTrigger>
          </TabsList>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Teams</p>
                    <p className="text-xl font-bold">{totalTeams}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-green-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Members</p>
                    <p className="text-xl font-bold">{totalMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Recent Updates</p>
                    <p className="text-xl font-bold">{recentUpdates}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Active Status</p>
                    <p className="text-xl font-bold">{teamStatuses?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <TeamDashboard 
                teams={teams}
                teamStatuses={teamStatuses}
                members={members}
                selectedRole={selectedRole}
              />
              <OracleAnalytics role={selectedRole} />
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <TeamDashboard 
              teams={teams}
              teamStatuses={teamStatuses}
              members={members}
              selectedRole={selectedRole}
            />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <MessagingCenter />
          </TabsContent>

          <TabsContent value="oracle" className="space-y-6">
            <SimpleOracle selectedRole={selectedRole} />
          </TabsContent>

          <TabsContent value="master-codes" className="space-y-6">
            <MasterAccessCodes />
          </TabsContent>

          <TabsContent value="management" className="space-y-6">
            <LeadDashboardEnhanced />
          </TabsContent>

          <TabsContent value="discord" className="space-y-6">
            <DiscordBotManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};