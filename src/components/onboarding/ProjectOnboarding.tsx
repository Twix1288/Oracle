import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectOnboardingProps {
  userId: string;
  onComplete: (teamData: any) => void;
  onCancel: () => void;
}

export const ProjectOnboarding = ({ userId, onComplete, onCancel }: ProjectOnboardingProps) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    projectName: '',
    projectType: '',
    problemStatement: '',
    solutionApproach: '',
    targetAudience: '',
    skillsNeeded: [] as string[],
    techRequirements: [] as string[],
    teamSizeNeeded: 3,
    timelineMonths: 6
  });

  const projectTypes = [
    'Web Application', 'Mobile App', 'AI/ML Project', 'Blockchain/Web3',
    'SaaS Platform', 'E-commerce', 'Social Platform', 'Educational Tool',
    'Developer Tool', 'Gaming', 'IoT Solution', 'Data Analytics'
  ];

  const commonSkills = [
    'Frontend Development', 'Backend Development', 'UI/UX Design', 'Product Management',
    'Marketing', 'Data Science', 'DevOps', 'Mobile Development', 'AI/ML',
    'Blockchain', 'Business Strategy', 'Content Creation', 'SEO', 'Sales'
  ];

  const techOptions = [
    'React', 'Vue.js', 'Angular', 'Node.js', 'Python', 'Java', 'Go',
    'React Native', 'Flutter', 'Swift', 'Kotlin', 'PostgreSQL', 'MongoDB',
    'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'GraphQL', 'REST API'
  ];

  const addToArray = (value: string, field: 'skillsNeeded' | 'techRequirements') => {
    if (!formData[field].includes(value)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value]
      }));
    }
  };

  const removeFromArray = (value: string, field: 'skillsNeeded' | 'techRequirements') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(item => item !== value)
    }));
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      // Create team with project data
      const { data, error } = await supabase.rpc('create_team_with_project_data', {
        p_name: formData.projectName,
        p_description: `${formData.projectType} - ${formData.problemStatement}`,
        p_project_name: formData.projectName,
        p_project_description: formData.solutionApproach,
        p_tech_stack: formData.techRequirements,
        p_user_id: userId,
        p_problem_statement: formData.problemStatement,
        p_solution_approach: formData.solutionApproach,
        p_target_audience: formData.targetAudience,
        p_project_type: formData.projectType,
        p_skills_needed: formData.skillsNeeded,
        p_tech_requirements: formData.techRequirements,
        p_team_size_needed: formData.teamSizeNeeded,
        p_timeline_months: formData.timelineMonths
      });

      if (error) throw error;

      toast({
        title: "Team Created Successfully!",
        description: `Your team "${formData.projectName}" has been created successfully!`,
      });

      onComplete(data);
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.projectName.trim().length > 0 && formData.projectType !== '';
      case 2:
        return formData.problemStatement.trim().length > 0 && formData.targetAudience.trim().length > 0;
      case 3:
        return formData.solutionApproach.trim().length > 0;
      case 4:
        return formData.skillsNeeded.length > 0 && formData.techRequirements.length > 0;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="projectName" className="text-lg font-semibold">
                What's your project name?
              </Label>
              <Input
                id="projectName"
                placeholder="My Awesome Project"
                value={formData.projectName}
                onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-lg font-semibold">Project Type</Label>
              <Select
                value={formData.projectType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, projectType: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="problemStatement" className="text-lg font-semibold">
                What problem does your project solve?
              </Label>
              <Textarea
                id="problemStatement"
                placeholder="Describe the problem your project addresses..."
                value={formData.problemStatement}
                onChange={(e) => setFormData(prev => ({ ...prev, problemStatement: e.target.value }))}
                className="mt-2 min-h-24"
              />
            </div>

            <div>
              <Label htmlFor="targetAudience" className="text-lg font-semibold">
                Who is your target audience?
              </Label>
              <Input
                id="targetAudience"
                placeholder="Developers, Students, Small businesses, etc."
                value={formData.targetAudience}
                onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="solutionApproach" className="text-lg font-semibold">
                How will you solve this problem?
              </Label>
              <Textarea
                id="solutionApproach"
                placeholder="Describe your approach and solution strategy..."
                value={formData.solutionApproach}
                onChange={(e) => setFormData(prev => ({ ...prev, solutionApproach: e.target.value }))}
                className="mt-2 min-h-32"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold">Skills Needed</Label>
              <p className="text-sm text-muted-foreground mt-1">
                What skills are you looking for in team members?
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {commonSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant={formData.skillsNeeded.includes(skill) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => addToArray(skill, 'skillsNeeded')}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
              {formData.skillsNeeded.length > 0 && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {formData.skillsNeeded.map((skill) => (
                      <Badge key={skill} variant="default" className="gap-1">
                        {skill}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeFromArray(skill, 'skillsNeeded')}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-lg font-semibold">Tech Requirements</Label>
              <p className="text-sm text-muted-foreground mt-1">
                What technologies will you use?
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {techOptions.map((tech) => (
                  <Badge
                    key={tech}
                    variant={formData.techRequirements.includes(tech) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => addToArray(tech, 'techRequirements')}
                  >
                    {tech}
                  </Badge>
                ))}
              </div>
              {formData.techRequirements.length > 0 && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {formData.techRequirements.map((tech) => (
                      <Badge key={tech} variant="default" className="gap-1">
                        {tech}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeFromArray(tech, 'techRequirements')}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-semibold">Team Size Needed</Label>
                <Select
                  value={formData.teamSizeNeeded.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, teamSizeNeeded: parseInt(value) }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size} members
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-semibold">Timeline</Label>
                <Select
                  value={formData.timelineMonths.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, timelineMonths: parseInt(value) }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 6, 9, 12, 18, 24].map((months) => (
                      <SelectItem key={months} value={months.toString()}>
                        {months} months
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-cosmic-pattern opacity-20"></div>
      
      <Card className="w-full max-w-2xl relative z-10 bg-background/95 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-bold">Create Your Team</CardTitle>
          </div>
          <p className="text-muted-foreground">
            Step {step} of 4 - Tell us about your project
          </p>
          <div className="w-full bg-secondary rounded-full h-2 mt-4">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {renderStep()}

          <div className="flex justify-between mt-8">
            <div className="flex gap-2">
              {step === 1 && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={step === 1}
              >
                Back
              </Button>
            </div>
            
            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canProceed() || isLoading}
              >
                {isLoading ? 'Creating Team...' : 'Create Team'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};