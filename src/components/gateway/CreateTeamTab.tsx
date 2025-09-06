import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Rocket, Users, Target, Calendar } from 'lucide-react';
import { ProjectOnboarding } from '@/components/onboarding/ProjectOnboarding';

interface CreateTeamTabProps {
  onProjectCreated?: (projectData: any) => void;
}

export const CreateTeamTab = ({ onProjectCreated }: CreateTeamTabProps) => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleStartProject = () => {
    setShowOnboarding(true);
  };

  const handleProjectComplete = (projectData: any) => {
    setShowOnboarding(false);
    onProjectCreated?.(projectData);
  };

  const handleBack = () => {
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <ProjectOnboarding 
          onComplete={handleProjectComplete}
          onBack={handleBack}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary-glow/5 border-primary/20">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/20">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Turn Your Idea Into Reality</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create your project, define your vision, and start building with AI-powered guidance and team matching.
          </p>
          <Button size="lg" onClick={handleStartProject} className="gap-2">
            <Plus className="h-4 w-4" />
            Start Your Project
          </Button>
        </CardContent>
      </Card>

      {/* Process Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <div className="p-2 rounded-full bg-blue-500/20">
                <Target className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <CardTitle className="text-lg">Define Your Vision</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Tell us about your problem, solution, and target audience. Our AI will help refine your concept.
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <div className="p-2 rounded-full bg-green-500/20">
                <Users className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-lg">Build Your Team</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get matched with builders who have complementary skills and share your vision.
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <div className="p-2 rounded-full bg-purple-500/20">
                <Calendar className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <CardTitle className="text-lg">Execute & Scale</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get AI-powered progress tracking, mentorship connections, and growth strategies.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Why Start Your Project Here?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-primary/20 mt-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <h4 className="font-medium">AI-Powered Guidance</h4>
                  <p className="text-sm text-muted-foreground">Get intelligent insights and suggestions throughout your journey.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-primary/20 mt-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Smart Team Matching</h4>
                  <p className="text-sm text-muted-foreground">Connect with builders whose skills complement yours.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-primary/20 mt-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Progress Tracking</h4>
                  <p className="text-sm text-muted-foreground">Stay on track with milestone tracking and automated insights.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-primary/20 mt-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Mentor Access</h4>
                  <p className="text-sm text-muted-foreground">Get connected with experienced mentors in your domain.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-primary/20 mt-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Community Support</h4>
                  <p className="text-sm text-muted-foreground">Join a vibrant community of builders and innovators.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 rounded-full bg-primary/20 mt-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Resource Library</h4>
                  <p className="text-sm text-muted-foreground">Access curated resources, tools, and best practices.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};