import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, Users, Eye, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Team {
  id: string;
  name: string;
  description: string;
  project_type: string;
  target_audience: string;
  problem_statement: string;
  solution_approach: string;
  skills_needed: string[];
  tech_requirements: string[];
  team_size_needed: number;
  timeline_months: number;
  stage: string;
  ai_summary: string;
  created_at: string;
  member_count?: number;
}

export const CommunityTab = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPublicTeams();
  }, []);

  const fetchPublicTeams = async () => {
    try {
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select(`
          *,
          members!inner(id)
        `)
        .eq('stage', 'formation')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process teams with member count
      const processedTeams = teamsData?.map(team => ({
        ...team,
        member_count: team.members?.length || 0
      })) || [];

      setTeams(processedTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRequest = async (teamId: string) => {
    // This would create a join request - implement based on your join request system
    toast({
      title: "Join Request Sent",
      description: "Your request to join this team has been sent to the team creator.",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Globe className="h-6 w-6 text-primary" />
            <CardTitle>Community</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading community projects...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Globe className="h-6 w-6 text-primary" />
          <CardTitle>Community</CardTitle>
        </div>
        <CardDescription>
          Discover active projects and connect with teams
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {teams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active projects to display yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create the first team to get the community started!
              </p>
            </div>
          ) : (
            teams.map((team) => (
              <Card key={team.id} className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{team.project_type}</Badge>
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {team.member_count}/{team.team_size_needed}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleJoinRequest(team.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {team.problem_statement || team.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{team.target_audience}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{team.timeline_months} months timeline</span>
                    </div>
                  </div>

                  {team.skills_needed && team.skills_needed.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Skills Needed:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {team.skills_needed.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {team.skills_needed.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{team.skills_needed.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {team.tech_requirements && team.tech_requirements.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Tech Stack:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {team.tech_requirements.slice(0, 3).map((tech) => (
                          <Badge key={tech} variant="secondary" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                        {team.tech_requirements.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{team.tech_requirements.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};