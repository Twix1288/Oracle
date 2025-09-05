import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Rocket, 
  Users, 
  Target, 
  CheckCircle,
  MessageSquare,
  TrendingUp,
  Calendar,
  Activity
} from "lucide-react";
import { DashboardHeader } from "./DashboardHeader";
import { SuperOracle } from "./SuperOracle";
import { BuilderLounge } from "./BuilderLounge";
import { ProgressTracker } from "./ProgressTracker";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Team, Member, Update } from "@/types/oracle";

interface NewBuilderDashboardProps {
  teams: Team[];
  members: Member[];
  updates: Update[];
  onExit: () => void;
}

export const NewBuilderDashboard = ({ teams, members, updates, onExit }: NewBuilderDashboardProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [teamData, setTeamData] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Find the user's team
  const userTeam = teams?.find(team => 
    members?.some(member => member.team_id === team.id && member.user_id === user?.id)
  );

  useEffect(() => {
    if (userTeam) {
      setTeamData(userTeam);
      setTeamMembers(members?.filter(m => m.team_id === userTeam.id) || []);
      setRecentUpdates(updates?.filter(u => u.team_id === userTeam.id) || []);
    }
    setIsLoading(false);
  }, [userTeam, members, updates]);

  const refreshTeamData = async () => {
    if (!userTeam) return;
    
    try {
      const { data: updatedTeam } = await supabase
        .from('teams')
        .select('*')
        .eq('id', userTeam.id)
        .single();
      
      if (updatedTeam) {
        setTeamData(updatedTeam);
      }
    } catch (error) {
      console.error('Error refreshing team data:', error);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'ideation': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'development': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'testing': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'launch': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'growth': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStageProgress = () => {
    if (!teamData) return 0;
    const stages = ['ideation', 'development', 'testing', 'launch', 'growth'];
    const currentIndex = stages.indexOf(teamData.stage || 'ideation');
    return ((currentIndex + 1) / stages.length) * 100;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cosmic cosmic-sparkle">
        <div className="text-center space-y-6 p-8 ufo-card rounded-xl">
          <div className="ufo-pulse">
            <Rocket className="h-12 w-12 text-primary mx-auto" />
          </div>
          <h2 className="text-2xl font-semibold cosmic-text">Loading Project...</h2>
        </div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <>
        <DashboardHeader 
          role="builder" 
          userName="Project Builder"
          onExit={onExit}
        />
        <div className="container mx-auto px-6 pb-6 space-y-6">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Project Found</h3>
              <p className="text-muted-foreground mb-4">
                You need to create a project through onboarding to access the Innovation Hub
              </p>
              <Button onClick={onExit} className="ufo-gradient">
                Return to Onboarding
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader 
        role="builder" 
        userName="Project Builder"
        onExit={onExit}
      />
      
      <div className="container mx-auto px-6 pb-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/20 ufo-pulse">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-glow">{teamData.name}</h1>
              <p className="text-muted-foreground">Innovation Hub - {teamData.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStageColor(teamData.stage || 'ideation')}>
              {teamData.stage || 'ideation'}
            </Badge>
            <div className="text-sm text-muted-foreground">
              {Math.round(getStageProgress())}% Complete
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Stage</p>
                  <p className="text-lg font-bold capitalize">{teamData.stage || 'ideation'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Team Members</p>
                  <p className="text-lg font-bold">{teamMembers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Recent Updates</p>
                  <p className="text-lg font-bold">{recentUpdates.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-lg font-bold">{Math.round(getStageProgress())}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur border-primary/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20">
              <Target className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="progress" className="data-[state=active]:bg-primary/20">
              <CheckCircle className="h-4 w-4 mr-2" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="lounge" className="data-[state=active]:bg-primary/20">
              <Users className="h-4 w-4 mr-2" />
              Builder's Lounge
            </TabsTrigger>
            <TabsTrigger value="oracle" className="data-[state=active]:bg-primary/20">
              <MessageSquare className="h-4 w-4 mr-2" />
              Oracle Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Project Overview Card */}
              <Card className="glow-border bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-primary" />
                    Project Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{teamData.name}</h3>
                    <p className="text-muted-foreground mb-4">
                      {teamData.description || 'No description available'}
                    </p>
                    {teamData.ai_summary && (
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <h4 className="font-medium text-sm text-primary mb-2">🛸 AI Project Summary:</h4>
                        <p className="text-sm text-muted-foreground">{teamData.ai_summary}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Badge className={getStageColor(teamData.stage || 'ideation')}>
                      Current Stage: {teamData.stage || 'ideation'}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Progress: {Math.round(getStageProgress())}%
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="glow-border bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentUpdates.length > 0 ? (
                    <div className="space-y-3">
                      {recentUpdates.slice(0, 5).map((update) => (
                        <div key={update.id} className="flex items-start gap-3 p-3 rounded-lg bg-background/30 border border-primary/10">
                          <div className="p-1 rounded-full bg-primary/20 mt-1">
                            <Calendar className="h-3 w-3 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{update.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {update.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(update.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No recent activity</p>
                      <p className="text-sm text-muted-foreground">Updates will appear here as you make progress</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progress">
            <ProgressTracker 
              team={teamData}
              updates={recentUpdates}
              userRole="builder"
              onStageUpdate={(newStage) => {
                // Update local state immediately
                setTeamData(prev => prev ? { ...prev, stage: newStage } : null);
                // Refresh team data from database
                refreshTeamData();
              }}
            />
          </TabsContent>

          <TabsContent value="lounge">
            {user?.id ? (
              <BuilderLounge userId={user.id} />
            ) : (
              <Card className="glow-border bg-card/50 backdrop-blur">
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
                  <p className="text-muted-foreground">
                    Please ensure you're logged in to access the Builder's Lounge
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="oracle">
            <SuperOracle 
              selectedRole="builder" 
              teamId={teamData.id}
              userId={user?.id}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};