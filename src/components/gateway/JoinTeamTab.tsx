import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Search, Key, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface JoinTeamTabProps {
  onTeamJoined?: (teamData: any) => void;
}

export const JoinTeamTab = ({ onTeamJoined }: JoinTeamTabProps) => {
  const [accessCode, setAccessCode] = useState('');
  const [builderName, setBuilderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const { toast } = useToast();

  const handleLookupTeam = async () => {
    if (!accessCode.trim()) {
      toast({
        title: "Access Code Required",
        description: "Please enter a team access code to look up the team.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: team, error } = await supabase
        .from('teams')
        .select(`
          *,
          members:members(count)
        `)
        .eq('access_code', accessCode.toUpperCase())
        .single();

      if (error || !team) {
        toast({
          title: "Team Not Found",
          description: "No team found with that access code. Please check and try again.",
          variant: "destructive"
        });
        setTeamInfo(null);
        return;
      }

      setTeamInfo({
        ...team,
        memberCount: team.members?.[0]?.count || 0
      });

    } catch (error) {
      console.error('Team lookup error:', error);
      toast({
        title: "Lookup Failed",
        description: "Failed to look up team. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!builderName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to join the team.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Use the access code function
      const { data, error } = await supabase.rpc('use_access_code', {
        p_user_id: user.id,
        p_code: accessCode.toUpperCase(),
        p_builder_name: builderName.trim()
      });

      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        toast({
          title: "Failed to Join Team",
          description: result.error || "Unable to join team. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Successfully Joined Team!",
        description: `Welcome to ${result.team_name}! You're now part of the team.`,
      });

      onTeamJoined?.({
        team: teamInfo,
        role: result.role,
        success: true
      });

    } catch (error) {
      console.error('Join team error:', error);
      toast({
        title: "Failed to Join Team",
        description: error.message || "Failed to join team. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
        <CardContent className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-blue-500/20">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2">Join an Existing Team</h2>
          <p className="text-muted-foreground">
            Enter a team access code to join an active project and start collaborating.
          </p>
        </CardContent>
      </Card>

      {/* Access Code Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Team Access Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="accessCode">Access Code</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="accessCode"
                placeholder="Enter 6-character code (e.g., ABC123)"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono"
              />
              <Button 
                variant="outline" 
                onClick={handleLookupTeam}
                disabled={isLoading || !accessCode.trim()}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Ask your team creator for the 6-character access code.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Team Info Display */}
      {teamInfo && (
        <Card className="border-green-200/50 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Team Found: {teamInfo.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Project Overview</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {teamInfo.project_description || teamInfo.description || 'No description provided'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-sm mb-2">Project Type</h5>
                <Badge variant="outline">{teamInfo.project_type || 'Not specified'}</Badge>
              </div>
              
              <div>
                <h5 className="font-medium text-sm mb-2">Team Size</h5>
                <p className="text-sm text-muted-foreground">
                  {teamInfo.memberCount || 0} / {teamInfo.max_members || 5} members
                </p>
              </div>
            </div>

            {teamInfo.tech_stack && teamInfo.tech_stack.length > 0 && (
              <div>
                <h5 className="font-medium text-sm mb-2">Tech Stack</h5>
                <div className="flex flex-wrap gap-1">
                  {teamInfo.tech_stack.map((tech: string) => (
                    <Badge key={tech} variant="secondary" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {teamInfo.skills_needed && teamInfo.skills_needed.length > 0 && (
              <div>
                <h5 className="font-medium text-sm mb-2">Skills Needed</h5>
                <div className="flex flex-wrap gap-1">
                  {teamInfo.skills_needed.map((skill: string) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="builderName">Your Name</Label>
                  <Input
                    id="builderName"
                    placeholder="Enter your name"
                    value={builderName}
                    onChange={(e) => setBuilderName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <Button 
                  onClick={handleJoinTeam}
                  disabled={isLoading || !builderName.trim()}
                  className="w-full"
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Join Team
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips for Joining Teams</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-primary/20 mt-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <p><strong>Be Active:</strong> Engage with your team regularly and contribute to discussions.</p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-primary/20 mt-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <p><strong>Share Skills:</strong> Let your team know what you bring to the table.</p>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-primary/20 mt-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <p><strong>Ask Questions:</strong> Don't hesitate to ask for clarification or help.</p>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-primary/20 mt-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>
              <p><strong>Track Progress:</strong> Use Oracle to log your contributions and progress.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};