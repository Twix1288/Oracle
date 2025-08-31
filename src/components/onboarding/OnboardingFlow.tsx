import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Target, Lightbulb, Users, Rocket, TrendingUp, Code, Briefcase } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "../BackButton";
import { ONBOARDING_STEPS, SKILLS, EXPERIENCE_LEVELS } from "./OnboardingSteps";
import { storeUserContext } from "@/utils/oracleContext";
import type { OnboardingData, UserSkill, ExperienceLevel } from "@/types/onboarding";

interface OnboardingFlowProps {
  userId: string;
  initialData?: Partial<OnboardingData>;
  onComplete: (data: OnboardingData) => void;
}

export const OnboardingFlow = ({ userId, initialData, onComplete }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Form data state
  const [formData, setFormData] = useState<Partial<OnboardingData>>({
    ...initialData,
    onboardingCompleted: false,
    lastUpdated: new Date().toISOString()
  });

  // Progress calculation
  const totalSteps = ONBOARDING_STEPS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Field update handler
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      lastUpdated: new Date().toISOString()
    }));
  };

  // Validation helper
  const validateStep = (step: typeof ONBOARDING_STEPS[0]) => {
    const requiredFields = step.fields.filter(f => f.required).map(f => f.name);
    return requiredFields.every(field => {
      const value = formData[field];
      if (Array.isArray(value)) return value.length > 0;
      return !!value;
    });
  };

  // Save progress
  const saveProgress = async (final: boolean = false) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({
          onboarding_data: formData,
          onboarding_completed: final,
          last_updated: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      if (final) {
        toast({
          title: "🎉 Onboarding Complete!",
          description: "Your profile has been set up successfully."
        });
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        title: "Error Saving Progress",
        description: "Failed to save your progress. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Complete onboarding
  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Save final data
      await saveProgress(true);

      // Store user context for Oracle
      await storeUserContext(userId, formData as OnboardingData);
      
      // Call completion handler
      onComplete(formData as OnboardingData);

      toast({
        title: "🎉 Welcome to the Program!",
        description: "Your profile has been set up and the Oracle has been personalized for you."
      });
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: "Onboarding Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save on step change
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      saveProgress();
    }
  }, [currentStep]);

  // Render current step
  const renderField = (field: typeof ONBOARDING_STEPS[0]['fields'][0]) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={formData[field.name] || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter your ${field.label.toLowerCase()}`}
            className="professional-input"
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={formData[field.name] || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={`Enter your ${field.label.toLowerCase()}`}
            className="min-h-[120px] professional-input"
          />
        );

      case 'select':
        return (
          <Select
            value={formData[field.name] || ''}
            onValueChange={(value) => handleFieldChange(field.name, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select your ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multi-select':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div
                key={option.value}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  (formData[field.name] as string[] || []).includes(option.value)
                    ? 'border-primary bg-primary/10'
                    : 'border-muted hover:border-primary/50'
                }`}
                onClick={() => {
                  const current = formData[field.name] as string[] || [];
                  const updated = current.includes(option.value)
                    ? current.filter(v => v !== option.value)
                    : [...current, option.value];
                  handleFieldChange(field.name, updated);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{option.label}</h4>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                  {(formData[field.name] as string[] || []).includes(option.value) && (
                    <Badge>Selected</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'tags':
        return (
          <div className="space-y-2">
            <Input
              placeholder="Type and press Enter to add"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const input = e.target as HTMLInputElement;
                  const value = input.value.trim();
                  if (value) {
                    const current = formData[field.name] as string[] || [];
                    handleFieldChange(field.name, [...current, value]);
                    input.value = '';
                  }
                }
              }}
            />
            <div className="flex flex-wrap gap-2">
              {(formData[field.name] as string[] || []).map((tag, index) => (
                <Badge
                  key={index}
                  className="cursor-pointer"
                  onClick={() => {
                    const current = formData[field.name] as string[] || [];
                    handleFieldChange(
                      field.name,
                      current.filter((_, i) => i !== index)
                    );
                  }}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const canProceed = validateStep(currentStepData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-glow mb-4">Welcome to PieFi Oracle</h1>
            <p className="text-lg text-muted-foreground">
              Let's set up your profile and get you started
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-foreground">
                Step {currentStep + 1} of {totalSteps}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                    {currentStep === 0 ? <Users className="h-8 w-8 text-primary" /> :
                     currentStep === 1 ? <Code className="h-8 w-8 text-primary" /> :
                     currentStep === 2 ? <Briefcase className="h-8 w-8 text-primary" /> :
                     currentStep === 3 ? <Target className="h-8 w-8 text-primary" /> :
                     <Sparkles className="h-8 w-8 text-primary" />}
                  </div>
                  <h3 className="text-2xl font-bold text-glow">{currentStepData.title}</h3>
                  <p className="text-muted-foreground text-lg">{currentStepData.description}</p>
                </div>

                <div className="space-y-6">
                  {currentStepData.fields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <label className="text-sm font-medium high-contrast-text">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderField(field)}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  {currentStep > 0 && (
                    <BackButton
                      onClick={handleBack}
                      text="Back"
                      className="flex-1 mb-0"
                    />
                  )}
                  <Button
                    onClick={isLastStep ? handleComplete : handleNext}
                    disabled={!canProceed || isLoading}
                    className="flex-1 ufo-gradient hover:opacity-90 py-3 text-lg font-semibold"
                  >
                    {isLoading ? "Saving..." :
                     isLastStep ? "Complete Setup" :
                     "Continue"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
