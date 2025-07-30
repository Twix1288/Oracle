import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Rocket, MessageSquare, Target, Calendar, Plus, TrendingUp, Sparkles, Clock, CheckCircle, AlertCircle } from "lucide-react";
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

  // Generate team-specific accent colors
  const generateTeamAccent = (teamName: string) => {
    const accents = [
      "text-blue-400", "text-green-400", "text-purple-400", 
      "text-orange-400", "text-pink-400", "text-cyan-400"
    ];
    const hash = teamName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return accents[Math.abs(hash) % accents.length];
  };

  const teamAccent = generateTeamAccent(team.name);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      {/* Cosmic background effects */}
      <div className="absolute inset-0 cosmic-sparkle opacity-10" />
      <div className="absolute top-10 right-10 w-20 h-20 bg-primary/5 rounded-full blur-xl ufo-pulse" />
      
      <div className="relative z-10 container mx-auto px-4 py-6 space-y-6">
        {/* Header with Team Branding */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-full bg-primary/20 ufo-pulse`}>
                <Rocket className={`h-6 w-6 ${teamAccent}`} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-glow">Builder Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome back, <span className="font-medium text-primary">{builderName}</span>
                </p>
              </div>
            </div>
            
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glow-border bg-card/80 backdrop-blur-sm border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className={`h-5 w-5 ${teamAccent}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">My Updates</p>
                      <p className="text-2xl font-bold">{metrics.totalUpdates}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glow-border bg-card/80 backdrop-blur-sm border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className={`h-5 w-5 ${teamAccent}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">Today</p>
                      <p className="text-2xl font-bold">{metrics.todayUpdates}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glow-border bg-card/80 backdrop-blur-sm border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className={`h-5 w-5 ${teamAccent}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">This Week</p>
                      <p className="text-2xl font-bold">{metrics.weekUpdates}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glow-border bg-card/80 backdrop-blur-sm border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Rocket className={`h-5 w-5 ${teamAccent}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">Team Size</p>
                      <p className="text-2xl font-bold">{metrics.teamMembers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Team Profile Sidebar */}
          <div className="lg:w-80">
            <TeamProfileCard 
              team={team}
              builderName={builderName}
              teamMemberCount={teamMembers.length}
              onLeaveTeam={onLeaveTeam}
            />
          </div>
        </div>

        {/* Daily Check-in Prompts */}
        {metrics.todayUpdates === 0 && (
          <Card className="glow-border bg-card/80 backdrop-blur-sm border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Daily Check-in
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                  Pending
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Start your day by logging an update. Here are some prompts to get you started:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dailyPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-left justify-start border-primary/20 hover:border-primary/40 h-auto py-3"
                    onClick={() => setActiveTab("updates")}
                  >
                    <div className="flex items-start gap-2 text-left">
                      <AlertCircle className="w-4 h-4 mt-0.5 text-primary" />
                      <span className="text-sm leading-relaxed">{prompt}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-card/80 backdrop-blur-sm border-primary/20 h-auto p-2">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 py-3">
              <div className="flex flex-col items-center gap-1">
                <Target className="h-4 w-4" />
                <span className="text-xs">Overview</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="updates" className="data-[state=active]:bg-primary/20 py-3">
              <div className="flex flex-col items-center gap-1">
                <Plus className="h-4 w-4" />
                <span className="text-xs">Updates</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="oracle" className="data-[state=active]:bg-primary/20 py-3">
              <div className="flex flex-col items-center gap-1">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs">Oracle</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-primary/20 py-3">
              <div className="flex flex-col items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs">Messages</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-primary/20 py-3">
              <div className="flex flex-col items-center gap-1">
                <Rocket className="h-4 w-4" />
                <span className="text-xs">Team</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Team Status */}
              <Card className="glow-border bg-card/80 backdrop-blur-sm border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Team Status & Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{team.name}</h3>
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        {team.stage}
                      </Badge>
                    </div>
                    {team.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{team.description}</p>
                    )}
                    {teamStatus?.current_status && (
                      <div className="p-4 rounded-lg bg-background/30 border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium">Latest Status</span>
                        </div>
                        <p className="text-sm">{teamStatus.current_status}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Last updated: {new Date(teamStatus.last_update).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Team Updates */}
              <Card className="glow-border bg-card/80 backdrop-blur-sm border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Recent Team Activity
                    </span>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      {teamUpdates.length} Total
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {teamUpdates.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No updates yet</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={() => setActiveTab("updates")}
                      >
                        Submit First Update
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {teamUpdates.slice(0, 5).map((update) => (
                        <div 
                          key={update.id} 
                          className="p-4 rounded-lg bg-background/30 border border-primary/10 hover:border-primary/20 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                {update.type}
                              </Badge>
                              {update.created_by === builderName && (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30 text-xs">
                                  You
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(update.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{update.content}</p>
                          {update.created_by && update.created_by !== builderName && (
                            <p className="text-xs text-muted-foreground mt-2">
                              by {update.created_by}
                            </p>
                          )}
                        </div>
                      ))}
                      {teamUpdates.length > 5 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-3"
                          onClick={() => setActiveTab("updates")}
                        >
                          View All Updates ({teamUpdates.length})
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
              <Card className="glow-border bg-card/80 backdrop-blur-sm border-primary/20">
                <CardContent className="p-8 text-center">
                  <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Updates Unavailable</h3>
                  <p className="text-muted-foreground">
                    The update system is currently unavailable.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="oracle">
            <div className="space-y-6">
              <Card className="glow-border bg-card/80 backdrop-blur-sm border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Team Oracle Assistant
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
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
                <Card className="glow-border bg-card/80 backdrop-blur-sm border-primary/20">
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Oracle Unavailable</h3>
                    <p className="text-muted-foreground">
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
  );
};