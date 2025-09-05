import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Eye, 
  Users, 
  MessageCircle, 
  TrendingUp,
  Sparkles,
  Search,
  Globe
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SuperOracle } from "./SuperOracle";

interface Team {
  id: string;
  name: string;
  description: string;
  tags: string[];
  stage: string;
  member_count?: number;
}

export const GuestDashboard = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPublicTeams();
  }, []);

  const fetchPublicTeams = async () => {
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          description,
          tags,
          stage
        `)
        .limit(12)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts for each team
      const teamsWithCounts = await Promise.all(
        teams.map(async (team) => {
          const { count } = await supabase
            .from('members')
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
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    try {
      const { error } = await updateProfile({
        onboarding_completed: false,
        role: 'unassigned'
      });
      if (error) throw error;
      
      toast({
        title: "Let's complete your profile!",
        description: "Redirecting to onboarding..."
      });
      
      // Trigger re-render to show onboarding
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const allTags = [...new Set(teams.flatMap(team => team.tags || []))];

  const filteredTeams = teams.filter(team => {
    const matchesSearch = searchQuery === "" || 
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = selectedTag === "" || team.tags?.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-glow mb-4">
              <Globe className="inline h-10 w-10 mr-3 text-primary" />
              Explore Teams & Projects 🌟
            </h1>
            <p className="text-xl text-muted-foreground mb-4">Welcome, Guest Explorer!</p>
            <p className="text-muted-foreground mb-6">
              Discover amazing teams, see what they're building, and get inspired by the community
            </p>
            
            <Button onClick={handleCompleteProfile} className="ufo-gradient mb-8">
              <Sparkles className="h-4 w-4 mr-2" />
              Complete Profile to Join Teams
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search teams and projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedTag === "" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag("")}
                >
                  All Categories
                </Button>
                {allTags.slice(0, 10).map((tag) => (
                  <Button
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTag(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Teams Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {filteredTeams.map((team) => (
              <Card key={team.id} className="glow-border interactive-card">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span className="line-clamp-1">{team.name}</span>
                    <Badge variant="outline" className="ml-2 shrink-0">
                      {team.stage}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {team.description || "No description available"}
                  </p>
                  
                  {team.tags && team.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {team.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
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
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">{team.member_count || 0} members</span>
                    </div>
                    <Button size="sm" variant="outline" disabled>
                      <Eye className="h-4 w-4 mr-2" />
                      View Only
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTeams.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No teams found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedTag 
                  ? "Try adjusting your search filters" 
                  : "No public teams available at the moment"
                }
              </p>
            </div>
          )}

          {/* Oracle Section */}
          <Card className="glow-border mt-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-primary" />
                Ask Oracle - Your AI Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Get insights about the innovation ecosystem, explore opportunities, 
                and find your path as a guest. Oracle can help you understand different roles 
                and discover what interests you most!
              </p>
              <SuperOracle selectedRole="guest" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};