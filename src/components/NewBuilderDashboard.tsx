import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Rocket, 
  Users, 
  Target, 
  Settings, 
  CheckCircle,
  MessageSquare
} from "lucide-react";
import { DashboardHeader } from "./DashboardHeader";
import { SuperOracle } from "./SuperOracle";
import { BuilderLounge } from "./BuilderLounge";
import { ProgressTracker } from "./ProgressTracker";
import { useLegacyProjects, type LegacyProject } from "@/hooks/useLegacyProjects";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Team, Member, Update } from "@/types/oracle";

interface NewBuilderDashboardProps {
  teams: Team[];
  members: Member[];
  updates: Update[];
  onExit: () => void;
}

export const NewBuilderDashboard = ({ teams, members, updates, onExit }: NewBuilderDashboardProps) => {
  const { user } = useAuth();
  const {
    projects,
    isLoading,
    createProject,
    updateProject,
    createProjectLoading,
    updateProjectLoading
  } = useLegacyProjects();

  const [activeTab, setActiveTab] = useState("projects");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [editingProject, setEditingProject] = useState<LegacyProject | null>(null);

  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    stage: "ideation" as "ideation" | "development" | "testing" | "launch" | "growth"
  });

  // Find the user's team (they should have one after creating a project)
  const userTeam = teams?.find(team => 
    members?.some(member => member.team_id === team.id && member.user_id === user?.id)
  );

  const teamUpdates = updates?.filter(update => update.team_id === userTeam?.id) || [];

  const handleCreateProject = () => {
    if (!projectForm.title.trim()) {
      toast.error("Project title is required");
      return;
    }

    createProject(projectForm);
    setShowCreateProject(false);
    setProjectForm({
      title: "",
      description: "",
      stage: "ideation"
    });
  };

  const handleUpdateProject = () => {
    if (!editingProject || !projectForm.title.trim()) {
      toast.error("Project title is required");
      return;
    }

    updateProject({
      id: editingProject.id,
      ...projectForm
    });
    setEditingProject(null);
    setProjectForm({
      title: "",
      description: "",
      stage: "ideation"
    });
  };

  const handleEditProject = (project: LegacyProject) => {
    setProjectForm({
      title: project.title,
      description: project.description || "",
      stage: project.stage
    });
    setEditingProject(project);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'ideation': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'development': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'testing': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'launch': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'growth': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cosmic cosmic-sparkle">
        <div className="text-center space-y-6 p-8 ufo-card rounded-xl">
          <div className="ufo-pulse">
            <Rocket className="h-12 w-12 text-primary mx-auto" />
          </div>
          <h2 className="text-2xl font-semibold cosmic-text">Loading Projects...</h2>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardHeader 
        role="builder" 
        userName="Project Builder"
        onExit={onExit}
      />
      
      <div className="container mx-auto px-6 pb-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/20 ufo-pulse">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-glow">Innovation Hub</h1>
              <p className="text-muted-foreground">Your projects and collaborations</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateProject(true)} className="ufo-gradient">
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">My Projects</p>
                  <p className="text-2xl font-bold">{projects?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Teams</p>
                  <p className="text-2xl font-bold">{teams?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold">
                    {projects?.filter(p => p.stage !== 'ideation').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur border-primary/20">
            <TabsTrigger value="projects" className="data-[state=active]:bg-primary/20">
              <Target className="h-4 w-4 mr-2" />
              My Projects
            </TabsTrigger>
            <TabsTrigger value="progress" className="data-[state=active]:bg-primary/20">
              <CheckCircle className="h-4 w-4 mr-2" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="lounge" className="data-[state=active]:bg-primary/20">
              <Users className="h-4 w-4 mr-2" />
              Builder's Lounge
            </TabsTrigger>
            <TabsTrigger value="oracle" className="data-[state=active]:bg-primary/20">
              <MessageSquare className="h-4 w-4 mr-2" />
              Oracle Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <div className="space-y-4">
              {!projects?.length ? (
                <Card className="glow-border bg-card/50 backdrop-blur">
                  <CardContent className="p-8 text-center">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Projects Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start your innovation journey by creating your first project
                    </p>
                    <Button onClick={() => setShowCreateProject(true)} className="ufo-gradient">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Project
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <Card key={project.id} className="glow-border bg-card/50 backdrop-blur">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{project.title}</CardTitle>
                          </div>
                          <Badge className={getStageColor(project.stage)}>
                            {project.stage}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {project.description}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditProject(project)}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="progress">
            {userTeam ? (
              <ProgressTracker 
                team={userTeam}
                updates={teamUpdates}
                userRole="builder"
              />
            ) : (
              <Card className="glow-border bg-card/50 backdrop-blur">
                <CardContent className="p-8 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Team Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create a project to automatically create your team and track progress
                  </p>
                  <Button onClick={() => setShowCreateProject(true)} className="ufo-gradient">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="lounge">
            {user?.id ? (
              <BuilderLounge userId={user.id} />
            ) : (
              <Card className="glow-border bg-card/50 backdrop-blur">
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
                  <p className="text-muted-foreground">
                    Please ensure you're logged in to access the Builder's Lounge
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="oracle">
            <SuperOracle selectedRole="builder" />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Project Dialog */}
      <Dialog open={showCreateProject || !!editingProject} onOpenChange={(open) => {
        if (!open) {
          setShowCreateProject(false);
          setEditingProject(null);
          setProjectForm({
            title: "",
            description: "",
            stage: "ideation"
          });
        }
      }}>
        <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur border-primary/20">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </DialogTitle>
            <DialogDescription>
              {editingProject ? 'Update your project details' : 'Start your innovation journey'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={projectForm.title}
                onChange={(e) => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="What are you building?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={projectForm.description}
                onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your project in detail..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select
                value={projectForm.stage}
                onValueChange={(value: any) => setProjectForm(prev => ({ ...prev, stage: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ideation">Ideation</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="launch">Launch</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={editingProject ? handleUpdateProject : handleCreateProject}
              disabled={createProjectLoading || updateProjectLoading}
            >
              {editingProject ? 'Update Project' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};