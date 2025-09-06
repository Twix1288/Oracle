import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Rocket, Target, Users, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProjectOnboardingProps {
  onComplete: (projectData: any) => void;
  onBack: () => void;
}

interface ProjectData {
  name: string;
  description: string;
  problemStatement: string;
  solutionApproach: string;
  targetAudience: string;
  projectType: string;
  techStack: string[];
  skillsNeeded: string[];
  teamSizeNeeded: number;
  timelineMonths: number;
  marketResearch: string;
  competitiveAdvantage: string;
  successMetrics: string;
  mentorshipAreas: string;
}

const projectTypes = [
  'Web Application', 'Mobile App', 'AI/ML Platform', 'E-commerce', 
  'SaaS Product', 'API/Backend', 'Game', 'Educational Tool', 'Other'
];

const techOptions = [
  'React', 'Node.js', 'Python', 'TypeScript', 'JavaScript', 'Next.js',
  'Express', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'GraphQL',
  'React Native', 'Flutter', 'Vue.js', 'Angular', 'Django', 'FastAPI'
];

const skillOptions = [
  'frontend', 'backend', 'fullstack', 'ui_ux', 'devops', 'mobile',
  'data', 'ai_ml', 'blockchain', 'security', 'marketing', 'business'
];

export const ProjectOnboarding = ({ onComplete, onBack }: ProjectOnboardingProps) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [projectData, setProjectData] = useState<ProjectData>({
    name: '',
    description: '',
    problemStatement: '',
    solutionApproach: '',
    targetAudience: '',
    projectType: '',
    techStack: [],
    skillsNeeded: [],
    teamSizeNeeded: 3,
    timelineMonths: 6,
    marketResearch: '',
    competitiveAdvantage: '',
    successMetrics: '',
    mentorshipAreas: ''
  });
  const { toast } = useToast();

  const handleInputChange = (field: keyof ProjectData, value: any) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'techStack' | 'skillsNeeded', item: string) => {
    setProjectData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create team with comprehensive project data
      const { data, error } = await supabase.rpc('create_team_with_project_data', {
        p_name: projectData.name,
        p_description: projectData.description,
        p_project_name: projectData.name,
        p_project_description: projectData.description,
        p_tech_stack: projectData.techStack,
        p_user_id: user.id,
        p_problem_statement: projectData.problemStatement,
        p_solution_approach: projectData.solutionApproach,
        p_target_audience: projectData.targetAudience,
        p_project_type: projectData.projectType,
        p_skills_needed: projectData.skillsNeeded,
        p_tech_requirements: projectData.techStack,
        p_team_size_needed: projectData.teamSizeNeeded,
        p_timeline_months: projectData.timelineMonths
      });

      if (error) throw error;

      const result = data as any;
      // Update team with additional fields
      if (result?.team?.id) {
        await supabase
          .from('teams')
          .update({
            market_research: projectData.marketResearch,
            competitive_advantage: projectData.competitiveAdvantage,
            success_metrics: projectData.successMetrics,
            mentorship_areas: projectData.mentorshipAreas,
            team_creator_id: user.id,
            seeking_collaborators: projectData.teamSizeNeeded > 1
          })
          .eq('id', result.team.id);
      }

      toast({
        title: "Project Created Successfully!",
        description: `Your project "${projectData.name}" is now live with access code: ${result.team.access_code}`,
      });

      onComplete({
        team: result.team,
        member: result.member,
        projectData
      });

    } catch (error) {
      console.error('Project creation error:', error);
      toast({
        title: "Error Creating Project",
        description: error.message || "Failed to create project. Please try again.",
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
            <div className="flex items-center gap-2 mb-4">
              <Rocket className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Project Basics</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., PieFi Analytics Dashboard"
                  value={projectData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Project Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your project..."
                  value={projectData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="projectType">Project Type *</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {projectTypes.map((type) => (
                    <Badge
                      key={type}
                      variant={projectData.projectType === type ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleInputChange('projectType', type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Problem & Solution</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="problemStatement">Problem Statement *</Label>
                <Textarea
                  id="problemStatement"
                  placeholder="What problem does your project solve?"
                  value={projectData.problemStatement}
                  onChange={(e) => handleInputChange('problemStatement', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="solutionApproach">Solution Approach *</Label>
                <Textarea
                  id="solutionApproach"
                  placeholder="How will you solve this problem?"
                  value={projectData.solutionApproach}
                  onChange={(e) => handleInputChange('solutionApproach', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="targetAudience">Target Audience *</Label>
                <Input
                  id="targetAudience"
                  placeholder="e.g., Small business owners, Students, Developers"
                  value={projectData.targetAudience}
                  onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Team & Tech Requirements</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Tech Stack</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {techOptions.map((tech) => (
                    <Badge
                      key={tech}
                      variant={projectData.techStack.includes(tech) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('techStack', tech)}
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Skills Needed</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {skillOptions.map((skill) => (
                    <Badge
                      key={skill}
                      variant={projectData.skillsNeeded.includes(skill) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('skillsNeeded', skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="teamSize">Team Size Needed</Label>
                  <Input
                    id="teamSize"
                    type="number"
                    min="1"
                    max="10"
                    value={projectData.teamSizeNeeded}
                    onChange={(e) => handleInputChange('teamSizeNeeded', parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="timeline">Timeline (months)</Label>
                  <Input
                    id="timeline"
                    type="number"
                    min="1"
                    max="24"
                    value={projectData.timelineMonths}
                    onChange={(e) => handleInputChange('timelineMonths', parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Strategy & Goals</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="marketResearch">Market Research</Label>
                <Textarea
                  id="marketResearch"
                  placeholder="What research have you done? Market size, competitors, etc."
                  value={projectData.marketResearch}
                  onChange={(e) => handleInputChange('marketResearch', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="competitiveAdvantage">Competitive Advantage</Label>
                <Textarea
                  id="competitiveAdvantage"
                  placeholder="What makes your solution unique?"
                  value={projectData.competitiveAdvantage}
                  onChange={(e) => handleInputChange('competitiveAdvantage', e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="successMetrics">Success Metrics</Label>
                <Input
                  id="successMetrics"
                  placeholder="e.g., 1000 users, $10k revenue, 95% uptime"
                  value={projectData.successMetrics}
                  onChange={(e) => handleInputChange('successMetrics', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="mentorshipAreas">Mentorship Areas Needed</Label>
                <Input
                  id="mentorshipAreas"
                  placeholder="e.g., Product Strategy, Technical Architecture, Marketing"
                  value={projectData.mentorshipAreas}
                  onChange={(e) => handleInputChange('mentorshipAreas', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return projectData.name.trim() && projectData.description.trim() && projectData.projectType;
      case 2:
        return projectData.problemStatement.trim() && projectData.solutionApproach.trim() && projectData.targetAudience.trim();
      case 3:
        return projectData.techStack.length > 0 && projectData.skillsNeeded.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Create Your Project</span>
          <span className="text-sm font-normal text-muted-foreground">
            Step {step} of 4
          </span>
        </CardTitle>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {renderStep()}

        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={step === 1 ? onBack : () => setStep(step - 1)}
          >
            {step === 1 ? 'Back to Gateway' : 'Previous'}
          </Button>

          <Button
            onClick={handleNext}
            disabled={!isStepValid() || isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {step === 4 ? 'Create Project' : 'Next'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};