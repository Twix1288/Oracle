import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Rocket, 
  Target, 
  Users, 
  Globe, 
  Lock,
  Code,
  Palette,
  Brain,
  Briefcase,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PROJECT_STAGES = [
  { id: 'idea', label: 'Idea', icon: Brain },
  { id: 'prototype', label: 'Prototype', icon: Code },
  { id: 'mvp', label: 'MVP', icon: Rocket },
  { id: 'scaling', label: 'Scaling', icon: TrendingUp }
];

const PROBLEM_CATEGORIES = [
  'AI/ML', 'Climate', 'Health', 'Education', 'Fintech', 'Web3',
  'Gaming', 'SaaS', 'E-commerce', 'Social', 'Hardware', 'Biotech'
];

const SKILLS_NEEDED = [
  'Frontend', 'Backend', 'Mobile', 'UI/UX Design', 'Product Management',
  'Data Science', 'Marketing', 'Sales', 'Business Development', 'DevOps'
];

interface ProjectOnboardingProps {
  onComplete: (data: any) => void;
  onBack: () => void;
}

export const ProjectOnboarding = ({ onComplete, onBack }: ProjectOnboardingProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, updateProfile } = useAuth();
  
  const [formData, setFormData] = useState({
    projectName: '',
    problemDescription: '',
    problemCategory: [] as string[],
    stage: '',
    skillsNeeded: [] as string[],
    isPublic: true,
    collaborationStyle: 'flexible' as 'flexible' | 'structured'
  });

  const handleCategoryToggle = (category: string) => {
    const current = formData.problemCategory;
    if (current.includes(category)) {
      setFormData({ ...formData, problemCategory: current.filter(c => c !== category) });
    } else {
      setFormData({ ...formData, problemCategory: [...current, category] });
    }
  };

  const handleSkillToggle = (skill: string) => {
    const current = formData.skillsNeeded;
    if (current.includes(skill)) {
      setFormData({ ...formData, skillsNeeded: current.filter(s => s !== skill) });
    } else {
      setFormData({ ...formData, skillsNeeded: [...current, skill] });
    }
  };

  const canComplete = () => {
    return formData.projectName.trim() !== '' && 
           formData.problemDescription.trim() !== '' &&
           formData.problemCategory.length > 0 &&
           formData.stage !== '' &&
           formData.skillsNeeded.length > 0;
  };

  const handleComplete = async () => {
    if (!user?.id || !canComplete()) return;
    
    setIsLoading(true);
    try {
      // Generate access code
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: formData.projectName,
          description: formData.problemDescription,
          tags: [...formData.problemCategory, ...formData.skillsNeeded],
          stage: formData.stage as any
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Create access code
      const { error: codeError } = await supabase
        .from('access_codes')
        .insert({
          code: accessCode,
          team_id: team.id,
          team_name: formData.projectName,
          role: 'builder',
          generated_by: user.id,
          description: `Access code for ${formData.projectName}`,
          max_uses: 10
        });

      if (codeError) throw codeError;

      // Update user profile to be project owner/builder
      const { error: profileError } = await updateProfile({
        role: 'builder',
        team_id: team.id
      });

      if (profileError) throw profileError;

      // Add user as team member
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          name: user.user_metadata?.full_name || user.email || 'Project Owner',
          role: 'builder',
          team_id: team.id,
          user_id: user.id,
          assigned_by: user.id
        });

      if (memberError) throw memberError;

      toast({
        title: "Project Created! 🎉",
        description: "Your team is ready to go!"
      });

      onComplete({
        accessCode,
        teamName: formData.projectName,
        teamId: team.id,
        isProjectLead: true
      });
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-glow mb-4">Create Your Project 🚀</h1>
            <p className="text-muted-foreground">
              Tell us about your project to get started
            </p>
          </div>

          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-6 space-y-6">
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="project-name" className="text-sm font-medium">
                  Project Name *
                </Label>
                <Input
                  id="project-name"
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="Enter your project name..."
                />
              </div>

              {/* Problem Description */}
              <div className="space-y-2">
                <Label htmlFor="problem" className="text-sm font-medium">
                  What problem are you solving? *
                </Label>
                <Textarea
                  id="problem"
                  value={formData.problemDescription}
                  onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
                  placeholder="Describe the problem your project addresses..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Problem Category */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Problem Category *</Label>
                <div className="flex flex-wrap gap-2">
                  {PROBLEM_CATEGORIES.map((category) => {
                    const isSelected = formData.problemCategory.includes(category);
                    return (
                      <div
                        key={category}
                        onClick={() => handleCategoryToggle(category)}
                        className={`px-3 py-2 rounded-full border cursor-pointer transition-all text-sm ${
                          isSelected 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'border-muted hover:border-primary/50'
                        }`}
                      >
                        {category}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Project Stage */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Project Stage *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PROJECT_STAGES.map((stage) => {
                    const Icon = stage.icon;
                    const isSelected = formData.stage === stage.id;
                    return (
                      <div
                        key={stage.id}
                        onClick={() => setFormData({ ...formData, stage: stage.id })}
                        className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                          isSelected 
                            ? 'border-primary bg-primary/10' 
                            : 'border-muted hover:border-primary/50'
                        }`}
                      >
                        <Icon className="h-5 w-5 mx-auto mb-1 text-primary" />
                        <span className="text-sm font-medium">{stage.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Skills Needed */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Skills Needed *</Label>
                <div className="flex flex-wrap gap-2">
                  {SKILLS_NEEDED.map((skill) => {
                    const isSelected = formData.skillsNeeded.includes(skill);
                    return (
                      <div
                        key={skill}
                        onClick={() => handleSkillToggle(skill)}
                        className={`px-3 py-2 rounded-full border cursor-pointer transition-all text-sm ${
                          isSelected 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'border-muted hover:border-primary/50'
                        }`}
                      >
                        {skill}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  {formData.isPublic ? (
                    <Globe className="h-5 w-5 text-primary" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <Label htmlFor="visibility" className="font-medium">
                      {formData.isPublic ? 'Public Project' : 'Private Project'}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.isPublic 
                        ? 'Visible in guest tab and discoverable by others' 
                        : 'Only accessible via access code'
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  id="visibility"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-8">
                <Button variant="outline" onClick={onBack} className="flex-1">
                  Back to Hub
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={!canComplete() || isLoading}
                  className="flex-1 ufo-gradient"
                >
                  {isLoading ? "Creating Project..." : "Create Project"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};