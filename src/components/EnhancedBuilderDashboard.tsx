import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Rocket, 
  MessageSquare, 
  Target, 
  Calendar, 
  Plus, 
  TrendingUp, 
  Sparkles, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  X,
  Home
} from "lucide-react";
import { TeamDashboard } from "./TeamDashboard";
import { MessagingCenter } from "./MessagingCenter";
import { ProgressTracker } from "./ProgressTracker";
import { OracleQuery } from "./OracleQuery";
import { TeamProfileCard } from "./TeamProfileCard";
import type { Team, Member, Update, UserRole } from "@/types/oracle";

interface EnhancedBuilderDashboardProps {
  team: Team;
  builderName: string;
  members: Member[];
  updates: Update[];
  teamStatuses: any[];
  onSubmitUpdate?: (update: any) => void;
  onQueryRAG?: (query: string, role: UserRole) => void;
  ragResponse?: any;
  ragLoading?: boolean;
  onLeaveTeam?: () => void;
}

export const EnhancedBuilderDashboard = ({ 
  team,
  builderName,
  members, 
  updates, 
  teamStatuses, 
  onSubmitUpdate,
  onQueryRAG,
  ragResponse,
  ragLoading,
  onLeaveTeam
}: EnhancedBuilderDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  // Filter data for this team
  const teamMembers = members.filter(member => member.team_id === team.id);
  const teamUpdates = updates.filter(update => update.team_id === team.id);
  const teamStatus = teamStatuses.find(status => status.team_id === team.id);

  const getBuilderMetrics = () => {
    const myUpdates = teamUpdates.filter(update => update.created_by === builderName);
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
    <div className="min-h-screen bg-background">
      {/* FIXED NAVIGATION HEADER - Always visible at top */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="w-full px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="p-3 rounded-lg bg-primary/10">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  PieFi Oracle - Builder Dashboard
                </h1>
                <div className="flex items-center gap-6 mt-2">
                  <span className="text-base text-muted-foreground">
                    Welcome, <span className="font-medium text-foreground">{builderName}</span>
                  </span>
                  <span className="text-base text-muted-foreground">
                    Team: <span className="font-medium text-foreground">{team.name}</span>
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                onClick={onLeaveTeam}
                variant="destructive"
                size="lg"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-6 py-3"
              >
                <ArrowLeft className="w-5 h-5 mr-3" />
                Exit Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* MAIN CONTENT WITH PROPER SPACING */}
      <div className="w-full px-8 py-8">
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* Welcome Section with better spacing */}
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="p-4 rounded-xl bg-primary/10">
                <Rocket className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-semibold text-foreground mb-2">
                  Welcome back, {builderName}
                </h2>
                <p className="text-lg text-muted-foreground">
                  Ready to make progress on <span className="font-medium text-foreground">{team.name}</span>?
                </p>
              </div>
            </div>
          </div>

          {/* Team Info and Metrics with proper spacing */}
          <div className="flex flex-col xl:flex-row gap-10">
            <div className="flex-1 space-y-8">
              
              {/* Quick Metrics with proper spacing */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border border-border bg-card p-6">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4">
                      <TrendingUp className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">My Updates</p>
                        <p className="text-3xl font-bold text-foreground">{metrics.totalUpdates}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-border bg-card p-6">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4">
                      <Calendar className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Today</p>
                        <p className="text-3xl font-bold text-foreground">{metrics.todayUpdates}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-border bg-card p-6">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4">
                      <Clock className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">This Week</p>
                        <p className="text-3xl font-bold text-foreground">{metrics.weekUpdates}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-border bg-card p-6">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4">
                      <Rocket className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Team Size</p>
                        <p className="text-3xl font-bold text-foreground">{metrics.teamMembers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Check-in Prompts with proper spacing */}
              {metrics.todayUpdates === 0 && (
                <Card className="border border-primary/20 bg-card p-8">
                  <CardHeader className="p-0 mb-6">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <Plus className="h-6 w-6 text-primary" />
                      Daily Check-in
                      <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/20 px-3 py-1">
                        Pending
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="text-base text-muted-foreground mb-6">
                      Start your day by logging an update. Here are some prompts to get you started:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dailyPrompts.map((prompt, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="lg"
                          className="text-left justify-start border-border hover:border-primary/40 h-auto py-4 px-6"
                          onClick={() => setActiveTab("updates")}
                        >
                          <div className="flex items-start gap-3 text-left">
                            <AlertCircle className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
                            <span className="text-sm leading-relaxed">{prompt}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Team Profile Sidebar with proper spacing */}
            <div className="xl:w-96">
              <TeamProfileCard 
                team={team}
                builderName={builderName}
                teamMemberCount={teamMembers.length}
                onLeaveTeam={onLeaveTeam}
              />
            </div>
          </div>

          {/* Main Dashboard Tabs with proper spacing */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full grid-cols-5 bg-card border border-border h-auto p-2">
              <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-4">
                <div className="flex flex-col items-center gap-2">
                  <Target className="h-5 w-5" />
                  <span className="text-sm font-medium">Overview</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="updates" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-4">
                <div className="flex flex-col items-center gap-2">
                  <Plus className="h-5 w-5" />
                  <span className="text-sm font-medium">Updates</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="oracle" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-4">
                <div className="flex flex-col items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-medium">Oracle</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="messages" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-4">
                <div className="flex flex-col items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  <span className="text-sm font-medium">Messages</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="team" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary py-4">
                <div className="flex flex-col items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  <span className="text-sm font-medium">Team</span>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              {/* Team Status with proper spacing */}
              <Card className="border border-border bg-card p-8">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Target className="h-6 w-6 text-primary" />
                    Team Status & Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-foreground">{team.name}</h3>
                    <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                      {team.stage}
                    </Badge>
                  </div>
                  {team.description && (
                    <p className="text-base text-muted-foreground leading-relaxed">{team.description}</p>
                  )}
                  {teamStatus?.current_status && (
                    <div className="p-6 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center gap-3 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm font-medium text-foreground">Latest Status</span>
                      </div>
                      <p className="text-base text-muted-foreground">{teamStatus.current_status}</p>
                      <p className="text-sm text-muted-foreground mt-3">
                        Last updated: {new Date(teamStatus.last_update).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Team Updates with proper spacing */}
              <Card className="border border-border bg-card p-8">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-3 text-xl">
                      <TrendingUp className="h-6 w-6 text-primary" />
                      Recent Team Activity
                    </span>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                      {teamUpdates.length} Total
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {teamUpdates.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-base text-muted-foreground mb-4">No updates yet</p>
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="px-6"
                        onClick={() => setActiveTab("updates")}
                      >
                        Submit First Update
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-[500px] overflow-y-auto">
                      {teamUpdates.slice(0, 5).map((update) => (
                        <div 
                          key={update.id} 
                          className="p-6 rounded-lg bg-muted/30 border border-border hover:border-primary/20 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                {update.type}
                              </Badge>
                              {update.created_by === builderName && (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                                  You
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(update.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-base leading-relaxed text-foreground">{update.content}</p>
                          {update.created_by && update.created_by !== builderName && (
                            <p className="text-sm text-muted-foreground mt-3">
                              by {update.created_by}
                            </p>
                          )}
                        </div>
                      ))}
                      {teamUpdates.length > 5 && (
                        <Button 
                          variant="outline" 
                          size="lg"
                          className="w-full mt-6"
                          onClick={() => setActiveTab("updates")}
                        >
                          View All Updates ({teamUpdates.length})
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="updates">
              {onSubmitUpdate ? (
                <ProgressTracker 
                  updates={teamUpdates} 
                  teams={[team]} 
                  onSubmitUpdate={onSubmitUpdate}
                  selectedRole="builder" 
                />
              ) : (
                <Card className="border border-border bg-card p-12">
                  <CardContent className="p-0 text-center">
                    <Plus className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                    <h3 className="text-xl font-medium mb-3">Updates Unavailable</h3>
                    <p className="text-base text-muted-foreground">
                      The update system is currently unavailable.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="oracle">
              <div className="space-y-8">
                <Card className="border border-border bg-card p-8">
                  <CardHeader className="p-0 mb-6">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <Sparkles className="h-6 w-6 text-primary" />
                      Team Oracle Assistant
                    </CardTitle>
                    <p className="text-base text-muted-foreground mt-3">
                      Ask questions about your team's progress, get insights, and receive guidance tailored to <strong>{team.name}</strong>
                    </p>
                  </CardHeader>
                </Card>
                
                {onQueryRAG ? (
                  <OracleQuery 
                    onQuery={onQueryRAG}
                    isLoading={ragLoading || false}
                    response={ragResponse}
                    selectedRole="builder"
                  />
                ) : (
                  <Card className="border border-border bg-card p-12">
                    <CardContent className="p-0 text-center">
                      <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                      <h3 className="text-xl font-medium mb-3">Oracle Unavailable</h3>
                      <p className="text-base text-muted-foreground">
                        The Oracle AI assistant is currently unavailable.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="messages">
              <MessagingCenter role="builder" userId={builderName} teamId={team.id} />
            </TabsContent>

            <TabsContent value="team">
              <TeamDashboard 
                teams={[team]} 
                teamStatuses={teamStatus ? [teamStatus] : []} 
                members={teamMembers} 
                selectedRole="builder" 
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};