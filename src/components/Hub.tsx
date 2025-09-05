import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, Eye, Rocket, MessageSquare, BookOpen, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOracle } from "@/hooks/useOracle";
import { ProjectOnboarding } from "@/components/ProjectOnboarding";

interface HubProps {
  userProfile: any;
  onProjectOnboarding: () => void;
}

export const Hub = ({ userProfile, onProjectOnboarding }: HubProps) => {
  const [showProjectCreation, setShowProjectCreation] = useState(false);
  const { signOut } = useAuth();
  const { teams, members, updates } = useOracle('unassigned');

  const handleCreateProject = () => {
    setShowProjectCreation(true);
  };

  const handleProjectComplete = (role: string, data?: any) => {
    setShowProjectCreation(false);
    onProjectOnboarding();
  };

  if (showProjectCreation) {
    return <ProjectOnboarding onComplete={handleProjectComplete} />;
  }

  const featuredTeams = teams?.slice(0, 6) || [];

  const renderMyProjects = () => {
    const userTeams = teams?.filter(team => 
      members?.some(member => 
        member.team_id === team.id && 
        member.name === userProfile.full_name
      )
    ) || [];

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">My Projects</h2>
          <Button onClick={handleCreateProject} className="ufo-gradient">
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>

        {userTeams.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Rocket className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Ready to start building something amazing?
              </p>
              <Button onClick={handleCreateProject} className="ufo-gradient">
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userTeams.map((team) => (
              <Card key={team.id} className="hover:glow-border transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-lg">{team.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {team.description}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">{team.stage}</Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {members?.filter(m => m.team_id === team.id).length || 0}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderExploreTeams = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Explore Projects</h2>
        <p className="text-muted-foreground">
          Discover innovative projects and find collaboration opportunities
        </p>
      </div>

      {featuredTeams.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Eye className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No projects to explore yet</h3>
            <p className="text-muted-foreground">
              Be the first to create a project!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredTeams.map((team) => {
            const teamMembers = members?.filter(m => m.team_id === team.id) || [];
            const recentUpdates = updates?.filter(u => u.team_id === team.id)?.slice(0, 1) || [];
            
            return (
              <Card key={team.id} className="hover:glow-border transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-lg">{team.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {team.description}
                      </p>
                    </div>
                    
                    {recentUpdates.length > 0 && (
                      <div className="bg-muted/30 p-3 rounded-lg">
                        <p className="text-sm line-clamp-2">{recentUpdates[0].content}</p>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{team.stage}</Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {teamMembers.length}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderRecommendations = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Recommended for You</h2>
        <p className="text-muted-foreground">
          Based on your skills and interests
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">Potential Collaborators</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Find people with complementary skills to your profile
            </p>
            <Button size="sm" variant="outline" className="w-full">
              <Users className="w-4 h-4 mr-2" />
              Browse Profiles
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">Learning Resources</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Resources tailored to your learning goals and skills
            </p>
            <Button size="sm" variant="outline" className="w-full">
              <BookOpen className="w-4 h-4 mr-2" />
              View Resources
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-glow mb-2">
                Welcome back, {userProfile.full_name?.split(' ')[0] || 'Innovator'}! 👋
              </h1>
              <p className="text-muted-foreground">
                Ready to build something amazing today?
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* User Profile Summary */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold">Your Profile</h3>
                    {userProfile.bio && (
                      <p className="text-sm text-muted-foreground">{userProfile.bio}</p>
                    )}
                  </div>
                  
                  {userProfile.skills && userProfile.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {userProfile.skills.slice(0, 5).map((skill: string) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                      {userProfile.skills.length > 5 && (
                        <Badge variant="outline">+{userProfile.skills.length - 5} more</Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <Button size="sm" variant="outline">
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Tabs defaultValue="projects" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
              <TabsTrigger value="projects">My Projects</TabsTrigger>
              <TabsTrigger value="explore">Explore</TabsTrigger>
              <TabsTrigger value="recommendations">For You</TabsTrigger>
              <TabsTrigger value="messages" className="hidden lg:flex">
                <MessageSquare className="w-4 h-4 mr-2" />
                Messages
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects">
              {renderMyProjects()}
            </TabsContent>

            <TabsContent value="explore">
              {renderExploreTeams()}
            </TabsContent>

            <TabsContent value="recommendations">
              {renderRecommendations()}
            </TabsContent>

            <TabsContent value="messages">
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Messages coming soon</h3>
                <p className="text-muted-foreground">
                  Connect and collaborate with other innovators
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};