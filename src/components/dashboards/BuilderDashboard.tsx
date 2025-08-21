import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rocket, MessageSquare, Target, Calendar, Plus, TrendingUp, Bot } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { TeamDashboard } from "../TeamDashboard";
import { MessagingCenter } from "../MessagingCenter";
import { ProgressTracker } from "../ProgressTracker";
import { SuperOracle } from "../SuperOracle";
import { DiscordLinkManager } from "../DiscordLinkManager";
import type { Team, Member, Update, UserRole } from "@/types/oracle";

interface BuilderDashboardProps {
  teams: Team[];
  members: Member[];
  updates: Update[];
  teamStatuses: any[];
  selectedRole: UserRole;
  builderId?: string;
  teamId?: string;
  onSubmitUpdate?: (update: any) => void;
  onQueryRAG?: (query: string, role: UserRole) => void;
  ragResponse?: any;
  ragLoading?: boolean;
  onExit: () => void;
}

export const BuilderDashboard = ({ 
  teams, 
  members, 
  updates, 
  teamStatuses, 
  builderId, 
  teamId,
  onSubmitUpdate,
  onQueryRAG,
  ragResponse,
  ragLoading,
  onExit
}: BuilderDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  // Get builder's team data
  const builderTeam = teams.find(team => team.id === teamId);
  const teamMembers = members.filter(member => member.team_id === teamId);
  const teamUpdates = updates.filter(update => update.team_id === teamId);
  const teamStatus = teamStatuses.find(status => status.team_id === teamId);

  const getBuilderMetrics = () => {
    const myUpdates = teamUpdates.filter(update => update.created_by === builderId);
    const todayUpdates = myUpdates.filter(update => 
      new Date(update.created_at).toDateString() === new Date().toDateString()
    );
    const weekUpdates = myUpdates.filter(update => 
      new Date(update.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    return {
      totalUpdates: myUpdates.length,
      todayUpdates: todayUpdates.length,
      weekUpdates: weekUpdates.length,
      teamMembers: teamMembers.length
    };
  };

  const metrics = getBuilderMetrics();

  const dailyPrompts = [
    "What did you accomplish today?",
    "Any blockers or challenges?",
    "What's planned for tomorrow?",
    "Need help with anything specific?"
  ];

  return (
    <>
      <DashboardHeader 
        role="builder" 
        onExit={onExit}
      />
      <div className="container mx-auto px-6 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-blue-500/20 ufo-pulse">
          <Rocket className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-glow">Builder Dashboard</h1>
          <p className="text-muted-foreground">
            {builderTeam ? `Team: ${builderTeam.name}` : "Welcome to your mission control"}
          </p>
        </div>
      </div>

      {!builderTeam && (
        <Card className="glow-border bg-card/50 backdrop-blur border-yellow-500/30">
          <CardContent className="p-6 text-center">
            <Target className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Team Assignment</h3>
            <p className="text-muted-foreground">
              You haven't been assigned to a team yet. Contact your lead or mentor for team assignment.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Metrics */}
      {builderTeam && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">My Updates</p>
                  <p className="text-2xl font-bold">{metrics.totalUpdates}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold">{metrics.todayUpdates}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold">{metrics.weekUpdates}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Rocket className="h-5 w-5 text-orange-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Team Size</p>
                  <p className="text-2xl font-bold">{metrics.teamMembers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Check-in Prompts */}
      {builderTeam && metrics.todayUpdates === 0 && (
        <Card className="glow-border bg-card/50 backdrop-blur border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Daily Check-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Haven't logged an update today? Here are some prompts to get started:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {dailyPrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-left justify-start border-primary/20 hover:border-primary/40"
                  onClick={() => setActiveTab("updates")}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-card/50 backdrop-blur border-primary/20">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20">
            <Target className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="updates" className="data-[state=active]:bg-primary/20">
            <Plus className="h-4 w-4 mr-2" />
            Updates
          </TabsTrigger>
          <TabsTrigger value="oracle" className="data-[state=active]:bg-primary/20">
            <MessageSquare className="h-4 w-4 mr-2" />
            Oracle
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-primary/20">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-primary/20">
            <Rocket className="h-4 w-4 mr-2" />
            Team
          </TabsTrigger>
          <TabsTrigger value="discord" className="data-[state=active]:bg-primary/20">
            <Bot className="h-4 w-4 mr-2" />
            Discord
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {builderTeam ? (
            <div className="space-y-6">
              {/* Team Status */}
              <Card className="glow-border bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Team Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{builderTeam.name}</h3>
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        {builderTeam.stage}
                      </Badge>
                    </div>
                    {builderTeam.description && (
                      <p className="text-sm text-muted-foreground">{builderTeam.description}</p>
                    )}
                    {teamStatus?.current_status && (
                      <div className="p-3 rounded-lg bg-background/30 border border-primary/10">
                        <p className="text-sm">{teamStatus.current_status}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last updated: {new Date(teamStatus.last_update).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Team Updates */}
              <Card className="glow-border bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>Recent Team Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  {teamUpdates.length === 0 ? (
                    <p className="text-muted-foreground">No updates yet</p>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {teamUpdates.slice(0, 5).map((update) => (
                        <div 
                          key={update.id} 
                          className="p-3 rounded-lg bg-background/30 border border-primary/10"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                              {update.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(update.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{update.content}</p>
                          {update.created_by && (
                            <p className="text-xs text-muted-foreground mt-1">
                              by {update.created_by}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardContent className="p-8 text-center">
                <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Get Started</h3>
                <p className="text-muted-foreground">
                  Once you're assigned to a team, you'll see your team's progress and can start logging updates.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="updates">
          {builderTeam && onSubmitUpdate ? (
            <ProgressTracker 
              team={builderTeam}
              updates={teamUpdates} 
              userRole="builder"
            />
          ) : (
            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardContent className="p-8 text-center">
                <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Team Assignment Required</h3>
                <p className="text-muted-foreground">
                  You need to be assigned to a team before you can submit updates.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="oracle">
          <SuperOracle 
            selectedRole="builder"
            teamId={teamId}
          />
        </TabsContent>

        <TabsContent value="messages">
          <MessagingCenter userRole="builder" accessCode={builderId} teamId={teamId} />
        </TabsContent>

        <TabsContent value="team">
          {builderTeam ? (
            <TeamDashboard 
              teams={[builderTeam]} 
              teamStatuses={teamStatus ? [teamStatus] : []} 
              members={teamMembers} 
              selectedRole="builder" 
            />
          ) : (
            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardContent className="p-8 text-center">
                <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Team</h3>
                <p className="text-muted-foreground">
                  You'll see your team information here once you're assigned to a team.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="discord">
          <div className="max-w-md mx-auto">
            <DiscordLinkManager />
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
};