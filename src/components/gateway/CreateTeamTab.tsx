import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Rocket, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function CreateTeamTab() {
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [projectGoal, setProjectGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get current user session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Please sign in first before creating a team');
      }

      // Create team via the RPC function
      const { data, error } = await supabase
        .rpc('create_team_with_project_data', {
          p_team_name: teamName.trim(),
          p_description: description.trim(),
          p_problem_statement: projectGoal.trim() || 'To be defined',
          p_solution_approach: 'To be determined based on team collaboration',
          p_target_audience: 'To be identified during planning',
          p_project_type: 'collaborative',
          p_skills_needed: ['teamwork', 'communication'],
          p_tech_requirements: [],
          p_team_size_needed: 3,
          p_timeline_months: 6
        });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; error?: string; team_id?: string; access_code?: string };

      if (!result.success) {
        throw new Error(result.error || 'Failed to create team');
      }

      toast.success(`Team "${teamName}" created successfully! Your access code: ${result.access_code}`);
      
      // Redirect to dashboard
      navigate('/');
      
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Rocket className="mx-auto h-16 w-16 text-primary mb-4" />
        <h2 className="text-2xl font-bold mb-2">Create Your Team</h2>
        <p className="text-muted-foreground">
          Start your PieFi journey by creating a team and setting your project goals
        </p>
      </div>

      <form onSubmit={handleCreateTeam} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="team-name">Team Name</Label>
          <Input
            id="team-name"
            type="text"
            placeholder="Enter your team name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Team Description</Label>
          <Textarea
            id="description"
            placeholder="Briefly describe what your team will work on"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-goal">Project Goal</Label>
          <Textarea
            id="project-goal"
            placeholder="What specific goal or outcome do you want to achieve?"
            value={projectGoal}
            onChange={(e) => setProjectGoal(e.target.value)}
            rows={3}
          />
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Button type="submit" className="w-full" disabled={loading || !teamName}>
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
      </form>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-2">What happens next?</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• You'll become the team creator with full access</li>
              <li>• An access code will be generated for your team</li>
              <li>• Share the code with team members to invite them</li>
              <li>• Start collaborating on your project goals</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}