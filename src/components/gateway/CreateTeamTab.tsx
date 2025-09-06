import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ProjectOnboarding } from '@/components/onboarding/ProjectOnboarding';
import { useNavigate } from 'react-router-dom';

export const CreateTeamTab = () => {
  const [showProjectOnboarding, setShowProjectOnboarding] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleProjectComplete = (teamData: any) => {
    // Navigate to team dashboard after successful team creation
    navigate('/');
    window.location.reload(); // Refresh to update user's team context
  };

  if (showProjectOnboarding) {
    return (
      <ProjectOnboarding
        userId={user!.id}
        onComplete={handleProjectComplete}
        onCancel={() => setShowProjectOnboarding(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Plus className="h-6 w-6 text-primary" />
          <CardTitle>Create New Team</CardTitle>
        </div>
        <CardDescription>
          Start a new project and build your team with comprehensive project onboarding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <div className="bg-muted/30 rounded-lg p-6">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Project-Focused Team Creation</h3>
            <p className="text-muted-foreground mb-4">
              Our enhanced onboarding will help you define your project, identify needed skills, 
              and create a comprehensive team profile that attracts the right collaborators.
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-md mx-auto">
              <li>• Define your project vision and goals</li>
              <li>• Specify required skills and technologies</li>
              <li>• Set team size and timeline expectations</li>
              <li>• Get AI-powered project analysis</li>
              <li>• Generate team access codes automatically</li>
            </ul>
          </div>
          
          <Button 
            onClick={() => setShowProjectOnboarding(true)}
            className="w-full"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Start Project Onboarding
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};