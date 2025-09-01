import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "./DashboardHeader";
import { ProgressTracker } from "./ProgressTracker";
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

  // One-time: Ingest PieFi dashboard template into documents for Oracle reference
  useEffect(() => {
    const PIEFIDASHBOARD_TEXT = `Welcome back, Rishit Agnihotri!
first_build Stage

100% Confidence

Refresh Dashboard

Populate Journey
Profile
Sign Out

Overview

Dev Journey

Progress
Daily Check-in
Share your progress and get AI-powered coaching insights

What did you work on today? Any challenges or wins?
Quick reflection questions:

Whose specific pain point within Piefi/accelerators did I clarify or validate today that my oracle directly addresses?

What existing methods or workarounds did I learn about today that Piefi's users currently employ for the problem my oracle aims to solve?

What specific benefit or capability of my oracle did I identify today that would make a Piefi user truly eager to try it?
Click any question to add it to your check-in


Submit Update
Let's dig deeper:

Share more details about these points...
Share More
Skip for now
AI Coach
Personalized insights & challenges

It's great to see the technical foundation of your oracle site taking shape and that you're getting core commands working. You're building, which is essential for Stage 2. But let me challenge you on this: Are you building what people actually want, or what you think they want? What specific, painful problem do 'Create an update' or 'Send message' solve for your target B2B organizations, and how do you know this is a priority for them?
Current Stage

first_build

Recent Updates

1

Stage Progress

100%

Track

builder

, 
Welcome back, Rishit Agnihotri!
first_build Stage

100% Confidence

Refresh Dashboard

Populate Journey
Profile
Sign Out

Overview

Dev Journey

Progress
Your Development Journey
Enhanced with adaptive intelligence and personalized insights

Stage 2

Current Focus

3

Completed

100%

Confidence

🔄 Refresh Analysis
Recommended Next Actions
• Complete user_testing and prototype_validation in Stage 2

Stage 0: Stage 0: Spark
100% Complete
Readiness: 70%
2 milestones
70% ready

Stage 1: Stage 1: Formation
100% Complete
Readiness: 70%
2 milestones
70% ready

Stage 2: Stage 2: First Build
100% Complete
Readiness: 70%
2 milestones
70% ready

Prototype development and core feature implementation

Adaptive Analysis
• 2/2 required milestones completed

• Readiness score: 70% (based on prerequisites and progress)

• This is your current focus stage based on adaptive analysis

Your Milestone Achievements (2)
Mvp Designed
Approved
about 1 hour ago
Technical Challenges
Approved
about 1 hour ago
Available Milestones
User Testing
Describe your progress on user testing...
Submit Milestone
Prototype Validation
Describe your progress on prototype validation...
Submit Milestone
Next Steps
Focus on completing user testing to advance in this stage.

Stage 3: Stage 3: Ship
0% Complete
Readiness: 40%
40% ready

Stage 4: Stage 4: Traction
0% Complete
Readiness: 30%
30% ready

Stage 5: Stage 5: Real Company
0% Complete
Readiness: 24%
24% ready

View Traditional Stage Progression
, 
Welcome back, Rishit Agnihotri!
first_build Stage

100% Confidence

Refresh Dashboard

Populate Journey
Profile
Sign Out

Overview

Dev Journey

Progress
Comprehensive Project Dashboard
Professional investor presentation with detailed progress tracking

Refresh Data
My solution right
AI-Powered Investment Analysis Dashboard

Refresh AI Insights
Executive Summary
Problem Statement
Accelerators and similar innovation-driven organizations frequently encounter systemic challenges, including team disconnection, duplicated efforts, and inefficient knowledge sharing. These pervasive pain points lead to quantifiable negative impacts, hindering collaboration and progress within dynamic, fast-paced environments due to a lack of purpose-built, integrated solutions.
Solution Approach
The Piefi Oracle is an intelligent personal agent designed to optimize operations and foster collaboration within accelerator ecosystems. This comprehensive platform will offer core functionalities such as a centralized dashboard, an update and messaging system, and an AI-powered 'oracle' capable of executing commands for resource discovery, progress tracking, and expert connection. Leveraging the Lovable platform, the development prioritizes simplified backend operations and efficient code implementation to facilitate rapid scaling.
Unique Value Proposition
The Piefi Oracle's unique value proposition stems from its purpose-built design for the accelerator context, ensuring seamless integration and alignment with organizational workflows. It provides comprehensive data tracking and historical preservation, acting as a persistent institutional memory. This tailored approach fosters a collaborative and transparent environment, differentiating it from generic tools by offering a context-aware, intelligent solution that supports dynamic accelerator ecosystems.
Market Opportunity
The market opportunity within the accelerator ecosystem is substantial, driven by the pervasive pain points of disconnected teams, duplicated work, and inefficient knowledge sharing, which result in quantifiable negative impacts. Existing generic tools are insufficient for the unique demands of accelerators. The Piefi Oracle, beginning with Piefi as a strategic proving ground, targets a large addressable market by offering a purpose-built solution that not only resolves critical inefficiencies but also preserves invaluable historical data, establishing a clear competitive differentiation.
Key Metrics
80%
Viability Score
50%
Journey Complete
6
Milestones
75%
AI Confidence
Development Velocity
6/week
Consistency Score
20%
Milestone Achievements & Validation Evidence
AI Investment Analysis & Risk Assessment
Investment Readiness Score
35%
While the team demonstrates impressive execution velocity and milestone completion, the startup is at an extremely early stage regarding market validation and foundational technical architecture. The near-absence of user feedback and validation evidence, coupled with an internal definition of 'market traction,' indicates a high product-market fit risk. The complete lack of documented architectural decisions and a vague scalability plan represent critical technical vulnerabilities for future growth and stability. The low consistency score, despite high velocity, suggests potential operational instability. Investment at this stage would be highly speculative, primarily betting on the team's ability to pivot, validate the market, and simultaneously build out a robust technical foundation from scratch.

Key Strengths
• High execution velocity and strong milestone completion rate (6/6).
• Demonstrated learning velocity and adaptability to feedback.
• Stated commitment to maintaining high code quality standards.
Areas for Improvement
• Conduct comprehensive market validation to establish clear product-market fit and validate demand.
• Develop and document a robust technical architecture for scalability, maintainability, and future-proofing.
• Define clear, external market traction metrics and demonstrate tangible progress against them.
• Improve execution consistency to ensure sustainable development and predictability.
• Clearly articulate the competitive landscape and define a stronger, externally validated competitive advantage beyond internal 'Piefi' capabilities.
Market Opportunity
Market penetration potential is currently unproven and highly speculative. With only one piece of user feedback and one validation item, there is no demonstrated external demand or validated path to acquire users beyond a potential niche related to 'Piefi'. The internal definition of 'market traction' further indicates a lack of external market validation. Significant market validation efforts are required before any meaningful penetration can be projected.

Competitive Advantage
Technical feasibility assessment shows developingdifferentiation potential. AI confidence in execution suggestsemerging competitive positioning.

AI Risk Assessment
Medium
Execution Risk
70% confidence
High
Market Risk
95% confidence
High
Technical Risk
90% confidence
Execution: The startup demonstrates high development velocity (6 milestones/week) and has successfully completed all 6 planned milestones, indicating strong initial execution capability. However, the very low Consistency Score (20%) is a significant concern, suggesting that this high velocity may be sporadic, unsustainable, or achieved through inconsistent efforts. While high execution is present, its predictability and long-term sustainability are questionable due to the inconsistency.
Market: Market validation is critically low, with only 1 piece of user feedback and 1 item of validation evidence. The definition of 'market traction' is internal ('how much capability the oracle has') rather than based on external user adoption, engagement, or revenue, indicating a lack of proven product-market fit. The competitive advantage is described in terms of internal product capabilities related to 'Piefi's history and projects,' which suggests a niche focus without clear articulation of broader market differentiation or a compelling solution to a widespread problem. This indicates substantial uncertainty regarding market demand and adoption.
Technical: The complete absence of documented 'Architecture Decisions' for a product at 50% completion is a major red flag. This lack of foundational architectural planning can lead to significant technical debt, re-platforming needs, and challenges in achieving true scalability and maintainability, despite claims of 'maintaining high code quality standards' in individual components. The scalability plan, which heavily relies on 'Lovable' to 'simpliefied' coding and backend, lacks specific technical detail on how large-scale requirements will be met beyond generic simplification, raising concerns about the team's deep architectural expertise and strategic planning for growth.
AI Growth Potential Prediction
The startup possesses a team capable of rapid internal development, which is a key asset for iteration. However, its growth potential is severely constrained by critical gaps in market validation and foundational technical architecture. Without a clear product-market fit, a robust and documented scalable architecture, and a more consistent execution pattern, achieving significant market penetration or sustainable growth will be extremely challenging. Growth is highly speculative and contingent on successfully addressing these fundamental weaknesses.

Scaling Capability: Operational scaling capability is questionable due to the very low Consistency Score (20%), which could hinder sustained growth efforts. Technical scaling capability is also a significant concern due to the complete lack of documented architectural decisions and a vague scalability plan that heavily relies on an external tool without deep strategic insight. While the team shows high development velocity, scaling requires robust, planned, and stable foundations which appear to be missing.
Trajectory Analysis: The current trajectory shows strong internal development velocity and milestone completion, indicating a capable execution team. However, this progress is largely product-centric and lacks external market validation. The 'Project Viability Score: 80%' and 'AI Confidence Average: 75%' are positive internal indicators, but the low consistency score (20%) threatens the sustainability of the current velocity. The trajectory is currently high-risk due to the significant disconnect between internal development speed and external market validation.
AI Analysis Confidence
85%
Market Validation & Traction
Technical Progress & Architecture
Investment Opportunity & Funding Needs`;

    const run = async () => {
      const { data: existing, error: checkError } = await supabase
        .from('documents')
        .select('id')
        .contains('metadata', { slug: 'piefi_dashboard_template_v1' })
        .limit(1)
        .maybeSingle();
      if (checkError) {
        // silently ignore
      }
      if (!existing) {
        await supabase.from('documents').insert({
          content: PIEFIDASHBOARD_TEXT,
          source_type: 'dashboard_template',
          metadata: { slug: 'piefi_dashboard_template_v1', title: 'PieFi Dashboard Template' },
        });
      }
    };
    run();
  }, []);

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
      const { error } = await supabase
        .from('profiles')
        .update({ individual_stage: newStage })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);
      
      if (error) {
        console.error('❌ Error updating individual stage:', error);
        toast.error('Failed to update your individual stage');
      } else {
        console.log('✅ Individual stage updated to:', newStage);
      }
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
      const { data, error } = await supabase.functions.invoke('journey-assistant', {
        body: { teamId: currentTeam.id, text: journeyText.trim(), role: 'builder', userId: builderName }
      });
      if (error) throw error;

      const detected = data?.detected_stage as TeamStage | undefined;
      const feedback = (data?.feedback as string) || "";
      const summary = (data?.summary as string) || "";

      if (detected && detected !== currentTeam.stage) {
        setCurrentTeam(prev => ({ ...prev, stage: detected }));
        
        // Update the user's individual stage in their profile
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ individual_stage: detected })
            .eq('id', (await supabase.auth.getUser()).data.user?.id);
          
          if (error) {
            console.error('❌ Error updating individual stage from AI:', error);
          } else {
            console.log('✅ Individual stage updated by AI to:', detected);
          }
        } catch (error) {
          console.error('❌ Exception updating individual stage from AI:', error);
        }
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
            <BuilderLounge userId={builderName} />
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