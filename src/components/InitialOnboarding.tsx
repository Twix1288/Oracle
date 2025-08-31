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
  { value: 'ai_ml', label: 'AI/ML', icon: '🤖' }
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
    selectedTeam: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [availableTeams, setAvailableTeams] = useState([]);

  const totalSteps = 4;
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
      // Create user profile
      const { data: profile, error: profileError } = await supabase
        .from('members')
        .insert({
          skills: formData.skills,
          project_idea: formData.projectIdea,
          looking_for: formData.lookingFor,
          experience: formData.experience,
          role: formData.role,
          team_id: formData.selectedTeam || null
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
        description: `Your access code is: ${accessCode}. Use this to log in.`
      });

      // Redirect to login
      window.location.href = '/login';
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
                onClick={handleComplete}
                disabled={isLoading || !formData.selectedTeam}
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
