import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { User, Brain, Target, Sparkles, Code, Palette, Briefcase, Search, Lightbulb, Heart, Users, Trophy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const USER_TYPES = [
  { id: 'builder', label: 'Builder / Innovator', icon: Lightbulb, color: 'bg-blue-500/20 text-blue-600' },
  { id: 'designer', label: 'Designer', icon: Palette, color: 'bg-pink-500/20 text-pink-600' },
  { id: 'engineer', label: 'Engineer / Developer', icon: Code, color: 'bg-green-500/20 text-green-600' },
  { id: 'researcher', label: 'Researcher / Academic', icon: Search, color: 'bg-purple-500/20 text-purple-600' },
  { id: 'mentor', label: 'Mentor / Advisor', icon: Users, color: 'bg-orange-500/20 text-orange-600' },
  { id: 'investor', label: 'Investor / Sponsor', icon: Trophy, color: 'bg-yellow-500/20 text-yellow-600' },
  { id: 'explorer', label: 'Curious Explorer', icon: Sparkles, color: 'bg-indigo-500/20 text-indigo-600' }
];

const SKILLS_LIST = [
  'Python', 'JavaScript', 'React', 'Node.js', 'UI Design', 'UX Research', 'Product Management',
  'Data Science', 'Machine Learning', 'Marketing', 'Sales', 'Business Development', 'Finance',
  'Content Writing', 'Blockchain', 'Mobile Development', 'DevOps', 'Cloud Computing', 'AI',
  'Graphic Design', 'Video Editing', 'Project Management', 'Leadership', 'Strategy', 'Research'
];

const MOTIVATIONS = [
  { id: 'launch', label: 'Launching my own project', icon: Target },
  { id: 'join', label: 'Joining an existing team', icon: Users },
  { id: 'collaborate', label: 'Finding people to collaborate with', icon: Heart },
  { id: 'learn', label: 'Learning and exploring', icon: Brain },
  { id: 'mentor', label: 'Mentoring and guiding', icon: User }
];

interface UserIdentityOnboardingProps {
  onComplete: (data: any) => void;
}

export const UserIdentityOnboarding = ({ onComplete }: UserIdentityOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, updateProfile } = useAuth();
  
  const [formData, setFormData] = useState({
    userTypes: [] as string[],
    skills: [] as string[],
    lookingForSkills: [] as string[],
    motivation: '',
    bio: ''
  });

  const [skillInput, setSkillInput] = useState('');
  const [lookingForInput, setLookingForInput] = useState('');

  const handleUserTypeToggle = (typeId: string) => {
    const current = formData.userTypes;
    if (current.includes(typeId)) {
      setFormData({ ...formData, userTypes: current.filter(t => t !== typeId) });
    } else if (current.length < 3) {
      setFormData({ ...formData, userTypes: [...current, typeId] });
    }
  };

  const handleSkillAdd = (skill: string, type: 'skills' | 'lookingForSkills') => {
    if (skill.trim()) {
      const current = formData[type];
      if (!current.includes(skill.trim())) {
        setFormData({ 
          ...formData, 
          [type]: [...current, skill.trim()] 
        });
      }
    }
  };

  const handleSkillRemove = (skill: string, type: 'skills' | 'lookingForSkills') => {
    setFormData({ 
      ...formData, 
      [type]: formData[type].filter(s => s !== skill) 
    });
  };

  const getFilteredSkills = (input: string, existingSkills: string[]) => {
    return SKILLS_LIST.filter(skill => 
      skill.toLowerCase().includes(input.toLowerCase()) && 
      !existingSkills.includes(skill)
    ).slice(0, 5);
  };

  const canProceedFromStep = (step: number) => {
    switch (step) {
      case 0: return formData.userTypes.length > 0;
      case 1: return formData.skills.length > 0;
      case 2: return formData.lookingForSkills.length > 0;
      case 3: return formData.motivation !== '';
      case 4: return true; // Bio is optional
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const userData = {
        user_types: formData.userTypes,
        skills: formData.skills,
        looking_for_skills: formData.lookingForSkills,
        motivation: formData.motivation,
        bio: formData.bio || null,
        onboarding_completed: true,
        role: 'unassigned' as const // Will be assigned based on their choice in hub
      };

      const { error } = await updateProfile(userData);
      if (error) throw error;

      toast({
        title: "Profile Created! 🎉",
        description: "Welcome to the Innovation Hub!"
      });

      onComplete(userData);
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete setup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <User className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-2xl font-bold">Who are you?</h3>
              <p className="text-muted-foreground">Select up to 3 that describe you best</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {USER_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.userTypes.includes(type.id);
                return (
                  <div
                    key={type.id}
                    onClick={() => handleUserTypeToggle(type.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${type.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-medium">{type.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <Brain className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-2xl font-bold">What are your skills?</h3>
              <p className="text-muted-foreground">Add skills you're strong in</p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Type a skill and press Enter..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSkillAdd(skillInput, 'skills');
                      setSkillInput('');
                    }
                  }}
                />
                {skillInput && (
                  <div className="absolute top-full left-0 right-0 bg-card border border-muted rounded-md mt-1 z-10">
                    {getFilteredSkills(skillInput, formData.skills).map((skill) => (
                      <div
                        key={skill}
                        onClick={() => {
                          handleSkillAdd(skill, 'skills');
                          setSkillInput('');
                        }}
                        className="p-2 hover:bg-muted cursor-pointer"
                      >
                        {skill}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleSkillRemove(skill, 'skills')}
                  >
                    {skill} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <Search className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-2xl font-bold">What skills are you looking for?</h3>
              <p className="text-muted-foreground">Skills you'd like in collaborators</p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <Input
                  value={lookingForInput}
                  onChange={(e) => setLookingForInput(e.target.value)}
                  placeholder="Type a skill and press Enter..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSkillAdd(lookingForInput, 'lookingForSkills');
                      setLookingForInput('');
                    }
                  }}
                />
                {lookingForInput && (
                  <div className="absolute top-full left-0 right-0 bg-card border border-muted rounded-md mt-1 z-10">
                    {getFilteredSkills(lookingForInput, formData.lookingForSkills).map((skill) => (
                      <div
                        key={skill}
                        onClick={() => {
                          handleSkillAdd(skill, 'lookingForSkills');
                          setLookingForInput('');
                        }}
                        className="p-2 hover:bg-muted cursor-pointer"
                      >
                        {skill}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {formData.lookingForSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => handleSkillRemove(skill, 'lookingForSkills')}
                  >
                    {skill} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <Target className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-2xl font-bold">What motivates you here?</h3>
              <p className="text-muted-foreground">Choose your main goal</p>
            </div>
            
            <div className="space-y-3">
              {MOTIVATIONS.map((motivation) => {
                const Icon = motivation.icon;
                const isSelected = formData.motivation === motivation.id;
                return (
                  <div
                    key={motivation.id}
                    onClick={() => setFormData({ ...formData, motivation: motivation.id })}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="font-medium">{motivation.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <Sparkles className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-2xl font-bold">Tell us about yourself</h3>
              <p className="text-muted-foreground">One sentence about you (optional, 140 characters max)</p>
            </div>
            
            <div className="space-y-2">
              <Textarea
                value={formData.bio}
                onChange={(e) => {
                  if (e.target.value.length <= 140) {
                    setFormData({ ...formData, bio: e.target.value });
                  }
                }}
                placeholder="I'm passionate about..."
                className="min-h-[100px]"
              />
              <div className="text-right text-sm text-muted-foreground">
                {formData.bio.length}/140
              </div>
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
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-glow mb-4">Welcome! 🚀</h1>
            <p className="text-lg text-muted-foreground">
              Let's get to know you in just a few quick steps
            </p>
          </div>

          <div className="mb-8">
            <div className="flex justify-center gap-2">
              {[0, 1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-2 w-12 rounded-full transition-all ${
                    step <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-8">
              {renderStep()}

              <div className="flex gap-4 mt-8">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    Back
                  </Button>
                )}
                <Button
                  onClick={currentStep === 4 ? handleComplete : handleNext}
                  disabled={!canProceedFromStep(currentStep) || isLoading}
                  className="flex-1 ufo-gradient"
                >
                  {isLoading ? "Saving..." : currentStep === 4 ? "Complete" : "Next"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};