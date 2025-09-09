import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderOpen, Plus, Sparkles, Users, MessageCircle, Globe } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Project {
  id: string;
  name: string;
  description: string;
  project_visibility: string;
  oracle_summary: string;
  tech_stack: any;
  stage: string;
  seeking_collaborators: boolean;
  member_count?: number;
  team_creator_id?: string;
}

export const EnhancedProjectsTab = () => {
  const [activeView, setActiveView] = useState<'your-projects' | 'public-projects'>('your-projects');
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [updateType, setUpdateType] = useState('progress');
  const [updateVisibility, setUpdateVisibility] = useState('public');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUserProjects();
      fetchPublicProjects();
    } else {
      setMockData();
    }
  }, [user]);

  const setMockData = () => {
    const mockUserProjects: Project[] = [
      {
        id: 'project-1',
        name: 'EcoTracker App',
        description: 'A mobile app to help users track their carbon footprint and get personalized eco-friendly tips.',
        project_visibility: 'public',
        oracle_summary: 'Strong product-market fit potential in sustainability sector. Consider partnering with environmental organizations.',
        tech_stack: ['React Native', 'Node.js', 'PostgreSQL'],
        stage: 'development',
        seeking_collaborators: true,
        member_count: 3,
        team_creator_id: user?.id,
      }
    ];

    const mockPublicProjects: Project[] = [
      {
        id: 'pub-project-1',
        name: 'AI Recipe Generator',
        description: 'Generate personalized recipes based on dietary preferences and available ingredients.',
        project_visibility: 'public',
        oracle_summary: 'Great potential for food tech market. Strong AI/ML component aligns with current trends.',
        tech_stack: ['Python', 'TensorFlow', 'React'],
        stage: 'ideation',
        seeking_collaborators: true,
        member_count: 2,
        team_creator_id: 'other-user-1'
      }
    ];

    setUserProjects(mockUserProjects);
    setPublicProjects(mockPublicProjects);
    setSelectedProject(mockUserProjects[0]?.id);
    setIsLoading(false);
  };

  const fetchUserProjects = async () => {
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('team_id')
        .eq('user_id', user?.id);

      if (memberError) throw memberError;

      if (memberData && memberData.length > 0) {
        const teamIds = memberData.map(m => m.team_id);
        
        const { data: projectsData, error: projectsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);

        if (projectsError) throw projectsError;

        setUserProjects(projectsData || []);
        if (projectsData && projectsData.length > 0 && !selectedProject) {
          setSelectedProject(projectsData[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching user projects:', error);
    }
    setIsLoading(false);
  };

  const fetchPublicProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('project_visibility', 'public')
        .neq('team_creator_id', user?.id)
        .limit(12);

      if (error) throw error;

      setPublicProjects(data || []);
    } catch (error) {
      console.error('Error fetching public projects:', error);
    }
    setIsLoading(false);
  };

  const handleQuickUpdate = async (projectId: string) => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in to create updates.",
          variant: "destructive"
        });
        return;
      }

      // Create a quick progress entry
      const { data, error } = await supabase
        .from('progress_entries')
        .insert({
          team_id: projectId,
          user_id: user.id,
          title: 'Quick Update',
          description: 'Added a quick progress update for this project.',
          category: 'update',
          status: 'in_progress'
        })
        .select()
        .single();

      if (error) throw error;

      setSelectedProject(projectId);
      toast({
        title: "Quick Update Created",
        description: "Your progress update has been recorded!",
      });
    } catch (error) {
      console.error('Error creating quick update:', error);
      toast({
        title: "Error",
        description: "Failed to create update. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleOracleSuggestCollaboration = async (projectId: string) => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in to get Oracle suggestions.",
          variant: "destructive"
        });
        return;
      }

      // Create a collaboration proposal for this project
      const { data, error } = await supabase
        .from('collaboration_proposals')
        .insert({
          proposer_id: user.id,
          target_id: user.id, // Self-proposal for now
          project_id: projectId,
          proposal_type: 'oracle_suggested',
          title: 'Oracle-Suggested Collaboration',
          description: 'Oracle has identified potential collaboration opportunities for this project. Let\'s explore how we can work together!',
          timeline: '2-4 weeks',
          deliverables: ['Initial discussion', 'Project analysis', 'Collaboration plan'],
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Oracle Collaboration Suggested",
        description: "Oracle has created a collaboration proposal for your project!",
      });
    } catch (error) {
      console.error('Error creating Oracle collaboration suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to create collaboration suggestion. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleExpressInterest = async (projectId: string) => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in to express interest.",
          variant: "destructive"
        });
        return;
      }

      // Create a project interest entry
      const { data, error } = await supabase
        .from('project_interests')
        .insert({
          project_id: projectId,
          user_id: user.id,
          status: 'pending',
          message: 'I\'m interested in joining this project! I\'d love to learn more about the team and how I can contribute.'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Interest Expressed",
        description: "Your interest has been sent to the project team!",
      });
    } catch (error) {
      console.error('Error expressing interest:', error);
      toast({
        title: "Error",
        description: "Failed to express interest. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.trim() || !selectedProject) return;

    try {
      const { error } = await supabase
        .from('project_updates')
        .insert({
          team_id: selectedProject,
          user_id: user?.id,
          content: newUpdate,
          update_type: updateType,
          visibility: updateVisibility
        });

      if (error) throw error;

      toast({
        title: "Update Added",
        description: "Oracle is analyzing your update for collaboration opportunities!",
      });

      setNewUpdate('');
      fetchUserProjects();
    } catch (error) {
      console.error('Error adding update:', error);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'ideation': return 'bg-blue-100 text-blue-800';
      case 'development': return 'bg-yellow-100 text-yellow-800';
      case 'testing': return 'bg-orange-100 text-orange-800';
      case 'launch': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="glow-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glow-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Projects</CardTitle>
            </div>
            {activeView === 'your-projects' && (
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Project
              </Button>
            )}
          </div>
          <CardDescription>
            Manage your projects and discover collaboration opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="your-projects" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Your Projects
              </TabsTrigger>
              <TabsTrigger value="public-projects" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Public Projects
              </TabsTrigger>
            </TabsList>

            <TabsContent value="your-projects" className="space-y-6">
              {userProjects.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first project to start building!</p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userProjects.map((project) => (
                    <Card key={project.id} className="glow-border">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">{project.name}</h3>
                              <Badge className={getStageColor(project.stage)}>
                                {project.stage}
                              </Badge>
                            </div>
                            
                            <p className="text-muted-foreground mb-3">{project.description}</p>
                            
                            {project.oracle_summary && (
                              <div className="bg-primary/10 p-3 rounded-lg mb-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <Sparkles className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium text-primary">Oracle Summary</span>
                                </div>
                                <p className="text-sm text-primary">{project.oracle_summary}</p>
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                              {project.tech_stack?.slice(0, 4).map((tech: string, idx: number) => (
                                <Badge key={idx} variant="outline">
                                  {tech}
                                </Badge>
                              ))}
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span className="text-xs">{project.member_count || 1} members</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm"
                            onClick={() => handleQuickUpdate(project.id)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Quick Update
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleOracleSuggestCollaboration(project.id)}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Oracle Suggest
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="public-projects" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicProjects.map((project) => (
                  <Card key={project.id} className="glow-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-sm">{project.name}</h3>
                            <Badge className={getStageColor(project.stage)}>
                              {project.stage}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{project.description}</p>
                          
                          {project.oracle_summary && (
                            <div className="bg-primary/10 p-2 rounded text-xs text-primary mb-3">
                              <div className="flex items-center gap-1 mb-1">
                                <Sparkles className="h-3 w-3" />
                                <span className="font-medium">Oracle Summary:</span>
                              </div>
                              {project.oracle_summary}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1 mb-3">
                            {project.tech_stack?.slice(0, 3).map((tech: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                          </div>

                          <Button 
                            size="sm" 
                            className="w-full text-xs"
                            onClick={() => handleExpressInterest(project.id)}
                          >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Express Interest
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Quick Update Form */}
          {selectedProject && (
            <Card className="glow-border mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Quick Update</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="What progress have you made?"
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                />
                <div className="flex items-center gap-4">
                  <Select value={updateType} onValueChange={setUpdateType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="progress">Progress</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button onClick={handleAddUpdate} disabled={!newUpdate.trim()}>
                    Add Update
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
