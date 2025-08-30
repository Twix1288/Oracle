import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Team {
  id: string;
  name: string;
  description: string | null;
  stage: string | null;
  tags: string[] | null;
  member_count: number;
}

interface TeamSelectorProps {
  onTeamSelected: () => void;
}

export const TeamSelector = ({ onTeamSelected }: TeamSelectorProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      // Get all teams with member count
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          description,
          stage,
          tags
        `);

      if (error) throw error;

      // Get member counts for each team
      const teamsWithCounts = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

          return {
            ...team,
            member_count: count || 0
          };
        })
      );

      setTeams(teamsWithCounts);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error",
        description: "Failed to load teams. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (teamId: string, teamName: string) => {
    if (!user) return;

    setJoining(teamId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          team_id: teamId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Welcome to the team!",
        description: `You've successfully joined ${teamName}. Let's get started!`
      });

      onTeamSelected();
    } catch (error) {
      console.error('Error joining team:', error);
      toast({
        title: "Join Failed",
        description: "Failed to join the team. Please try again.",
        variant: "destructive"
      });
    } finally {
      setJoining(null);
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-cosmic p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-glow mb-2">Welcome to PieFi!</h1>
          <p className="text-muted-foreground text-lg">
            Choose your team to get started on your journey
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams by name, description, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card/50 border-primary/20"
          />
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <Card key={team.id} className="glow-border bg-card/50 backdrop-blur hover:bg-card/70 transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {team.description || "No description available"}
                    </CardDescription>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{team.member_count}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stage */}
                {team.stage && (
                  <div>
                    <Badge variant="outline" className="text-xs">
                      {team.stage.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                )}

                {/* Tags */}
                {team.tags && team.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {team.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {team.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{team.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Join Button */}
                <Button
                  onClick={() => handleJoinTeam(team.id, team.name)}
                  disabled={joining === team.id}
                  className="w-full ufo-gradient"
                >
                  {joining === team.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Join Team
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTeams.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No teams found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try adjusting your search terms" : "No teams are available right now"}
            </p>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 text-center">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Can't find your team? Contact your team lead or project administrator for assistance.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};