import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { User, Brain, Search, Sparkles, Code, Palette, Briefcase, Lightbulb, Heart, Users, Trophy, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const USER_TYPES = [
  { id: 'builder', label: 'Builder / Innovator', icon: Lightbulb },
  { id: 'designer', label: 'Designer', icon: Palette },
  { id: 'engineer', label: 'Engineer / Developer', icon: Code },
  { id: 'researcher', label: 'Researcher / Academic', icon: Search },
  { id: 'mentor', label: 'Mentor / Advisor', icon: Users },
  { id: 'investor', label: 'Investor / Sponsor', icon: Trophy },
  { id: 'explorer', label: 'Curious Explorer', icon: Sparkles }
];

const SKILLS_LIST = [
  'Python', 'JavaScript', 'React', 'Node.js', 'UI Design', 'UX Research', 'Product Management',
  'Data Science', 'Machine Learning', 'Marketing', 'Sales', 'Business Development', 'Finance',
  'Content Writing', 'Blockchain', 'Mobile Development', 'DevOps', 'Cloud Computing', 'AI',
  'Graphic Design', 'Video Editing', 'Project Management', 'Leadership', 'Strategy', 'Research'
];

const INDUSTRIES = [
  'AI/ML', 'Climate', 'Fintech', 'Health', 'Education', 'Web3', 'Gaming', 'SaaS', 
  'E-commerce', 'Social', 'Hardware', 'Biotech', 'Space', 'Media', 'Real Estate'
];

interface UserIdentityOnboardingProps {
  onComplete: (data: any) => void;
}

export const UserIdentityOnboarding = ({ onComplete }: UserIdentityOnboardingProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, updateProfile } = useAuth();
  
  const [formData, setFormData] = useState({
    userTypes: [] as string[],
    skills: [] as string[],
    lookingForSkills: [] as string[],
    industries: [] as string[],
    bio: ''
  });

  const [skillInput, setSkillInput] = useState('');
  const [lookingForInput, setLookingForInput] = useState('');

  const handleUserTypeToggle = (typeId: string) => {
    const current = formData.userTypes;
    if (current.includes(typeId)) {
      setFormData({ ...formData, userTypes: current.filter(t => t !== typeId) });
    } else if (current.length < 2) {
      setFormData({ ...formData, userTypes: [...current, typeId] });
    }
  };

  const handleIndustryToggle = (industry: string) => {
    const current = formData.industries;
    if (current.includes(industry)) {
      setFormData({ ...formData, industries: current.filter(i => i !== industry) });
    } else {
      setFormData({ ...formData, industries: [...current, industry] });
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

  const canComplete = () => {
    return formData.userTypes.length > 0 && 
           formData.skills.length > 0 && 
           formData.lookingForSkills.length > 0 &&
           formData.industries.length > 0;
  };

  const handleComplete = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const userData = {
        user_types: formData.userTypes,
        skills: formData.skills,
        looking_for_skills: formData.lookingForSkills,
        interests: formData.industries,
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

  const renderContent = () => {
    return (
      <div className="space-y-8">
        {/* Step 1: Who are you? */}
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <User className="h-8 w-8 text-primary mx-auto" />
            <h3 className="text-xl font-semibold">Who are you?</h3>
            <p className="text-sm text-muted-foreground">Select up to 2 that describe you best</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {USER_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.userTypes.includes(type.id);
              return (
                <div
                  key={type.id}
                  onClick={() => handleUserTypeToggle(type.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all text-sm ${
                    isSelected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{type.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Your skills */}
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <Brain className="h-8 w-8 text-primary mx-auto" />
            <h3 className="text-xl font-semibold">What are your skills?</h3>
            <p className="text-sm text-muted-foreground">Add skills you're strong in</p>
          </div>
          
          <div className="space-y-3">
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
                      className="p-2 hover:bg-muted cursor-pointer text-sm"
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
                  className="cursor-pointer text-xs"
                  onClick={() => handleSkillRemove(skill, 'skills')}
                >
                  {skill} ×
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Step 3: Looking for skills */}
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <Search className="h-8 w-8 text-primary mx-auto" />
            <h3 className="text-xl font-semibold">What skills are you looking for?</h3>
            <p className="text-sm text-muted-foreground">Skills you'd like in collaborators</p>
          </div>
          
          <div className="space-y-3">
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
                      className="p-2 hover:bg-muted cursor-pointer text-sm"
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
                  className="cursor-pointer text-xs"
                  onClick={() => handleSkillRemove(skill, 'lookingForSkills')}
                >
                  {skill} ×
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Step 4: Industries & Interests */}
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <Briefcase className="h-8 w-8 text-primary mx-auto" />
            <h3 className="text-xl font-semibold">Industries & Interests</h3>
            <p className="text-sm text-muted-foreground">Select areas you're interested in</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((industry) => {
              const isSelected = formData.industries.includes(industry);
              return (
                <div
                  key={industry}
                  onClick={() => handleIndustryToggle(industry)}
                  className={`px-3 py-2 rounded-full border cursor-pointer transition-all text-sm ${
                    isSelected 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  {industry}
                </div>
              );
            })}
          </div>
        </div>

        {/* Optional bio */}
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <Sparkles className="h-8 w-8 text-primary mx-auto" />
            <h3 className="text-xl font-semibold">About You (Optional)</h3>
            <p className="text-sm text-muted-foreground">One sentence about yourself (140 characters max)</p>
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
              className="min-h-[80px]"
            />
            <div className="text-right text-xs text-muted-foreground">
              {formData.bio.length}/140
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-glow mb-4">Welcome! 🚀</h1>
            <p className="text-muted-foreground">
              Let's create your profile in 4 quick steps
            </p>
          </div>

          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              {renderContent()}

              <div className="flex justify-between items-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Set role as guest and skip full onboarding
                    onComplete({ 
                      user_types: ['explorer'], 
                      skills: [], 
                      looking_for_skills: [], 
                      interests: [],
                      bio: '',
                      onboarding_completed: false, // Keep as false for guest
                      role: 'guest'
                    });
                  }}
                  className="px-6"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Continue as Guest
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={!canComplete() || isLoading}
                  className="ufo-gradient px-8"
                >
                  {isLoading ? "Creating Profile..." : "Complete Profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};