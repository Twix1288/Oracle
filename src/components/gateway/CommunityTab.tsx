import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Globe, Search, Filter, Users, Calendar, TrendingUp, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const CommunityTab = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [builders, setBuilders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeView, setActiveView] = useState<'projects' | 'builders'>('projects');
  const { toast } = useToast();

  useEffect(() => {
    loadCommunityData();
  }, []);

  const loadCommunityData = async () => {
    try {
      // Load public projects
      const { data: projectsData } = await supabase
        .from('teams')
        .select(`
          *,
          members:members(count),
          creator:profiles!teams_team_creator_id_fkey(
            full_name, avatar_url
          )
        `)
        .eq('project_visibility', 'public')
        .eq('seeking_collaborators', true)
        .order('last_activity', { ascending: false })
        .limit(20);

      setProjects(projectsData || []);

      // Load active builders
      const { data: buildersData } = await supabase
        .from('profiles')
        .select('id, full_name, bio, avatar_url, skills, experience_level, role, collaboration_karma, builder_level')
        .in('role', ['builder', 'mentor'])
        .not('full_name', 'is', null)
        .order('collaboration_karma', { ascending: false })
        .limit(20);

      setBuilders(buildersData || []);

    } catch (error) {
      console.error('Error loading community data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load community data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (userId: string, userName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to connect with other builders.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('connection_requests')
        .insert({
          requester_id: user.id,
          requested_id: userId,
          request_type: 'collaboration',
          message: `Hi ${userName}! I'd love to connect and explore potential collaborations.`
        });

      if (error) throw error;

      toast({
        title: "Connection Request Sent",
        description: `Your connection request has been sent to ${userName}.`,
      });

    } catch (error) {
      console.error('Error sending connection request:', error);
      toast({
        title: "Error",
        description: "Failed to send connection request.",
        variant: "destructive"
      });
    }
  };

  const handleJoinProject = (teamId: string, accessCode: string) => {
    toast({
      title: "Join Project",
      description: `Use access code: ${accessCode} in the Join Team tab.`,
    });
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchTerm || 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.project_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.tech_stack?.some((tech: string) => tech.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterType === 'all' || project.project_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const filteredBuilders = builders.filter(builder => {
    const matchesSearch = !searchTerm || 
      builder.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      builder.bio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      builder.skills?.some((skill: string) => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterType === 'all' || builder.role === filterType;
    
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500/20">
              <Globe className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Community Discovery</h2>
              <p className="text-muted-foreground">
                Discover amazing projects and connect with talented builders in our community.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={activeView === 'projects' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('projects')}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Projects ({projects.length})
              </Button>
              <Button
                variant={activeView === 'builders' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView('builders')}
              >
                <Users className="h-4 w-4 mr-1" />
                Builders ({builders.length})
              </Button>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${activeView}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {activeView === 'projects' ? (
                    <>
                      <SelectItem value="Web Application">Web App</SelectItem>
                      <SelectItem value="Mobile App">Mobile</SelectItem>
                      <SelectItem value="AI/ML Platform">AI/ML</SelectItem>
                      <SelectItem value="SaaS Product">SaaS</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="builder">Builders</SelectItem>
                      <SelectItem value="mentor">Mentors</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {activeView === 'projects' ? (
        <div className="grid gap-4">
          {filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms or filters.' : 'No public projects are currently seeking collaborators.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        by {project.creator?.full_name || 'Anonymous'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{project.stage}</Badge>
                      <Badge variant="secondary">{project.project_type}</Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {project.project_description || project.description}
                  </p>

                  {project.tech_stack && project.tech_stack.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium mb-2">Tech Stack:</p>
                      <div className="flex flex-wrap gap-1">
                        {project.tech_stack.slice(0, 6).map((tech: string) => (
                          <Badge key={tech} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                        {project.tech_stack.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{project.tech_stack.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {project.members?.[0]?.count || 0} / {project.max_members} members
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {project.timeline_months} months
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleJoinProject(project.id, project.access_code)}
                    >
                      Join Project
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredBuilders.length === 0 ? (
            <Card className="md:col-span-2">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Builders Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms or filters.' : 'No builders match your current filters.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredBuilders.map((builder) => (
              <Card key={builder.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={builder.avatar_url} />
                      <AvatarFallback>
                        {builder.full_name?.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{builder.full_name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {builder.role}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {builder.experience_level}
                            </Badge>
                            {builder.builder_level && (
                              <Badge variant="outline" className="text-xs">
                                {builder.builder_level}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {builder.bio || 'No bio provided'}
                      </p>

                      {builder.skills && builder.skills.length > 0 && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-1">
                            {builder.skills.slice(0, 4).map((skill: string) => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {builder.skills.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{builder.skills.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          Karma: {builder.collaboration_karma || 0}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConnect(builder.id, builder.full_name)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Connect
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};