import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code, Briefcase, Target, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateTeamAccessCode } from "@/utils/teamAccess";

const SKILLS = [
  { value: 'react', label: 'React', icon: '⚛️' },
  { value: 'node', label: 'Node.js', icon: '🟢' },
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'typescript', label: 'TypeScript', icon: '📘' },
  { value: 'aws', label: 'AWS', icon: '☁️' },
  { value: 'database', label: 'Databases', icon: '🗄️' },
  { value: 'mobile', label: 'Mobile Dev', icon: '📱' },
  { value: 'ui_ux', label: 'UI/UX', icon: '🎨' },
  { value: 'devops', label: 'DevOps', icon: '🔄' },
  { value: 'ai_ml', label: 'AI/ML', icon: '🤖' },
  { value: 'blockchain', label: 'Blockchain', icon: '⛓️' },
  { value: 'cybersecurity', label: 'Cybersecurity', icon: '🔒' },
  { value: 'data_analytics', label: 'Data Analytics', icon: '📊' },
  { value: 'game_dev', label: 'Game Development', icon: '🎮' },
  { value: 'iot', label: 'IoT', icon: '🌐' },
  { value: 'quantum', label: 'Quantum Computing', icon: '⚛️' }
];

const ROLES = [
  { id: 'builder', label: 'Builder', description: 'Join a team and build amazing products' },
  { id: 'mentor', label: 'Mentor', description: 'Guide and support builder teams' }
];

export const InitialOnboarding = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    skills: [] as string[],
    projectIdea: '',
    lookingFor: '',
    experience: '',
    role: '',
    selectedTeam: '',
    // Additional fields for Oracle context
    learningGoals: '',
    preferredTechStack: '',
    collaborationStyle: '',
    availability: '',
    mentorshipAreas: '',
    projectTimeline: '',
    targetAudience: '',
    successMetrics: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [availableTeams, setAvailableTeams] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const totalSteps = 6;
  const progress = (step / totalSteps) * 100;

  const handleNext = async () => {
    if (step === 3 && formData.role) {
      // Fetch available teams when role is selected
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });
      setAvailableTeams(teams || []);
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Create user profile with comprehensive data for Oracle
      const { data: profile, error: profileError } = await supabase
        .from('members')
        .insert({
          skills: formData.skills,
          project_idea: formData.projectIdea,
          looking_for: formData.lookingFor,
          experience: formData.experience,
          role: formData.role,
          team_id: formData.selectedTeam || null,
          // Additional Oracle context fields
          learning_goals: formData.learningGoals,
          preferred_tech_stack: formData.preferredTechStack,
          collaboration_style: formData.collaborationStyle,
          availability: formData.availability,
          mentorship_areas: formData.mentorshipAreas,
          project_timeline: formData.projectTimeline,
          target_audience: formData.targetAudience,
          success_metrics: formData.successMetrics
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Generate access code based on role and team
      const accessCode = formData.role === 'mentor' ? 'MENTOR2024' : 
                        formData.selectedTeam ? await generateTeamAccessCode(formData.selectedTeam) :
                        'BUILD2024';

      // Update profile with access code
      await supabase
        .from('members')
        .update({ access_code: accessCode })
        .eq('id', profile.id);

      toast({
        title: "🎉 Onboarding Complete!",
        description: `Your access code is: ${accessCode}. Your profile has been set up and the Oracle has been personalized for you.`
      });

      // Mark as completed and reload to show dashboard
      setIsCompleted(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                <Code className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-glow">What are your skills?</h3>
              <p className="text-muted-foreground text-lg">Select all that apply</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {SKILLS.map((skill) => (
                <div
                  key={skill.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    formData.skills.includes(skill.value)
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => {
                    const skills = formData.skills.includes(skill.value)
                      ? formData.skills.filter(s => s !== skill.value)
                      : [...formData.skills, skill.value];
                    setFormData({ ...formData, skills });
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{skill.icon}</span>
                    <span className="font-medium">{skill.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleNext}
              disabled={formData.skills.length === 0}
              className="w-full ufo-gradient"
            >
              Continue
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-glow">Tell us about your project</h3>
              <p className="text-muted-foreground text-lg">What do you want to build?</p>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Describe your project idea..."
                value={formData.projectIdea}
                onChange={(e) => setFormData({ ...formData, projectIdea: e.target.value })}
                className="min-h-[120px]"
              />

              <Textarea
                placeholder="What skills or resources are you looking for?"
                value={formData.lookingFor}
                onChange={(e) => setFormData({ ...formData, lookingFor: e.target.value })}
                className="min-h-[120px]"
              />

              <Input
                placeholder="Years of experience"
                type="number"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!formData.projectIdea || !formData.lookingFor || !formData.experience}
                className="flex-1 ufo-gradient"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-glow">Choose Your Role</h3>
              <p className="text-muted-foreground text-lg">How would you like to participate?</p>
            </div>

            <div className="space-y-3">
              {ROLES.map((role) => (
                <div
                  key={role.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.role === role.id
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => setFormData({ ...formData, role: role.id })}
                >
                  <h4 className="font-semibold">{role.label}</h4>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!formData.role}
                className="flex-1 ufo-gradient"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-glow">Select Your Team</h3>
              <p className="text-muted-foreground text-lg">
                {formData.role === 'mentor' 
                  ? "Choose the team you'll be mentoring"
                  : "Choose your team to join"}
              </p>
            </div>

            <div className="space-y-3">
              {availableTeams.map((team: any) => (
                <div
                  key={team.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.selectedTeam === team.id
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => setFormData({ ...formData, selectedTeam: team.id })}
                >
                  <h4 className="font-semibold">{team.name}</h4>
                  <p className="text-sm text-muted-foreground">{team.description}</p>
                  {formData.selectedTeam === team.id && (
                    <Badge className="mt-2">Selected</Badge>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!formData.selectedTeam}
                className="flex-1 ufo-gradient"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-glow">Project Details</h3>
              <p className="text-muted-foreground text-lg">Help us understand your project better</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">What are your learning goals?</label>
                <Textarea
                  placeholder="e.g., Master React hooks, Learn AWS deployment, Understand blockchain..."
                  value={formData.learningGoals}
                  onChange={(e) => setFormData({ ...formData, learningGoals: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Preferred Tech Stack</label>
                <Textarea
                  placeholder="e.g., React + Node.js + PostgreSQL, Python + FastAPI + MongoDB..."
                  value={formData.preferredTechStack}
                  onChange={(e) => setFormData({ ...formData, preferredTechStack: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Collaboration Style</label>
                <Select value={formData.collaborationStyle} onValueChange={(value) => setFormData({ ...formData, collaborationStyle: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hands_on">Hands-on coding together</SelectItem>
                    <SelectItem value="code_reviews">Code reviews and feedback</SelectItem>
                    <SelectItem value="pair_programming">Pair programming sessions</SelectItem>
                    <SelectItem value="mentorship">Regular mentorship meetings</SelectItem>
                    <SelectItem value="independent">Independent work with guidance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Weekly Availability</label>
                <Select value={formData.availability} onValueChange={(value) => setFormData({ ...formData, availability: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5_10_hours">5-10 hours</SelectItem>
                    <SelectItem value="10_20_hours">10-20 hours</SelectItem>
                    <SelectItem value="20_30_hours">20-30 hours</SelectItem>
                    <SelectItem value="30_plus_hours">30+ hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!formData.learningGoals || !formData.preferredTechStack || !formData.collaborationStyle || !formData.availability}
                className="flex-1 ufo-gradient"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                <Code className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-glow">Final Details</h3>
              <p className="text-muted-foreground text-lg">Almost done! Just a few more questions</p>
            </div>

            <div className="space-y-4">
              {formData.role === 'mentor' && (
                <div>
                  <label className="text-sm font-medium">What areas can you mentor in?</label>
                  <Textarea
                    placeholder="e.g., React development, Database design, DevOps practices, Business strategy..."
                    value={formData.mentorshipAreas}
                    onChange={(e) => setFormData({ ...formData, mentorshipAreas: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Project Timeline</label>
                <Select value={formData.projectTimeline} onValueChange={(value) => setFormData({ ...formData, projectTimeline: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1_3_months">1-3 months</SelectItem>
                    <SelectItem value="3_6_months">3-6 months</SelectItem>
                    <SelectItem value="6_12_months">6-12 months</SelectItem>
                    <SelectItem value="12_plus_months">12+ months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Target Audience</label>
                <Textarea
                  placeholder="e.g., Small businesses, Students, Developers, Healthcare providers..."
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Success Metrics</label>
                <Textarea
                  placeholder="e.g., User engagement, Revenue growth, Learning outcomes, Community impact..."
                  value={formData.successMetrics}
                  onChange={(e) => setFormData({ ...formData, successMetrics: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={isLoading || !formData.projectTimeline || !formData.targetAudience || !formData.successMetrics}
                className="flex-1 ufo-gradient"
              >
                {isLoading ? "Completing..." : "Complete & Get Access Code"}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Show completion state
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center space-y-6">
              <div className="p-6 rounded-full bg-green-500/20 w-fit mx-auto">
                <Code className="h-16 w-16 text-green-500" />
              </div>
              <h1 className="text-4xl font-bold text-glow">🎉 Onboarding Complete!</h1>
              <p className="text-xl text-muted-foreground">
                Your profile has been set up and the Oracle has been personalized for you.
              </p>
              <p className="text-lg text-primary">
                Redirecting to your dashboard...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-glow mb-4">Welcome to PieFi Oracle</h1>
            <p className="text-lg text-muted-foreground">
              Let's get to know you better
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-foreground">Step {step} of {totalSteps}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Content */}
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
