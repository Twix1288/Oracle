import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "./DashboardHeader";
import { ProgressTracker } from "./ProgressTracker";
import { ProgressEntryManager } from "./ProgressEntryManager";
import { TeamProfileCard } from "./TeamProfileCard";
import { ConfirmDialog } from "./ConfirmDialog";
import { LoadingSpinner } from "./LoadingSpinner";
import { QueryBar } from "./QueryBar";
import { SuperOracle } from "./SuperOracle";
import { OnboardingFlow } from "./OnboardingFlow";
import { MessagingCenter } from "./MessagingCenter";
import { TeamRoom } from "./TeamRoom";
import { BuilderLounge } from "./BuilderLounge";
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
import { PieFiOverview } from "./PieFiOverview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface EnhancedBuilderDashboardProps {
  team: Team;
  builderName: string;
  members: Member[];
  updates: Update[];
  teamStatuses?: TeamStatus[];
  userStage?: 'ideation' | 'development' | 'testing' | 'launch' | 'growth';
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
  userStage,
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
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // For individual users, create a virtual team with their stage
  const userTeam = userStage ? {
    ...currentTeam,
    stage: userStage
  } : currentTeam;

  // Check if team needs onboarding (minimal description or no updates)
  useEffect(() => {
    const needsOnboarding = !team.description || team.description.length < 10 || updates.length === 0;
    setShowOnboarding(needsOnboarding);
  }, [team, updates]);

  const handleLeaveTeamClick = () => {
    setShowLeaveConfirm(true);
  };

  const confirmLeaveTeam = () => {
    onLeaveTeam();
    setShowLeaveConfirm(false);
  };

  // One-time: Ingest PieFi dashboard template removed as documents table doesn't exist

  const teamMembers = members.filter(member => member.team_id === currentTeam.id);
  const teamUpdates = updates.filter(update => update.team_id === currentTeam.id);
  const teamStatus = teamStatuses?.find(status => status.team_id === currentTeam.id);

  const handleOnboardingComplete = (updatedTeam: Team) => {
    setCurrentTeam(updatedTeam);
    setShowOnboarding(false);
  };

  const handleStageUpdate = async (newStage: TeamStage) => {
    // Update the team state for immediate UI feedback
    setCurrentTeam(prev => ({ ...prev, stage: newStage }));
    
    // Also update the user's individual stage in their profile
    try {
      // Persisting user stage in profile is disabled due to schema mismatch
      // Keep it UI-only for now
    } catch (error) {
      console.error('❌ Exception updating individual stage:', error);
    }
  };

  const [isPopulating, setIsPopulating] = useState(false);
  const [showJourneyDialog, setShowJourneyDialog] = useState(false);
  const [journeyText, setJourneyText] = useState("");
  const [journeySubmitting, setJourneySubmitting] = useState(false);

  const handlePopulateJourney = async () => {
    setShowJourneyDialog(true);
  };

  const handleJourneySubmit = async () => {
    if (!journeyText.trim()) {
      toast.message("Please add a brief progress note.");
      return;
    }
    try {
      setJourneySubmitting(true);
      setIsPopulating(true);
      const { data, error } = await supabase.functions.invoke('super-oracle', {
        body: { 
          type: 'journey',
          query: journeyText.trim(),
          role: 'builder', 
          teamId: currentTeam.id, 
          userId: builderName 
        }
      });
      if (error) throw error;

      const detected = data?.detected_stage as TeamStage | undefined;
      const feedback = (data?.feedback as string) || "";
      const summary = (data?.summary as string) || "";

      if (detected && detected !== currentTeam.stage) {
        setCurrentTeam(prev => ({ ...prev, stage: detected }));
        
        // Update the user's individual stage in their profile
          // UI-only stage sync (no profile update to avoid schema mismatch)
      }

      toast.success("Journey updated", { description: summary || feedback.slice(0, 120) });
      setActiveTab('progress');
      setShowJourneyDialog(false);
      setJourneyText("");
    } catch (e: any) {
      toast.error("Failed to update journey", { description: e?.message });
    } finally {
      setJourneySubmitting(false);
      setIsPopulating(false);
    }
  };
  // Show onboarding if needed
  if (showOnboarding) {
    return (
      <OnboardingFlow 
        team={currentTeam}
        builderName={builderName}
        role="builder"
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle">
      <DashboardHeader
        role="builder"
        userName={builderName}
        teamName={currentTeam.name}
        onExit={handleLeaveTeamClick}
      />
      
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Team Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <TeamProfileCard 
              team={currentTeam} 
              builderName={builderName}
              teamMemberCount={teamMembers.length}
              onLeaveTeam={handleLeaveTeamClick}
            />
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-glow fade-in-up">{currentTeam.name}</h1>
              <p className="text-lg readable-muted">{currentTeam.description || "No description available"}</p>
              <div className="flex items-center gap-4">
                <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1 font-medium">
                  Stage: {currentTeam.stage}
                </Badge>
                <Badge variant="outline" className="border-primary/20 px-3 py-1">
                  {teamMembers.length} members
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 glass-card border-primary/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-medium">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="progress" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-medium">
              <Target className="h-4 w-4 mr-2" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="oracle" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-medium">
              <Sparkles className="h-4 w-4 mr-2" />
              Oracle
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-medium">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="team-room" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-medium">
              <Users className="h-4 w-4 mr-2" />
              Team Room
            </TabsTrigger>
            <TabsTrigger value="lounge" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-medium">
              <Users className="h-4 w-4 mr-2" />
              Builder Lounge
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-medium">
              <Users className="h-4 w-4 mr-2" />
              Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <PieFiOverview 
              team={userTeam}
              builderName={builderName}
              updates={teamUpdates}
              onPopulateJourney={handlePopulateJourney}
              isPopulating={journeySubmitting}
            />

            <Dialog open={showJourneyDialog} onOpenChange={setShowJourneyDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update your journey</DialogTitle>
                  <DialogDescription>
                    Describe what you achieved and what you're working on. The AI will detect your stage and provide feedback.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Textarea
                    value={journeyText}
                    onChange={(e) => setJourneyText(e.target.value)}
                    placeholder="E.g. Shipped MVP auth, interviewed 3 mentors, now integrating messaging. Blocked by deployment issue."
                    rows={6}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowJourneyDialog(false)} disabled={journeySubmitting}>Cancel</Button>
                  <Button onClick={handleJourneySubmit} disabled={journeySubmitting} className="ufo-gradient">
                    {journeySubmitting ? 'Analyzing…' : 'Analyze & Update'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <ProgressTracker 
              team={userTeam}
              updates={teamUpdates}
              userRole="builder"
              onStageUpdate={handleStageUpdate}
            />
            <ProgressEntryManager 
              team={currentTeam} 
              userId={builderName} 
            />
          </TabsContent>

          <TabsContent value="oracle" className="space-y-6">
            <SuperOracle 
              selectedRole="builder"
              teamId={currentTeam.id}
            />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <MessagingCenter 
              userRole="builder"
              accessCode={builderName}
              teamId={currentTeam.id}
            />
          </TabsContent>

          <TabsContent value="team-room" className="space-y-6">
            <TeamRoom 
              teamId={currentTeam.id}
              teamName={currentTeam.name}
              userRole={"builder"}
              userId={builderName}
            />
          </TabsContent>

          <TabsContent value="lounge" className="space-y-6">
            <BuilderLounge userId={builderName} teamId={currentTeam.id} />
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
      
      <ConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        title="Leave Team Session"
        description="Are you sure you want to leave this team session? You'll need to authenticate again to rejoin."
        confirmText="Leave Team"
        cancelText="Stay"
        variant="destructive"
        onConfirm={confirmLeaveTeam}
      />
    </div>
  );
};