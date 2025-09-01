import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code, Briefcase, Target, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AccessCodeDisplay } from "./AccessCodeDisplay";
import { storeUserContext } from "@/utils/oracleContext";
import { useAuth } from "@/hooks/useAuth";

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
  { value: 'ai_ml', label: 'AI/ML', icon: '🤖' },
  { value: 'blockchain', label: 'Blockchain', icon: '⛓️' },
  { value: 'cybersecurity', label: 'Cybersecurity', icon: '🔒' },
  { value: 'data_analytics', label: 'Data Analytics', icon: '📊' },
  { value: 'game_dev', label: 'Game Development', icon: '🎮' },
  { value: 'iot', label: 'IoT', icon: '🌐' },
  { value: 'quantum', label: 'Quantum Computing', icon: '⚛️' }
];

const ROLES = [
  { id: 'builder', label: 'Builder', description: 'Join a team and build amazing products' },
  { id: 'mentor', label: 'Mentor', description: 'Guide and support builder teams' }
];

const PROJECT_STAGES = [
  { 
    id: 'ideation', 
    label: 'Stage 1: Ideation', 
    description: 'Brainstorming ideas, validating concepts, market research',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/20'
  },
  { 
    id: 'development', 
    label: 'Stage 2: Development', 
    description: 'Building MVP, coding, technical implementation',
    color: 'bg-green-500/20 text-green-400 border-green-500/20'
  },
  { 
    id: 'testing', 
    label: 'Stage 3: Testing', 
    description: 'User testing, bug fixes, performance optimization',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'
  },
  { 
    id: 'launch', 
    label: 'Stage 4: Launch', 
    description: 'Product release, marketing, user acquisition',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/20'
  },
  { 
    id: 'growth', 
    label: 'Stage 5: Growth', 
    description: 'Scaling, new features, market expansion',
    color: 'bg-pink-500/20 text-pink-400 border-pink-500/20'
  }
];

export const InitialOnboarding = () => {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    skills: [] as string[],
    projectIdea: '',
    lookingFor: '',
    experience: '',
    bio: '',
    role: '',
    selectedTeam: '',
    projectStage: '',
    stageDescription: '',
    // Additional fields for Oracle context
    learningGoals: '',
    preferredTechStack: '',
    collaborationStyle: '',
    availability: '',
    mentorshipAreas: '',
    projectTimeline: '',
    targetAudience: '',
    successMetrics: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [availableTeams, setAvailableTeams] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionData, setCompletionData] = useState<{
    accessCode: string;
    teamName?: string;
  } | null>(null);

  const handleContinueToGateway = () => {
    console.log('🚀 Redirecting to gateway for access code login...');
    // Redirect to gateway where user can use their access code
    setTimeout(() => {
      window.location.href = '/gateway';
    }, 500);
  };

  const totalSteps = 7;
  const progress = (step / totalSteps) * 100;

  // Load teams immediately when component mounts
  useEffect(() => {
    const loadTeams = async () => {
      console.log('=== TEAM LOADING DEBUG ===');
      console.log('Loading teams...');
      console.log('Current user:', user);
      
              // Test basic connection first
        try {
          console.log('Testing basic connection...');
          
          // Test 1: Simple count
          const { data: testData, error: testError } = await supabase
            .from('teams')
            .select('*', { count: 'exact', head: true });
          
          console.log('Basic connection test:', { testData, testError });
          
          // Test 2: Try to get just one team
          const { data: singleTeam, error: singleError } = await supabase
            .from('teams')
            .select('id, name')
            .limit(1);
          
          console.log('Single team test:', { singleTeam, singleError });
          
          // Test 3: Check if we can access the table at all
          const { data: tableTest, error: tableTestError } = await supabase
            .from('teams')
            .select('*');
          
          console.log('Table access test:', { tableTest, tableTestError });
          
          if (tableTestError) {
            console.error('Cannot access teams table:', tableTestError);
            toast({
              title: "Access Denied",
              description: `Cannot access teams table: ${tableTestError.message}`,
              variant: "destructive"
            });
            return;
          }
          
          // If we get here, we can access the table
          console.log('Successfully accessed teams table');
          console.log('Teams found:', tableTest?.length || 0);
          
          if (tableTest && tableTest.length > 0) {
            console.log('Setting teams:', tableTest);
            setAvailableTeams(tableTest);
          } else {
            console.log('No teams found in database');
            toast({
              title: "No Teams Found",
              description: "No teams are currently available in the database.",
              variant: "destructive"
            });
          }
      } catch (err) {
        console.error('Unexpected error:', err);
        console.error('Error stack:', err.stack);
        toast({
          title: "Unexpected Error",
          description: "Failed to load teams due to unexpected error",
          variant: "destructive"
        });
      }
    };

    loadTeams();
  }, [user]);

  const handleNext = async () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      console.log('Starting onboarding completion...', { 
        userId: user?.id, 
        selectedTeam: formData.selectedTeam,
        role: formData.role 
      });

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Create/update user profile with comprehensive data for Oracle
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id, // Ensure user ID is set
          email: user.email || '',
          full_name: user.user_metadata?.full_name || formData.role.charAt(0).toUpperCase() + formData.role.slice(1) + ' User',
          role: formData.role as any, // Ensure proper role is set
          team_id: formData.selectedTeam || null,
          skills: formData.skills,
          experience_level: formData.experience,
          availability: formData.availability,
          bio: formData.bio,
          personal_goals: [formData.projectIdea, formData.learningGoals].filter(Boolean),
          project_vision: formData.projectIdea,
          help_needed: formData.lookingFor ? [formData.lookingFor] : [],
          onboarding_completed: true // CRITICAL: This must be set to true
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw profileError;
      }

      console.log('Profile created successfully:', profile);

      // If user selected a team, create team update and establish relationship
      if (formData.selectedTeam && profile) {
        console.log('Creating team update and establishing team relationship...');
        
        // Create the user's first project update (stage description) - this serves as the initial Oracle context
        const updateContent = `🎯 New member ${profile.full_name} joined the team!
        
📋 Profile Summary:
${formData.projectIdea ? `• Project Focus: ${formData.projectIdea}` : ''}
• Current Stage: ${PROJECT_STAGES.find(s => s.id === formData.projectStage)?.label || 'Ideation'}
• Experience Level: ${formData.experience} years
• Skills: ${formData.skills.join(', ')}
${formData.lookingFor ? `• Looking for help with: ${formData.lookingFor}` : ''}

🚀 Progress Update: ${formData.stageDescription}`;

        const { error: updateError } = await supabase
          .from('updates')
          .insert({
            team_id: formData.selectedTeam,
            content: updateContent,
            type: 'milestone',
            created_by: user.id // Use string user ID directly
          });

        if (updateError) {
          console.error('Update creation error:', updateError);
          throw updateError;
        }

        console.log('Team update created successfully');

        // Update team with comprehensive data from onboarding  
        const validStages = ['ideation', 'development', 'testing', 'launch', 'growth'] as const;
        const teamStage = validStages.includes(formData.projectStage as any) 
          ? (formData.projectStage as typeof validStages[number])
          : 'ideation';
        
        console.log('🎯 Updating team stage to:', teamStage, 'for team:', formData.selectedTeam);
        
        const { error: teamUpdateError } = await supabase
          .from('teams')
          .update({ 
            stage: teamStage,
            description: formData.projectIdea || 'Team project in development'
          })
          .eq('id', formData.selectedTeam);

        if (teamUpdateError) {
          console.error('❌ Team update error:', teamUpdateError);
          toast({
            title: "Warning",
            description: `Team stage update failed: ${teamUpdateError.message}. Contact support if this persists.`,
            variant: "destructive"
          });
        } else {
          console.log('✅ Team stage successfully updated to:', teamStage);
        }

        console.log('Team updated with project info');

        // CRITICAL FIX: Create member record for proper team tracking
        const { error: memberError } = await supabase
          .from('members')
          .insert({
            name: profile.full_name || '',
            role: formData.role as any,
            team_id: formData.selectedTeam,
            user_id: user.id, // Add user_id to support multiple members per team
            assigned_by: 'onboarding'
          });

        if (memberError) {
          console.error('Member creation error:', memberError);
          // Don't fail onboarding for this, but log it
        } else {
          console.log('Member record created successfully');
        }
      }

      // Store user context for Oracle learning
      try {
        await storeUserContext(user.id, {
          name: profile.full_name || '',
          bio: formData.stageDescription,
          skills: formData.skills.filter(skill => 
            ['frontend', 'backend', 'fullstack', 'ui_ux', 'devops', 'mobile', 'data', 'ai_ml', 'blockchain', 'security'].includes(skill)
          ) as any,
          experienceLevel: formData.experience as any,
          preferredTechnologies: formData.skills,
          learningGoals: [formData.learningGoals, formData.lookingFor].filter(Boolean),
          role: formData.role as any,
          teamId: formData.selectedTeam,
          projectGoal: formData.projectIdea,
          interests: formData.skills,
          communicationStyle: 'collaborative',
          workStyle: 'flexible',
          availability: formData.availability,
          timezone: 'UTC',
          onboardingCompleted: true,
          lastUpdated: new Date().toISOString()
        });
        console.log('User context stored for Oracle');
      } catch (contextError) {
        console.error('Error storing user context:', contextError);
        // Don't fail onboarding for this
      }

      // Generate access code using utility function
      console.log('🔑 Starting access code generation...', { userId: user.id, role: formData.role, teamId: formData.selectedTeam });
      const { assignAccessCode } = await import('@/utils/accessCodes');
      const accessCode = await assignAccessCode(user.id, formData.role, formData.selectedTeam);
      console.log('🔑 Access code generated successfully:', accessCode);

      console.log('Onboarding completed successfully');

      // Show success toast with access code
      const selectedTeam = availableTeams.find((team: any) => team.id === formData.selectedTeam);
      toast({
        title: "🎉 Onboarding Complete!",
        description: `Your access code: ${accessCode}. Redirecting to gateway...`
      });

      console.log('🎉 Onboarding completed! Access code:', accessCode);
      
      // Go directly to gateway after short delay
      setTimeout(() => {
        window.location.href = '/gateway';
      }, 2000);

    } catch (error: any) {
      console.error('Onboarding completion error:', error);
      toast({
        title: "Error",
        description: `Failed to complete onboarding: ${error.message}. Please try again.`,
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

              <Textarea
                placeholder="Tell us about yourself - your background, interests, what drives you..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="min-h-[100px]"
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
                disabled={!formData.projectIdea || !formData.lookingFor || !formData.bio || !formData.experience}
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
              {availableTeams.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading teams...</p>
                  <p className="text-xs text-muted-foreground mt-2">Found {availableTeams.length} teams</p>
                </div>
              ) : (
                availableTeams.map((team: any) => (
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
                ))
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!formData.selectedTeam}
                className="flex-1 ufo-gradient"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-glow">What Stage is Your Project In?</h3>
              <p className="text-muted-foreground text-lg">Select your current stage and describe your progress</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium high-contrast-text mb-3 block">Select Your Project Stage</label>
                <div className="grid grid-cols-1 gap-3">
                  {PROJECT_STAGES.map((stage) => (
                    <div
                      key={stage.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        formData.projectStage === stage.id
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary/50'
                      }`}
                      onClick={() => setFormData({ ...formData, projectStage: stage.id })}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${stage.color}`}>
                          <Target className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold high-contrast-text">{stage.label}</h4>
                          <p className="text-sm readable-muted">{stage.description}</p>
                        </div>
                        {formData.projectStage === stage.id && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 font-medium">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium high-contrast-text mt-4 block">Describe Your Current Progress</label>
                <Textarea
                  placeholder="Tell us about your current progress, what you've accomplished, and what you're working on next..."
                  value={formData.stageDescription}
                  onChange={(e) => setFormData({ ...formData, stageDescription: e.target.value })}
                  className="min-h-[120px] professional-input"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This will be your first project update for the team!
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!formData.projectStage || !formData.stageDescription}
                className="flex-1 ufo-gradient"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-glow">Project Details</h3>
              <p className="text-muted-foreground text-lg">Help us understand your project better</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">What are your learning goals?</label>
                <Textarea
                  placeholder="e.g., Master React hooks, Learn AWS deployment, Understand blockchain..."
                  value={formData.learningGoals}
                  onChange={(e) => setFormData({ ...formData, learningGoals: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Preferred Tech Stack</label>
                <Textarea
                  placeholder="e.g., React + Node.js + PostgreSQL, Python + FastAPI + MongoDB..."
                  value={formData.preferredTechStack}
                  onChange={(e) => setFormData({ ...formData, preferredTechStack: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Collaboration Style</label>
                <Select value={formData.collaborationStyle} onValueChange={(value) => setFormData({ ...formData, collaborationStyle: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hands_on">Hands-on coding together</SelectItem>
                    <SelectItem value="code_reviews">Code reviews and feedback</SelectItem>
                    <SelectItem value="pair_programming">Pair programming sessions</SelectItem>
                    <SelectItem value="mentorship">Regular mentorship meetings</SelectItem>
                    <SelectItem value="independent">Independent work with guidance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Weekly Availability</label>
                <Select value={formData.availability} onValueChange={(value) => setFormData({ ...formData, availability: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5_10_hours">5-10 hours</SelectItem>
                    <SelectItem value="10_20_hours">10-20 hours</SelectItem>
                    <SelectItem value="20_30_hours">20-30 hours</SelectItem>
                    <SelectItem value="30_plus_hours">30+ hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!formData.learningGoals || !formData.preferredTechStack || !formData.collaborationStyle || !formData.availability}
                className="flex-1 ufo-gradient"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                <Code className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-glow">Final Details</h3>
              <p className="text-muted-foreground text-lg">Almost done! Just a few more questions</p>
            </div>

            <div className="space-y-4">
              {formData.role === 'mentor' && (
                <div>
                  <label className="text-sm font-medium">What areas can you mentor in?</label>
                  <Textarea
                    placeholder="e.g., React development, Database design, DevOps practices, Business strategy..."
                    value={formData.mentorshipAreas}
                    onChange={(e) => setFormData({ ...formData, mentorshipAreas: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Project Timeline</label>
                <Select value={formData.projectTimeline} onValueChange={(value) => setFormData({ ...formData, projectTimeline: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1_3_months">1-3 months</SelectItem>
                    <SelectItem value="3_6_months">3-6 months</SelectItem>
                    <SelectItem value="6_12_months">6-12 months</SelectItem>
                    <SelectItem value="12_plus_months">12+ months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Target Audience</label>
                <Textarea
                  placeholder="e.g., Small businesses, Students, Developers, Healthcare providers..."
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Success Metrics</label>
                <Textarea
                  placeholder="e.g., User engagement, Revenue growth, Learning outcomes, Community impact..."
                  value={formData.successMetrics}
                  onChange={(e) => setFormData({ ...formData, successMetrics: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={isLoading || !formData.projectTimeline || !formData.targetAudience || !formData.successMetrics}
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
