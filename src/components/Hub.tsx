import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Users, 
  UserCheck, 
  Sparkles,
  Rocket,
  MessageCircle,
  Globe,
  Search
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SuperOracle } from "./SuperOracle";

interface HubProps {
  userProfile: any;
  onCreateProject: () => void;
}

interface Team {
  id: string;
  name: string;
  description: string;
  tags: string[];
  stage: string;
  ai_summary?: string;
  member_count?: number;
}

export const Hub = ({ userProfile, onCreateProject }: HubProps) => {
  const [accessCode, setAccessCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const { toast } = useToast();
  const { updateProfile } = useAuth();

  useEffect(() => {
    fetchPublicTeams();
  }, []);

  const fetchPublicTeams = async () => {
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select(`
          *
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

  const handleJoinTeam = async () => {
    if (!accessCode.trim()) {
      toast({
        title: "Access Code Required",
        description: "Please enter an access code to join a team.",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    try {
      const { data: accessCodeData, error } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', accessCode.trim())
        .eq('is_active', true)
        .single();

      if (error || !accessCodeData) {
        throw new Error('Invalid access code');
      }

      const { error: profileError } = await updateProfile({
        role: accessCodeData.role || 'builder',
        team_id: accessCodeData.team_id
      });

      if (profileError) throw profileError;

      toast({ title: "Successfully Joined! 🎉" });
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join team.",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleBecomeMentor = async () => {
    try {
      const { error } = await updateProfile({ role: 'mentor' });
      if (error) throw error;
      toast({ title: "Welcome, Mentor! 🎓" });
      window.location.reload();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-glow mb-4">Welcome to the Hub! 🌟</h1>
            <p className="text-xl text-muted-foreground mb-2">Hey {userProfile?.full_name || 'there'}!</p>
            <p className="text-muted-foreground">What would you like to do today?</p>
          </div>

          <Tabs defaultValue="actions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="actions">Get Started</TabsTrigger>
              <TabsTrigger value="community">Explore Community</TabsTrigger>
            </TabsList>

            <TabsContent value="actions" className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <Card className="glow-border interactive-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Plus className="h-6 w-6 text-primary" />
                      Create New Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">Start your own project and become the owner</p>
                    <Button onClick={onCreateProject} className="w-full ufo-gradient">
                      <Rocket className="h-4 w-4 mr-2" />
                      Launch Project
                    </Button>
                  </CardContent>
                </Card>

                <Card className="glow-border interactive-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Users className="h-6 w-6 text-primary" />
                      Join a Team
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">Have an access code? Join an existing project</p>
                    <Input
                      placeholder="Enter access code..."
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    />
                    <Button onClick={handleJoinTeam} disabled={isJoining} className="w-full" variant="outline">
                      {isJoining ? "Joining..." : "Join Team"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="glow-border interactive-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <UserCheck className="h-6 w-6 text-primary" />
                      Become a Mentor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">Share your expertise and guide other builders</p>
                    <Button onClick={handleBecomeMentor} className="w-full" variant="outline">
                      Join as Mentor
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="glow-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Your Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Your Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {userProfile?.skills?.map((skill: string) => (
                          <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                        )) || <span className="text-muted-foreground text-sm">No skills listed</span>}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Looking For</h4>
                      <div className="flex flex-wrap gap-1">
                        {userProfile?.looking_for_skills?.map((skill: string) => (
                          <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                        )) || <span className="text-muted-foreground text-sm">Not specified</span>}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Interests</h4>
                      <div className="flex flex-wrap gap-1">
                        {userProfile?.interests?.map((interest: string) => (
                          <Badge key={interest} variant="outline" className="text-xs">{interest}</Badge>
                        )) || <span className="text-muted-foreground text-sm">Not specified</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="community" className="space-y-6">
              {/* Search and Filters */}
              <div className="space-y-4">
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
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading teams...</p>
                </div>
              ) : (
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
                          {team.ai_summary || team.description || "No description available"}
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
                          <Badge variant="secondary">
                            <Globe className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!loading && filteredTeams.length === 0 && (
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
              <Card className="glow-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Ask Oracle - Your AI Guide
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Get insights about the innovation ecosystem, explore opportunities, 
                    and find your path. Oracle can help you understand different roles 
                    and discover what interests you most!
                  </p>
                  <SuperOracle selectedRole={userProfile?.role || "builder"} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};