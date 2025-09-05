import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Rocket, Users, UserCheck, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { assignAccessCode } from "@/utils/accessCodes";

interface ProjectOnboardingProps {
  onComplete: (role: string, data?: any) => void;
}

const ONBOARDING_OPTIONS = [
  {
    id: 'create-project',
    title: 'Start a New Project',
    description: 'Create your own project and get an access code to invite team members',
    icon: Rocket,
    color: 'bg-primary/20 text-primary'
  },
  {
    id: 'join-project',
    title: 'Join an Existing Project',
    description: 'Have an access code? Join a project team',
    icon: Users,
    color: 'bg-green-500/20 text-green-400'
  },
  {
    id: 'mentor-projects',
    title: 'Mentor Projects',
    description: 'Guide and support project teams as a mentor',
    icon: UserCheck,
    color: 'bg-purple-500/20 text-purple-400'
  }
];

export const ProjectOnboarding = ({ onComplete }: ProjectOnboardingProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Form states for different flows
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    fullName: ''
  });

  const [joinForm, setJoinForm] = useState({
    accessCode: '',
    fullName: ''
  });

  const [mentorForm, setMentorForm] = useState({
    fullName: '',
    bio: '',
    skills: ''
  });

  const handleBack = () => {
    setSelectedOption(null);
  };

  const handleCreateProject = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Update profile first
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: projectForm.fullName,
          role: 'builder',
          onboarding_completed: true
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: projectForm.name,
          description: projectForm.description,
          stage: 'ideation'
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Update profile with team_id
      const { error: teamUpdateError } = await supabase
        .from('profiles')
        .update({
          team_id: team.id
        })
        .eq('id', user.id);

      if (teamUpdateError) throw teamUpdateError;

      // Generate access code for the team
      const accessCode = await assignAccessCode(user.id, 'builder', team.id);

      // Create initial team update
      await supabase.from('updates').insert({
        team_id: team.id,
        content: `🚀 Project "${projectForm.name}" has been created!\n\n📋 Description: ${projectForm.description}\n\n🎯 Use access code: ${accessCode} to invite team members`,
        type: 'milestone',
        created_by: user.id
      });

      toast({
        title: "Project Created!",
        description: `Your project "${projectForm.name}" has been created. Share your access code with team members.`
      });

      onComplete('builder', { 
        teamId: team.id, 
        teamName: team.name, 
        accessCode,
        isProjectLead: true 
      });
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: "Error Creating Project",
        description: error.message || "Failed to create project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinProject = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Use the access code to join
      const { error: joinError } = await supabase.rpc('use_access_code', {
        p_user_id: user.id,
        p_code: joinForm.accessCode,
        p_builder_name: joinForm.fullName
      });

      if (joinError) throw joinError;

      toast({
        title: "Successfully Joined!",
        description: "You have been added to the project team."
      });

      onComplete('builder', { accessCode: joinForm.accessCode });
    } catch (error: any) {
      console.error('Error joining project:', error);
      toast({
        title: "Error Joining Project",
        description: error.message || "Invalid access code or failed to join project.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBecomeMentor = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Update profile as mentor
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: mentorForm.fullName,
          bio: mentorForm.bio,
          role: 'mentor',
          skills: mentorForm.skills.split(',').map(s => s.trim()),
          onboarding_completed: true
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Generate mentor access code
      const accessCode = await assignAccessCode(user.id, 'mentor');

      toast({
        title: "Mentor Profile Created!",
        description: "You can now mentor project teams."
      });

      onComplete('mentor', { accessCode });
    } catch (error: any) {
      console.error('Error setting up mentor:', error);
      toast({
        title: "Error Setting up Mentor Profile",
        description: error.message || "Failed to create mentor profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedOption) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-glow mb-6">Welcome to the Innovation Hub</h1>
              <p className="text-xl text-muted-foreground">
                Choose how you want to participate in building the future
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {ONBOARDING_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <Card 
                    key={option.id}
                    className="cursor-pointer transition-all hover:glow-border group"
                    onClick={() => setSelectedOption(option.id)}
                  >
                    <CardContent className="p-8 text-center space-y-6">
                      <div className={`p-6 rounded-full ${option.color} w-fit mx-auto group-hover:scale-110 transition-transform`}>
                        <Icon className="h-12 w-12" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-3">{option.title}</h3>
                        <p className="text-muted-foreground">{option.description}</p>
                      </div>
                      <Button className="w-full ufo-gradient">
                        Get Started
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render specific form based on selected option
  const renderForm = () => {
    switch (selectedOption) {
      case 'create-project':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
                <Rocket className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-3xl font-bold text-glow">Create Your Project</h3>
              <p className="text-muted-foreground text-lg">
                Start your innovation journey and get an access code to invite collaborators
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Your Full Name</label>
                <Input
                  placeholder="Enter your full name"
                  value={projectForm.fullName}
                  onChange={(e) => setProjectForm({...projectForm, fullName: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Project Name</label>
                <Input
                  placeholder="What's your project called?"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Project Description</label>
                <Textarea
                  placeholder="Describe your project idea, goals, and what you want to build..."
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                  className="min-h-[120px]"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!projectForm.name || !projectForm.description || !projectForm.fullName || isLoading}
                className="flex-1 ufo-gradient"
              >
                {isLoading ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </div>
        );

      case 'join-project':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-green-500/20 w-fit mx-auto ufo-pulse">
                <Users className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-3xl font-bold text-glow">Join a Project</h3>
              <p className="text-muted-foreground text-lg">
                Enter your access code to join an existing project team
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Your Full Name</label>
                <Input
                  placeholder="Enter your full name"
                  value={joinForm.fullName}
                  onChange={(e) => setJoinForm({...joinForm, fullName: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Access Code</label>
                <Input
                  placeholder="Enter the access code provided by the project lead"
                  value={joinForm.accessCode}
                  onChange={(e) => setJoinForm({...joinForm, accessCode: e.target.value.toUpperCase()})}
                  className="text-center text-lg tracking-wider font-mono"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleJoinProject}
                disabled={!joinForm.accessCode || !joinForm.fullName || isLoading}
                className="flex-1 ufo-gradient"
              >
                {isLoading ? "Joining..." : "Join Project"}
              </Button>
            </div>
          </div>
        );

      case 'mentor-projects':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 rounded-full bg-purple-500/20 w-fit mx-auto ufo-pulse">
                <UserCheck className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-3xl font-bold text-glow">Become a Mentor</h3>
              <p className="text-muted-foreground text-lg">
                Guide and support project teams with your expertise
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Your Full Name</label>
                <Input
                  placeholder="Enter your full name"
                  value={mentorForm.fullName}
                  onChange={(e) => setMentorForm({...mentorForm, fullName: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                  placeholder="Tell us about your background, experience, and what you can offer to project teams..."
                  value={mentorForm.bio}
                  onChange={(e) => setMentorForm({...mentorForm, bio: e.target.value})}
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Skills & Expertise</label>
                <Input
                  placeholder="React, Node.js, Product Management, UI/UX..."
                  value={mentorForm.skills}
                  onChange={(e) => setMentorForm({...mentorForm, skills: e.target.value})}
                />
                <p className="text-xs text-muted-foreground mt-1">Separate skills with commas</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleBecomeMentor}
                disabled={!mentorForm.fullName || !mentorForm.bio || !mentorForm.skills || isLoading}
                className="flex-1 ufo-gradient"
              >
                {isLoading ? "Setting up..." : "Become Mentor"}
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
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-8">
              {renderForm()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};