import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Target, Lightbulb, Users, Rocket, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "./BackButton";
import type { Team, TeamStage } from "@/types/oracle";

interface OnboardingFlowProps {
  team?: Team;
  onComplete: (updatedTeam: Team) => void;
  builderName: string;
  role: 'builder' | 'mentor' | 'lead' | 'guest';
  accessCode?: string;
}

const stageIcons = {
  ideation: Lightbulb,
  development: Target,
  testing: Users,
  launch: Rocket,
  growth: TrendingUp
};

const stageInfo = {
  ideation: {
    title: "🧠 Brainstorm",
    description: "Define your idea and validate the concept",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20"
  },
  development: {
    title: "🛠 Prototype Creation", 
    description: "Build your MVP and core features",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20"
  },
  testing: {
    title: "🧪 Final Product",
    description: "Test, refine, and polish your product",
    color: "bg-green-500/10 text-green-400 border-green-500/20"
  },
  launch: {
    title: "🚀 Marketing",
    description: "Prepare for launch and user acquisition",
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20"
  },
  growth: {
    title: "📈 Real Company",
    description: "Scale and grow your business",
    color: "bg-pink-500/10 text-pink-400 border-pink-500/20"
  }
};

export const OnboardingFlow = ({ team, onComplete, builderName, role, accessCode }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | undefined>(team);
  
  const [formData, setFormData] = useState({
    projectGoal: "",
    currentStage: team?.stage || 'ideation',
    mentorshipNeeds: "",
    description: team?.description || "",
    accessCode: accessCode || ""
  });

  // Fetch available teams for selection
  useEffect(() => {
    const fetchTeams = async () => {
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (teams) {
        setAvailableTeams(teams);
      }
    };

    if (role === 'mentor' || role === 'builder') {
      fetchTeams();
    }
  }, [role]);

  const totalSteps = (role === 'mentor' || role === 'builder') ? 5 : 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      let teamId = selectedTeam?.id || team?.id;
      let updatedTeam;

      if (role === 'builder' || role === 'mentor') {
        // Update user's team assignment
        const { error: memberError } = await supabase
          .from('members')
          .update({ team_id: teamId })
          .eq('name', builderName);

        if (memberError) throw memberError;

        if (role === 'mentor') {
          // Update team's mentor assignment
          const { error: mentorError } = await supabase
            .from('teams')
            .update({ assigned_mentor_id: teamId })
            .eq('id', teamId);

          if (mentorError) throw mentorError;
        }
      }

      // Update team with onboarding data
      const { data: teamData, error } = await supabase
        .from('teams')
        .update({
          description: formData.description || `${formData.projectGoal} | Stage: ${stageInfo[formData.currentStage as TeamStage].title}`,
          stage: formData.currentStage as TeamStage,
          tags: [formData.currentStage, 'onboarded']
        })
        .eq('id', teamId)
        .select()
        .single();

      if (error) throw error;
      updatedTeam = teamData;

      // Create comprehensive initial progress update
      await supabase.from('updates').insert({
        team_id: teamId,
        content: `🎯 Project Goal: ${formData.projectGoal}\n🚀 Current Stage: ${stageInfo[formData.currentStage as TeamStage].title}\n🧠 Mentorship Needs: ${formData.mentorshipNeeds}\n\nTeam onboarded by: ${builderName} (${role})`,
        type: 'milestone',
        created_by: builderName
      });

      // Create initial team status
      await supabase.from('team_status').insert({
        team_id: teamId,
        current_status: `Team onboarded! Currently in ${stageInfo[formData.currentStage as TeamStage].title} stage`,
        pending_actions: [`Complete ${stageInfo[formData.currentStage as TeamStage].description.toLowerCase()}`]
      });

      toast({
        title: "🛸 Onboarding Complete!",
        description: role === 'mentor' 
          ? "You have been assigned as the team's mentor."
          : role === 'builder'
          ? "You have been added to the team."
          : "The Oracle has successfully integrated your team into the program."
      });

      onComplete(updatedTeam);
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: "Onboarding Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateAccessCode = async (code: string) => {
    if (!code.trim()) return false;

    // Check if it's a master access code
    if (code === 'BUILD2024' && role === 'builder') return true;
    if (code === 'MENTOR2024' && role === 'mentor') return true;
    if (code === 'LEAD2024' && role === 'lead') return true;

    // Check if it's a team access code
    const { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('access_code', code)
      .single();

    return !!team;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        // Access code validation step for mentors and builders
        if (role === 'mentor' || role === 'builder') {
          return (
            <div className="space-y-6 fade-in-up">
              <div className="text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-glow">Enter Your Access Code</h3>
                <p className="text-muted-foreground text-lg">
                  {role === 'mentor' 
                    ? "Enter your mentor access code to join the program"
                    : "Enter your team's access code to join"}
                </p>
              </div>
              
              <div className="space-y-4">
                <label className="text-sm font-medium high-contrast-text">Access Code</label>
                <Input
                  placeholder="Enter your access code..."
                  value={formData.accessCode}
                  onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                  className="professional-input text-center text-lg tracking-wider"
                />
              </div>

              <Button 
                onClick={async () => {
                  const isValid = await validateAccessCode(formData.accessCode);
                  if (isValid) {
                    handleNext();
                  } else {
                    toast({
                      title: "Invalid Access Code",
                      description: "Please check your access code and try again.",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={!formData.accessCode.trim()}
                className="w-full ufo-gradient hover:opacity-90 py-3 text-lg font-semibold"
              >
                Verify Access Code
              </Button>
            </div>
          );
        }

        // For other roles, proceed with project goal
        return (
          <div className="space-y-6 fade-in-up">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-glow">What do you want to achieve?</h3>
              <p className="text-muted-foreground text-lg">Tell the Oracle about your project vision and goals.</p>
            </div>
            
            <div className="space-y-4">
              <label className="text-sm font-medium high-contrast-text">Project Goal</label>
              <Textarea
                placeholder="Describe what you want to build and achieve with your project..."
                value={formData.projectGoal}
                onChange={(e) => setFormData({ ...formData, projectGoal: e.target.value })}
                className="min-h-[120px] professional-input"
              />
            </div>

            <Button 
              onClick={handleNext} 
              disabled={!formData.projectGoal.trim()}
              className="w-full ufo-gradient hover:opacity-90 py-3 text-lg font-semibold"
            >
              Continue to Development Stage
            </Button>
          </div>
        );

      case 2:
        // Team selection step for mentors and builders
        if ((role === 'mentor' || role === 'builder') && !selectedTeam) {
          return (
            <div className="space-y-6 fade-in-up">
              <div className="text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-glow">Select Your Team</h3>
                <p className="text-muted-foreground text-lg">
                  {role === 'mentor' 
                    ? "Choose the team you'll be mentoring"
                    : "Choose your team to join"}
                </p>
              </div>
              
              <div className="space-y-4">
                {availableTeams.map((team) => (
                  <Card
                    key={team.id}
                    className={`cursor-pointer transition-all interactive-card glass-card ${
                      selectedTeam?.id === team.id 
                        ? 'glow-border border-primary/40 bg-primary/5' 
                        : 'hover:glow-border'
                    }`}
                    onClick={() => setSelectedTeam(team)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${stageInfo[team.stage || 'ideation'].color}`}>
                          {stageIcons[team.stage || 'ideation']({ className: "h-5 w-5" })}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold high-contrast-text">{team.name}</h4>
                          <p className="text-sm readable-muted">{team.description || 'No description yet'}</p>
                        </div>
                        {selectedTeam?.id === team.id && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 font-medium">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {availableTeams.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No teams available for selection. Please contact program leadership.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <BackButton 
                  onClick={handleBack}
                  text="Back"
                  className="flex-1 mb-0"
                />
                <Button 
                  onClick={handleNext} 
                  disabled={!selectedTeam}
                  className="flex-1 ufo-gradient hover:opacity-90 font-semibold"
                >
                  Continue
                </Button>
              </div>
            </div>
          );
        }

        // For other roles or if team is already selected, proceed with project goal
        return (
          <div className="space-y-6 fade-in-up">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-glow">What do you want to achieve?</h3>
              <p className="text-muted-foreground text-lg">Tell the Oracle about your project vision and goals.</p>
            </div>
            
            <div className="space-y-4">
              <label className="text-sm font-medium high-contrast-text">Project Goal</label>
              <Textarea
                placeholder="Describe what you want to build and achieve with your project..."
                value={formData.projectGoal}
                onChange={(e) => setFormData({ ...formData, projectGoal: e.target.value })}
                className="min-h-[120px] professional-input"
              />
            </div>

            <Button 
              onClick={handleNext} 
              disabled={!formData.projectGoal.trim()}
              className="w-full ufo-gradient hover:opacity-90 py-3 text-lg font-semibold"
            >
              Continue to Development Stage
            </Button>
          </div>
        );



      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-glow">What mentorship do you need?</h3>
              <p className="text-muted-foreground">Help the Oracle connect you with the right guidance.</p>
            </div>
            
            <div className="space-y-4">
              <label className="text-sm font-medium text-foreground">Mentorship & Support Needs</label>
              <Textarea
                placeholder="What areas do you need help with? (e.g., technical guidance, business strategy, user research, funding...)"
                value={formData.mentorshipNeeds}
                onChange={(e) => setFormData({ ...formData, mentorshipNeeds: e.target.value })}
                className="min-h-[120px] bg-background/50 border-primary/20 focus:border-primary/50"
              />
            </div>

            <div className="flex gap-3">
              <BackButton 
                onClick={handleBack}
                text="Back"
                className="flex-1 mb-0"
              />
              <Button 
                onClick={handleNext} 
                disabled={!formData.mentorshipNeeds.trim()}
                className="flex-1 ufo-gradient hover:opacity-90"
              >
                Continue to Summary
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-glow">Ready to join the program!</h3>
              <p className="text-muted-foreground">Review your information before the Oracle completes integration.</p>
            </div>

            <Card className="glow-border bg-card/50">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-primary mb-2">🎯 Project Goal</h4>
                  <p className="text-sm text-muted-foreground">{formData.projectGoal}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary mb-2">🚀 Current Stage</h4>
                  <Badge className={stageInfo[formData.currentStage as TeamStage].color}>
                    {stageInfo[formData.currentStage as TeamStage].title}
                  </Badge>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary mb-2">🧠 Mentorship Needs</h4>
                  <p className="text-sm text-muted-foreground">{formData.mentorshipNeeds}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Team Description (Optional)</label>
              <Input
                placeholder="Brief description of your team/project..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-background/50 border-primary/20 focus:border-primary/50"
              />
            </div>

            <div className="flex gap-3">
              <BackButton 
                onClick={handleBack}
                text="Back"
                className="flex-1 mb-0"
              />
              <Button 
                onClick={handleComplete} 
                disabled={isLoading}
                className="flex-1 ufo-gradient hover:opacity-90"
              >
                {isLoading ? "Integrating..." : "🛸 Join the Program"}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-glow mb-4">Welcome to PieFi Oracle</h1>
            <p className="text-lg text-muted-foreground">
              Let's integrate <span className="text-primary font-semibold">{team.name}</span> into the accelerator program
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-foreground">Step {currentStep} of {totalSteps}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-8">
              {renderStep()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};