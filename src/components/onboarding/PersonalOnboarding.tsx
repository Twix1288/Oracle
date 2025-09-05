import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PersonalOnboardingProps {
  userId: string;
  onComplete: () => void;
}

export const PersonalOnboarding = ({ userId, onComplete }: PersonalOnboardingProps) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    skills: [] as string[],
    lookingFor: '',
    aboutYourself: '',
    role: '' as 'marketer' | 'engineer' | 'designer' | 'product_manager' | 'business' | ''
  });

  const commonSkills = [
    'React', 'JavaScript', 'Python', 'Node.js', 'Marketing', 'UI/UX Design',
    'Product Management', 'Sales', 'Data Analysis', 'AI/ML', 'Blockchain',
    'Mobile Development', 'DevOps', 'Content Creation', 'SEO', 'Business Strategy'
  ];

  const roles = [
    { id: 'engineer', label: 'Engineer', description: 'Build and develop solutions' },
    { id: 'marketer', label: 'Marketer', description: 'Promote and grow products' },
    { id: 'designer', label: 'Designer', description: 'Create user experiences' },
    { id: 'product_manager', label: 'Product Manager', description: 'Guide product strategy' },
    { id: 'business', label: 'Business', description: 'Strategy and operations' }
  ];

  const addSkill = (skill: string) => {
    if (!formData.skills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      // Update profile with onboarding data
      const { error } = await supabase
        .from('profiles')
        .update({
          skills: formData.skills,
          learning_goals: [formData.lookingFor],
          bio: formData.aboutYourself,
          role: 'builder', // Default role for all users
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      onComplete();
    } catch (error) {
      console.error('Error completing personal onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.skills.length > 0;
      case 2:
        return formData.lookingFor.trim().length > 0;
      case 3:
        return formData.aboutYourself.trim().length > 0;
      case 4:
        return formData.role !== '';
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
              <Label className="text-lg font-semibold">What are your skills?</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Select or add skills that describe your expertise
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {commonSkills.map((skill) => (
                <Badge
                  key={skill}
                  variant={formData.skills.includes(skill) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => addSkill(skill)}
                >
                  {skill}
                </Badge>
              ))}
            </div>

            {formData.skills.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Selected Skills:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skill) => (
                    <Badge key={skill} variant="default" className="gap-1">
                      {skill}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeSkill(skill)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="lookingFor" className="text-lg font-semibold">
                What are you looking for?
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Tell us what you hope to achieve or learn
              </p>
            </div>
            <Textarea
              id="lookingFor"
              placeholder="I'm looking to learn new technologies, build projects, find collaborators..."
              value={formData.lookingFor}
              onChange={(e) => setFormData(prev => ({ ...prev, lookingFor: e.target.value }))}
              className="min-h-32"
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="aboutYourself" className="text-lg font-semibold">
                Tell us about yourself
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Share your background, interests, or anything you'd like others to know
              </p>
            </div>
            <Textarea
              id="aboutYourself"
              placeholder="I'm a passionate developer who loves building innovative solutions..."
              value={formData.aboutYourself}
              onChange={(e) => setFormData(prev => ({ ...prev, aboutYourself: e.target.value }))}
              className="min-h-32"
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-lg font-semibold">What's your primary role?</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Choose the role that best describes what you do
              </p>
            </div>

            <div className="grid gap-3">
              {roles.map((role) => (
                <Card
                  key={role.id}
                  className={`cursor-pointer transition-colors ${
                    formData.role === role.id 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, role: role.id as any }))}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{role.label}</h3>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
          <CardTitle className="text-2xl font-bold">
            Welcome to Oracle Hub
          </CardTitle>
          <p className="text-muted-foreground">
            Step {step} of 4 - Let's get to know you better
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
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
            >
              Back
            </Button>
            
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
                {isLoading ? 'Completing...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};