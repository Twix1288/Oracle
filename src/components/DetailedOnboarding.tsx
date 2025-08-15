import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { X, Plus, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DetailedOnboardingProps {
  onComplete: () => void;
}

const SKILL_SUGGESTIONS = [
  'Frontend Development', 'Backend Development', 'UI/UX Design', 'Mobile Development',
  'Data Science', 'Machine Learning', 'DevOps', 'Product Management', 'Marketing',
  'Business Development', 'Content Creation', 'Project Management', 'Quality Assurance',
  'Blockchain', 'Cybersecurity', 'Cloud Computing', 'Database Design', 'API Development'
];

const GOAL_SUGGESTIONS = [
  'Build MVP', 'Launch Product', 'Raise Funding', 'Scale Team', 'Enter Market',
  'Validate Idea', 'Find Co-founder', 'Build Community', 'Generate Revenue',
  'Learn New Skills', 'Network with Peers', 'Find Mentor', 'Improve Product'
];

export const DetailedOnboarding = ({ onComplete }: DetailedOnboardingProps) => {
  const { updateProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    bio: '',
    personal_goals: [] as string[],
    project_vision: '',
    skills: [] as string[],
    help_needed: [] as string[],
    experience_level: '',
    availability: '',
    timezone: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
  });

  const [tempInputs, setTempInputs] = useState({
    skill: '',
    goal: '',
    help: '',
  });

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const addItem = (type: 'skills' | 'personal_goals' | 'help_needed', value: string) => {
    if (value.trim() && !formData[type].includes(value.trim())) {
      setFormData(prev => ({
        ...prev,
        [type]: [...prev[type], value.trim()]
      }));
    }
  };

  const removeItem = (type: 'skills' | 'personal_goals' | 'help_needed', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const addFromSuggestion = (type: 'skills' | 'personal_goals' | 'help_needed', value: string) => {
    if (!formData[type].includes(value)) {
      setFormData(prev => ({
        ...prev,
        [type]: [...prev[type], value]
      }));
    }
  };

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
    setLoading(true);
    try {
      const { error } = await updateProfile({
        ...formData,
        onboarding_completed: true,
      });

      if (error) throw error;

      toast.success('Profile completed! Welcome to PieFi!');
      onComplete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Tell us about yourself</h2>
              <p className="text-muted-foreground">Help the Oracle understand who you are</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself, your background, and what drives you..."
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  className="min-h-24"
                />
              </div>
              
              <div>
                <Label htmlFor="experience">Experience Level</Label>
                <Select value={formData.experience_level} onValueChange={(value) => setFormData(prev => ({ ...prev, experience_level: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner (0-1 years)</SelectItem>
                    <SelectItem value="intermediate">Intermediate (2-4 years)</SelectItem>
                    <SelectItem value="advanced">Advanced (5-7 years)</SelectItem>
                    <SelectItem value="expert">Expert (8+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">What are your skills?</h2>
              <p className="text-muted-foreground">Add skills you can help others with</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a skill..."
                  value={tempInputs.skill}
                  onChange={(e) => setTempInputs(prev => ({ ...prev, skill: e.target.value }))}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addItem('skills', tempInputs.skill);
                      setTempInputs(prev => ({ ...prev, skill: '' }));
                    }
                  }}
                />
                <Button 
                  onClick={() => {
                    addItem('skills', tempInputs.skill);
                    setTempInputs(prev => ({ ...prev, skill: '' }));
                  }}
                  variant="outline"
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeItem('skills', index)}
                    />
                  </Badge>
                ))}
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Suggestions:</Label>
                <div className="flex flex-wrap gap-2">
                  {SKILL_SUGGESTIONS.filter(skill => !formData.skills.includes(skill)).slice(0, 10).map((skill) => (
                    <Badge 
                      key={skill} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => addFromSuggestion('skills', skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">What help do you need?</h2>
              <p className="text-muted-foreground">Skills you'd like help with or want to learn</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a skill you need help with..."
                  value={tempInputs.help}
                  onChange={(e) => setTempInputs(prev => ({ ...prev, help: e.target.value }))}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addItem('help_needed', tempInputs.help);
                      setTempInputs(prev => ({ ...prev, help: '' }));
                    }
                  }}
                />
                <Button 
                  onClick={() => {
                    addItem('help_needed', tempInputs.help);
                    setTempInputs(prev => ({ ...prev, help: '' }));
                  }}
                  variant="outline"
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {formData.help_needed.map((help, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {help}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeItem('help_needed', index)}
                    />
                  </Badge>
                ))}
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Suggestions:</Label>
                <div className="flex flex-wrap gap-2">
                  {SKILL_SUGGESTIONS.filter(skill => !formData.help_needed.includes(skill)).slice(0, 10).map((skill) => (
                    <Badge 
                      key={skill} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => addFromSuggestion('help_needed', skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Your goals & vision</h2>
              <p className="text-muted-foreground">What do you want to achieve?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="vision">Project Vision</Label>
                <Textarea
                  id="vision"
                  placeholder="Describe your project vision and what you're building..."
                  value={formData.project_vision}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_vision: e.target.value }))}
                  className="min-h-24"
                />
              </div>
              
              <div>
                <Label>Personal Goals</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Add a goal..."
                    value={tempInputs.goal}
                    onChange={(e) => setTempInputs(prev => ({ ...prev, goal: e.target.value }))}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addItem('personal_goals', tempInputs.goal);
                        setTempInputs(prev => ({ ...prev, goal: '' }));
                      }
                    }}
                  />
                  <Button 
                    onClick={() => {
                      addItem('personal_goals', tempInputs.goal);
                      setTempInputs(prev => ({ ...prev, goal: '' }));
                    }}
                    variant="outline"
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.personal_goals.map((goal, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {goal}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeItem('personal_goals', index)}
                      />
                    </Badge>
                  ))}
                </div>
                
                <div className="mt-4">
                  <Label className="text-sm text-muted-foreground mb-2 block">Goal suggestions:</Label>
                  <div className="flex flex-wrap gap-2">
                    {GOAL_SUGGESTIONS.filter(goal => !formData.personal_goals.includes(goal)).slice(0, 8).map((goal) => (
                      <Badge 
                        key={goal} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => addFromSuggestion('personal_goals', goal)}
                      >
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Availability & Links</h2>
              <p className="text-muted-foreground">Help others connect with you</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="availability">Availability</Label>
                  <Select value={formData.availability} onValueChange={(value) => setFormData(prev => ({ ...prev, availability: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="How available are you?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="very-active">Very Active (Daily)</SelectItem>
                      <SelectItem value="active">Active (Few times/week)</SelectItem>
                      <SelectItem value="moderate">Moderate (Weekly)</SelectItem>
                      <SelectItem value="limited">Limited (Occasional)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    placeholder="e.g., EST, PST, UTC+2"
                    value={formData.timezone}
                    onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="linkedin">LinkedIn URL (optional)</Label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="github">GitHub URL (optional)</Label>
                <Input
                  id="github"
                  placeholder="https://github.com/yourusername"
                  value={formData.github_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, github_url: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="portfolio">Portfolio URL (optional)</Label>
                <Input
                  id="portfolio"
                  placeholder="https://yourportfolio.com"
                  value={formData.portfolio_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, portfolio_url: e.target.value }))}
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
    <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-background/95 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Complete Your Profile</span>
          </div>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2">
            Step {currentStep} of {totalSteps}
          </p>
        </CardHeader>
        
        <CardContent>
          {renderStep()}
          
          <div className="flex justify-between mt-8">
            <Button 
              variant="outline" 
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            {currentStep < totalSteps ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={loading}>
                {loading ? 'Completing...' : 'Complete Profile'}
                <CheckCircle className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};