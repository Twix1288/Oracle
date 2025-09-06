import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FolderOpen, Plus, Eye, EyeOff, Sparkles, TrendingUp, Users, Clock, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProjectUpdate {
  id: string;
  content: string;
  update_type: string;
  visibility: string;
  created_at: string;
  oracle_insights?: any;
}

interface Project {
  id: string;
  name: string;
  description: string;
  project_visibility: string;
  oracle_summary: string;
  last_activity: string;
  tech_stack: any;
  stage: string;
  seeking_collaborators: boolean;
  collaboration_needs: any;
  recent_updates?: ProjectUpdate[];
  member_count?: number;
}

export const ProjectsTab = () => {
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [updateType, setUpdateType] = useState('progress');
  const [updateVisibility, setUpdateVisibility] = useState('public');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUserProjects();
      fetchFeaturedProjects();
    }
  }, [user]);

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

        // Fetch recent updates for each project
        const projectsWithUpdates = await Promise.all(
          (projectsData || []).map(async (project) => {
            const { data: updates } = await supabase
              .from('project_updates')
              .select('*')
              .eq('team_id', project.id)
              .order('created_at', { ascending: false })
              .limit(3);

            const { data: memberCount } = await supabase
              .from('members')
              .select('user_id')
              .eq('team_id', project.id);

            return {
              ...project,
              recent_updates: updates || [],
              member_count: memberCount?.length || 0
            };
          })
        );

        setUserProjects(projectsWithUpdates);
        if (projectsWithUpdates.length > 0 && !selectedProject) {
          setSelectedProject(projectsWithUpdates[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching user projects:', error);
    }
  };

  const fetchFeaturedProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('project_visibility', 'public')
        .eq('seeking_collaborators', true)
        .order('last_activity', { ascending: false })
        .limit(6);

      if (error) throw error;

      const projectsWithMembers = await Promise.all(
        (data || []).map(async (project) => {
          const { data: memberCount } = await supabase
            .from('members')
            .select('user_id')
            .eq('team_id', project.id);

          return {
            ...project,
            member_count: memberCount?.length || 0
          };
        })
      );

      setFeaturedProjects(projectsWithMembers);
    } catch (error) {
      console.error('Error fetching featured projects:', error);
    } finally {
      setIsLoading(false);
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
        description: "Oracle is analyzing your update for connection opportunities!",
      });

      setNewUpdate('');
      fetchUserProjects(); // Refresh to show new update
    } catch (error) {
      console.error('Error adding update:', error);
      toast({
        title: "Error",
        description: "Failed to add update.",
        variant: "destructive"
      });
    }
  };

  const toggleProjectVisibility = async (projectId: string, currentVisibility: string) => {
    const newVisibility = currentVisibility === 'public' ? 'private' : 'public';
    
    try {
      const { error } = await supabase
        .from('teams')
        .update({ project_visibility: newVisibility })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Visibility Updated",
        description: `Project is now ${newVisibility}`,
      });

      fetchUserProjects();
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast({
        title: "Error",
        description: "Failed to update visibility.",
        variant: "destructive"
      });
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'ideation': return 'bg-blue-100 text-blue-800';
      case 'development': return 'bg-yellow-100 text-yellow-800';
      case 'testing': return 'bg-orange-100 text-orange-800';
      case 'launch': return 'bg-green-100 text-green-800';
      case 'growth': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUpdateTypeIcon = (type: string) => {
    switch (type) {
      case 'milestone': return <TrendingUp className="h-3 w-3" />;
      case 'challenge': return <Zap className="h-3 w-3" />;
      case 'success': return <Sparkles className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
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
      {/* Your Projects */}
      <Card className="glow-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Your Projects</CardTitle>
            </div>
            <Button onClick={() => setShowAddProject(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Project
            </Button>
          </div>
          <CardDescription>
            Manage your projects and share quick updates with the community
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {userProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first project to start building!</p>
              <Button onClick={() => setShowAddProject(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userProjects.map((project) => (
                  <div key={project.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{project.name}</h3>
                          <Badge className={getStageColor(project.stage)}>
                            {project.stage}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{project.description}</p>
                        
                        {project.oracle_summary && (
                          <div className="bg-primary/10 p-2 rounded text-xs text-primary mb-2">
                            <div className="flex items-center gap-1 mb-1">
                              <Sparkles className="h-3 w-3" />
                              <span className="font-medium">Oracle Summary:</span>
                            </div>
                            {project.oracle_summary}
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleProjectVisibility(project.id, project.project_visibility)}
                      >
                        {project.project_visibility === 'public' ? 
                          <Eye className="h-4 w-4" /> : 
                          <EyeOff className="h-4 w-4" />
                        }
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{project.member_count} members</span>
                      <Badge variant="outline" className="text-xs">
                        {project.project_visibility}
                      </Badge>
                    </div>
                    
                    {project.tech_stack && project.tech_stack.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {project.tech_stack.slice(0, 3).map((tech, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => setSelectedProject(project.id)}
                      variant={selectedProject === project.id ? "default" : "outline"}
                    >
                      {selectedProject === project.id ? "Selected" : "Select Project"}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Quick Update Form */}
              {selectedProject && (
                <Card className="bg-background/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Add Quick Update</CardTitle>
                    <CardDescription>
                      Share your progress - Oracle will identify collaboration opportunities
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="What did you accomplish today? Any challenges you're facing?"
                      value={newUpdate}
                      onChange={(e) => setNewUpdate(e.target.value)}
                      className="min-h-[80px]"
                    />
                    
                    <div className="flex items-center gap-4">
                      <Select value={updateType} onValueChange={setUpdateType}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="progress">Progress</SelectItem>
                          <SelectItem value="milestone">Milestone</SelectItem>
                          <SelectItem value="challenge">Challenge</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={updateVisibility} onValueChange={setUpdateVisibility}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="team_only">Team Only</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button onClick={handleAddUpdate} disabled={!newUpdate.trim()}>
                        <Sparkles className="h-4 w-4 mr-1" />
                        Share Update
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Featured Projects Seeking Collaboration */}
      <Card className="glow-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">Projects Seeking Collaboration</CardTitle>
          </div>
          <CardDescription>
            Discover exciting projects looking for contributors like you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredProjects.map((project) => (
              <div key={project.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-sm">{project.name}</h4>
                  <Badge className={getStageColor(project.stage)}>
                    {project.stage}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {project.description}
                </p>
                
                {project.oracle_summary && (
                  <div className="bg-green-50 p-2 rounded text-xs text-green-700 mb-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles className="h-3 w-3" />
                      <span className="font-medium">Oracle Insight:</span>
                    </div>
                    {project.oracle_summary.slice(0, 100)}...
                  </div>
                )}
                
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{project.member_count} members</span>
                </div>
                
                {project.collaboration_needs && project.collaboration_needs.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.collaboration_needs.slice(0, 2).map((need, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-orange-50">
                        {need}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <Button size="sm" className="w-full">
                  Express Interest
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};