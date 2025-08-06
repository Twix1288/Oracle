import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "./DashboardHeader";
import { ProgressTracker } from "./ProgressTracker";
import { TeamProfileCard } from "./TeamProfileCard";
import { QueryBar } from "./QueryBar";
import { EnhancedOracle } from "./EnhancedOracle";
import { OnboardingFlow } from "./OnboardingFlow";
import { MessagingCenter } from "./MessagingCenter";
import { 
  Users, 
  Activity, 
  MessageSquare, 
  Lightbulb, 
  Rocket, 
  Target,
  TrendingUp,
  Sparkles,
  Clock,
  User
} from "lucide-react";
import type { Team, Member, Update, TeamStatus, UserRole, UpdateType, TeamStage } from "@/types/oracle";

interface EnhancedBuilderDashboardProps {
  team: Team;
  builderName: string;
  members: Member[];
  updates: Update[];
  teamStatuses?: TeamStatus[];
  onSubmitUpdate?: (teamId: string, content: string, type: UpdateType, createdBy?: string) => void;
  onQueryRAG?: (params: { query: string; role: UserRole }) => void;
  ragResponse?: any;
  ragLoading?: boolean;
  onLeaveTeam: () => void;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentTeam, setCurrentTeam] = useState(team);

  // Check if team needs onboarding (minimal description or no updates)
  useEffect(() => {
    const needsOnboarding = !team.description || team.description.length < 10 || updates.length === 0;
    setShowOnboarding(needsOnboarding);
  }, [team, updates]);

  const teamMembers = members.filter(member => member.team_id === currentTeam.id);
  const teamUpdates = updates.filter(update => update.team_id === currentTeam.id);
  const teamStatus = teamStatuses?.find(status => status.team_id === currentTeam.id);

  const handleOnboardingComplete = (updatedTeam: Team) => {
    setCurrentTeam(updatedTeam);
    setShowOnboarding(false);
  };

  const handleStageUpdate = (newStage: TeamStage) => {
    setCurrentTeam(prev => ({ ...prev, stage: newStage }));
  };

  // Show onboarding if needed
  if (showOnboarding) {
    return (
      <OnboardingFlow 
        team={currentTeam}
        builderName={builderName}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle">
      <DashboardHeader 
        onExit={onLeaveTeam}
      />
      
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Team Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <TeamProfileCard 
              team={currentTeam} 
              builderName={builderName}
              teamMemberCount={teamMembers.length}
              onLeaveTeam={onLeaveTeam}
            />
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-glow">{currentTeam.name}</h1>
              <p className="text-muted-foreground">{currentTeam.description || "No description available"}</p>
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  Stage: {currentTeam.stage}
                </Badge>
                <Badge variant="outline" className="border-primary/20">
                  {teamMembers.length} members
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-card/50 backdrop-blur border-primary/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="progress" className="data-[state=active]:bg-primary/20">
              <Target className="h-4 w-4 mr-2" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="oracle" className="data-[state=active]:bg-primary/20">
              <Sparkles className="h-4 w-4 mr-2" />
              Oracle
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-primary/20">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-primary/20">
              <Users className="h-4 w-4 mr-2" />
              Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glow-border bg-card/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{teamUpdates.length}</p>
                      <p className="text-sm text-muted-foreground">Total Updates</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glow-border bg-card/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{teamMembers.length}</p>
                      <p className="text-sm text-muted-foreground">Team Members</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glow-border bg-card/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Rocket className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold capitalize">{currentTeam.stage}</p>
                      <p className="text-sm text-muted-foreground">Current Stage</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Updates */}
            <Card className="glow-border bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Team Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamUpdates.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No updates yet</p>
                    <Button onClick={() => setActiveTab("progress")}>
                      Add First Update
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamUpdates.slice(0, 3).map((update) => (
                      <div key={update.id} className="p-4 rounded-lg bg-muted/30 border">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{update.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(update.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{update.content}</p>
                        {update.created_by && (
                          <p className="text-xs text-muted-foreground mt-2">
                            by {update.created_by}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Status */}
            {teamStatus && (
              <Card className="glow-border bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Team Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-3">{teamStatus.current_status}</p>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(teamStatus.last_update || teamStatus.updated_at).toLocaleDateString()}
                  </p>
                  {teamStatus.pending_actions && teamStatus.pending_actions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Pending Actions:</h4>
                      <ul className="text-xs space-y-1">
                        {teamStatus.pending_actions.map((action, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <ProgressTracker 
              team={currentTeam}
              updates={teamUpdates}
              userRole="builder"
              onStageUpdate={handleStageUpdate}
            />
          </TabsContent>

          <TabsContent value="oracle" className="space-y-6">
            <EnhancedOracle 
              selectedRole="builder"
              teamId={currentTeam.id}
              userId={builderName}
            />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <MessagingCenter 
              userRole="builder"
              userId={builderName}
              teamId={currentTeam.id}
            />
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            {/* Team Members */}
            <Card className="glow-border bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No team members found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/20">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Joined {new Date(member.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {member.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Information */}
            <Card className="glow-border bg-card/50">
              <CardHeader>
                <CardTitle>Team Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {currentTeam.description || "No description available"}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Development Stage</h4>
                  <Badge className="bg-primary/20 text-primary border-primary/30 capitalize">
                    {currentTeam.stage}
                  </Badge>
                </div>

                {currentTeam.tags && currentTeam.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentTeam.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Created</h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(currentTeam.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};