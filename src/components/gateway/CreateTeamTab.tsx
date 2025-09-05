import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Rocket, Lightbulb, Target, Users, Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PROJECT_TYPES = [
  { value: 'web-app', label: 'Web Application' },
  { value: 'mobile-app', label: 'Mobile Application' },
  { value: 'desktop-app', label: 'Desktop Application' },
  { value: 'api-service', label: 'API/Backend Service' },
  { value: 'data-analysis', label: 'Data Analysis/ML' },
  { value: 'blockchain', label: 'Blockchain/Web3' },
  { value: 'iot', label: 'IoT/Hardware' },
  { value: 'game', label: 'Game Development' },
  { value: 'other', label: 'Other' }
];

const SKILLS_OPTIONS = [
  'Frontend Development', 'Backend Development', 'Full-Stack Development',
  'UI/UX Design', 'Mobile Development', 'DevOps', 'Data Science',
  'Machine Learning', 'Product Management', 'Marketing', 'Business Development',
  'Content Creation', 'Project Management', 'Quality Assurance',
  'Blockchain Development', 'Cybersecurity', 'Cloud Computing'
];

const TECH_STACKS = [
  'React', 'Vue.js', 'Angular', 'Node.js', 'Python', 'Java', 'C#', 'Go',
  'Rust', 'TypeScript', 'JavaScript', 'PHP', 'Ruby', 'Swift', 'Kotlin',
  'Flutter', 'React Native', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
  'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'GraphQL', 'REST APIs'
];

export function CreateTeamTab() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    teamName: '',
    description: '',
    projectGoal: '',
    problemStatement: '',
    solutionApproach: '',
    targetAudience: '',
    projectType: '',
    skillsNeeded: [] as string[],
    techRequirements: [] as string[],
    teamSizeNeeded: 3,
    timelineMonths: 6,
    budget: '',
    marketResearch: '',
    competitiveAdvantage: '',
    successMetrics: '',
    mentorshipAreas: ''
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCreateTeam = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Please sign in first before creating a team');
      }

      // Create team with comprehensive project data
      const { data, error } = await supabase
        .rpc('create_team_with_project_data', {
          p_name: formData.teamName.trim(),
          p_description: formData.description.trim(),
          p_problem_statement: formData.problemStatement.trim(),
          p_solution_approach: formData.solutionApproach.trim(),
          p_target_audience: formData.targetAudience.trim(),
          p_project_type: formData.projectType,
          p_skills_needed: formData.skillsNeeded,
          p_tech_requirements: formData.techRequirements,
          p_team_size_needed: formData.teamSizeNeeded,
          p_timeline_months: formData.timelineMonths
        });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; team_id: string; access_code: string; message: string };

      if (!result.success) {
        throw new Error('Failed to create team');
      }

      toast.success(`Team "${formData.teamName}" created successfully!`);
      toast.success(`Your team access code: ${result.access_code}`, {
        duration: 10000,
        description: "Share this code with team members to invite them"
      });

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = (skill: string) => {
    if (!formData.skillsNeeded.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skillsNeeded: [...prev.skillsNeeded, skill]
      }));
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skillsNeeded: prev.skillsNeeded.filter(s => s !== skill)
    }));
  };

  const addTech = (tech: string) => {
    if (!formData.techRequirements.includes(tech)) {
      setFormData(prev => ({
        ...prev,
        techRequirements: [...prev.techRequirements, tech]
      }));
    }
  };

  const removeTech = (tech: string) => {
    setFormData(prev => ({
      ...prev,
      techRequirements: prev.techRequirements.filter(t => t !== tech)
    }));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto">
                <Rocket className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Project Foundation</h3>
              <p className="text-muted-foreground">Let's start with the basics of your project</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name *</Label>
                <Input
                  id="teamName"
                  placeholder="Enter your team name"
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your project in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectGoal">Project Goal *</Label>
                <Textarea
                  id="projectGoal"
                  placeholder="What is the main goal of your project?"
                  value={formData.projectGoal}
                  onChange={(e) => setFormData({ ...formData, projectGoal: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="problemStatement">Problem Statement *</Label>
                <Textarea
                  id="problemStatement"
                  placeholder="What problem are you trying to solve?"
                  value={formData.problemStatement}
                  onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
                  rows={3}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Solution & Audience</h3>
              <p className="text-muted-foreground">Define your solution and target market</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="solutionApproach">Solution Approach *</Label>
                <Textarea
                  id="solutionApproach"
                  placeholder="How do you plan to solve this problem?"
                  value={formData.solutionApproach}
                  onChange={(e) => setFormData({ ...formData, solutionApproach: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience *</Label>
                <Input
                  id="targetAudience"
                  placeholder="Who is your target audience?"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectType">Project Type *</Label>
                <Select value={formData.projectType} onValueChange={(value) => setFormData({ ...formData, projectType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="competitiveAdvantage">Competitive Advantage</Label>
                <Textarea
                  id="competitiveAdvantage"
                  placeholder="What makes your solution unique?"
                  value={formData.competitiveAdvantage}
                  onChange={(e) => setFormData({ ...formData, competitiveAdvantage: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Team & Technology</h3>
              <p className="text-muted-foreground">Define your team needs and tech stack</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Skills Needed</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.skillsNeeded.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm cursor-pointer hover:bg-primary/20"
                      onClick={() => removeSkill(skill)}
                    >
                      {skill} ×
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SKILLS_OPTIONS.filter(skill => !formData.skillsNeeded.includes(skill)).map((skill) => (
                    <Button
                      key={skill}
                      variant="outline"
                      size="sm"
                      onClick={() => addSkill(skill)}
                      className="text-xs"
                    >
                      + {skill}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Technology Requirements</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.techRequirements.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm cursor-pointer hover:bg-primary/20"
                      onClick={() => removeTech(tech)}
                    >
                      {tech} ×
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TECH_STACKS.filter(tech => !formData.techRequirements.includes(tech)).map((tech) => (
                    <Button
                      key={tech}
                      variant="outline"
                      size="sm"
                      onClick={() => addTech(tech)}
                      className="text-xs"
                    >
                      + {tech}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teamSizeNeeded">Team Size Needed</Label>
                  <Select value={formData.teamSizeNeeded.toString()} onValueChange={(value) => setFormData({ ...formData, teamSizeNeeded: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size} people
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timelineMonths">Timeline (Months)</Label>
                  <Select value={formData.timelineMonths.toString()} onValueChange={(value) => setFormData({ ...formData, timelineMonths: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 6, 9, 12, 18, 24].map((months) => (
                        <SelectItem key={months} value={months.toString()}>
                          {months} months
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto">
                <Lightbulb className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Strategy & Support</h3>
              <p className="text-muted-foreground">Final details for success</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="marketResearch">Market Research</Label>
                <Textarea
                  id="marketResearch"
                  placeholder="What research have you done on the market?"
                  value={formData.marketResearch}
                  onChange={(e) => setFormData({ ...formData, marketResearch: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="successMetrics">Success Metrics</Label>
                <Textarea
                  id="successMetrics"
                  placeholder="How will you measure success?"
                  value={formData.successMetrics}
                  onChange={(e) => setFormData({ ...formData, successMetrics: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget (Optional)</Label>
                <Input
                  id="budget"
                  placeholder="e.g., $10,000, Bootstrapped, etc."
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mentorshipAreas">Mentorship Areas</Label>
                <Textarea
                  id="mentorshipAreas"
                  placeholder="What areas would you like mentorship in?"
                  value={formData.mentorshipAreas}
                  onChange={(e) => setFormData({ ...formData, mentorshipAreas: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} className="p-2" disabled={step === 1}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <CardTitle className="text-lg">Create Your Team</CardTitle>
            <div className="text-sm text-muted-foreground">
              Step {step} of {totalSteps}
            </div>
          </div>
          <div className="w-8"></div>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2 mt-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {renderStep()}

        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={handleBack} disabled={step === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          {step < totalSteps ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleCreateTeam} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Team...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Team
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}