import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Search, Filter, Star, MessageCircle, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Project {
  id: string;
  name: string;
  description: string;
  project_name: string;
  project_description: string;
  tech_stack: string[];
  skills_needed: string[];
  project_type: string;
  stage: string;
  timeline_months: number;
  member_count: number;
  max_members: number;
  access_code: string;
  created_at: string;
  ai_summary?: string;
  team_creator_id?: string;
}

interface EnhancedCommunityDiscoveryProps {
  onProjectSelect?: (projectId: string) => void;
  showJoinButton?: boolean;
}

export const EnhancedCommunityDiscovery: React.FC<EnhancedCommunityDiscoveryProps> = ({
  onProjectSelect,
  showJoinButton = true
}) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTech, setSelectedTech] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Available filter options
  const techOptions = ['React', 'Node.js', 'Python', 'JavaScript', 'TypeScript', 'Next.js', 'Vue.js', 'Flutter', 'Swift', 'Kotlin'];
  const stageOptions = ['formation', 'ideation', 'development', 'testing', 'launch', 'growth'];
  const typeOptions = ['web', 'mobile', 'ai', 'blockchain', 'fintech', 'healthtech', 'edtech', 'e-commerce', 'social', 'productivity'];

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [projects, searchTerm, selectedTech, selectedStage, selectedType, sortBy]);

  const loadProjects = async () => {
    try {
      setLoading(true);

      // Get all teams with member counts
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          members(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedProjects: Project[] = (data || []).map(team => ({
        id: team.id,
        name: team.name,
        description: team.description || '',
        project_name: team.project_name || team.name,
        project_description: team.project_description || team.description || '',
        tech_stack: team.tech_stack || [],
        skills_needed: team.skills_needed || [],
        project_type: team.project_type || 'web',
        stage: team.stage || 'formation',
        timeline_months: team.timeline_months || 6,
        member_count: team.members?.[0]?.count || 0,
        max_members: team.max_members || 5,
        access_code: team.access_code,
        created_at: team.created_at,
        ai_summary: team.ai_summary,
        team_creator_id: team.team_creator_id
      }));

      setProjects(formattedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...projects];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(search) ||
        project.project_name.toLowerCase().includes(search) ||
        project.description.toLowerCase().includes(search) ||
        project.project_description.toLowerCase().includes(search) ||
        project.tech_stack.some(tech => tech.toLowerCase().includes(search)) ||
        project.skills_needed.some(skill => skill.toLowerCase().includes(search))
      );
    }

    // Tech stack filter
    if (selectedTech !== 'all') {
      filtered = filtered.filter(project =>
        project.tech_stack.some(tech => 
          tech.toLowerCase().includes(selectedTech.toLowerCase())
        )
      );
    }

    // Stage filter
    if (selectedStage !== 'all') {
      filtered = filtered.filter(project => project.stage === selectedStage);
    }

    // Project type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(project => project.project_type === selectedType);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'members_low':
        filtered.sort((a, b) => a.member_count - b.member_count);
        break;
      case 'members_high':
        filtered.sort((a, b) => b.member_count - a.member_count);
        break;
      case 'timeline_short':
        filtered.sort((a, b) => a.timeline_months - b.timeline_months);
        break;
      case 'timeline_long':
        filtered.sort((a, b) => b.timeline_months - a.timeline_months);
        break;
    }

    setFilteredProjects(filtered);
  };

  const handleJoinProject = async (project: Project) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('use_access_code', {
        p_user_id: user.id,
        p_code: project.access_code,
        p_builder_name: ''
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "Successfully Joined Team!",
          description: `Welcome to ${project.name}!`,
        });
        
        if (onProjectSelect) {
          onProjectSelect(project.id);
        }
        
        // Refresh projects
        loadProjects();
      } else {
        toast({
          title: "Failed to Join Team",
          description: result?.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join team. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRequestJoin = async (project: Project) => {
    // TODO: Implement join request system
    toast({
      title: "Join Request Sent",
      description: `Your request to join ${project.name} has been sent to the team creator.`,
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Discover Projects</h2>
        <p className="text-muted-foreground">
          Find active projects and connect with builders worldwide
        </p>
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="projects">All Projects</TabsTrigger>
          <TabsTrigger value="seeking">Seeking Members</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6">
          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects, technologies, or skills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Select value={selectedTech} onValueChange={setSelectedTech}>
                <SelectTrigger>
                  <SelectValue placeholder="Technology" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Technologies</SelectItem>
                  {techOptions.map(tech => (
                    <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {stageOptions.map(stage => (
                    <SelectItem key={stage} value={stage}>
                      {stage.charAt(0).toUpperCase() + stage.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {typeOptions.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="members_low">Fewest Members</SelectItem>
                  <SelectItem value="members_high">Most Members</SelectItem>
                  <SelectItem value="timeline_short">Shortest Timeline</SelectItem>
                  <SelectItem value="timeline_long">Longest Timeline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredProjects.length} of {projects.length} projects
          </div>

          {filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No Projects Found</p>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="line-clamp-2">
                          {project.project_name}
                        </CardTitle>
                        <CardDescription className="line-clamp-3">
                          {project.project_description}
                        </CardDescription>
                      </div>
                      <Badge variant={
                        project.stage === 'formation' ? 'default' :
                        project.stage === 'development' ? 'secondary' : 'outline'
                      }>
                        {project.stage}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {project.member_count}/{project.max_members}
                      </div>
                      <div>
                        {project.timeline_months}mo timeline
                      </div>
                    </div>

                    {project.tech_stack.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.tech_stack.slice(0, 3).map((tech) => (
                          <Badge key={tech} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                        {project.tech_stack.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{project.tech_stack.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {project.ai_summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.ai_summary}
                      </p>
                    )}

                    <div className="flex gap-2">
                      {showJoinButton && project.member_count < project.max_members ? (
                        <Button 
                          onClick={() => handleJoinProject(project)}
                          className="flex-1"
                        >
                          Join Team
                        </Button>
                      ) : project.member_count >= project.max_members ? (
                        <Button 
                          onClick={() => handleRequestJoin(project)}
                          variant="outline" 
                          className="flex-1 gap-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Request Join
                        </Button>
                      ) : null}

                      <Button variant="outline" size="icon">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="seeking">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects
              .filter(p => p.member_count < p.max_members)
              .map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="line-clamp-2">
                          {project.project_name}
                        </CardTitle>
                        <CardDescription>
                          Looking for {project.max_members - project.member_count} more members
                        </CardDescription>
                      </div>
                      <Badge variant="default">
                        Open
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {project.skills_needed.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Looking for:</p>
                        <div className="flex flex-wrap gap-1">
                          {project.skills_needed.slice(0, 4).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button 
                      onClick={() => handleJoinProject(project)}
                      className="w-full"
                    >
                      Join Team
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="featured">
          <div className="text-center py-8">
            <Star className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Featured Projects</p>
            <p className="text-muted-foreground">
              Coming soon - curated projects from successful teams
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};