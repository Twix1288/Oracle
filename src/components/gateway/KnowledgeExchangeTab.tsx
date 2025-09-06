import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { GraduationCap, BookOpen, Users, Star, MessageCircle, Calendar, Clock, Target, Plus, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Mentor {
  id: string;
  name: string;
  bio: string;
  expertise_areas: string[];
  experience_level: string;
  availability: string;
  mentorship_style: string;
  rating: number;
  sessions_completed: number;
  specialties: string[];
  languages: string[];
  avatar?: string;
}

interface LearningResource {
  id: string;
  title: string;
  description: string;
  type: 'tutorial' | 'course' | 'workshop' | 'documentation' | 'video' | 'article';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  creator: {
    name: string;
    avatar?: string;
  };
  rating: number;
  duration_minutes?: number;
  url: string;
  is_free: boolean;
  created_at: string;
}

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  topic: string;
  meeting_schedule: string;
  member_count: number;
  max_members: number;
  difficulty_level: string;
  organizer: {
    id: string;
    name: string;
    avatar?: string;
  };
  next_meeting: string;
  meeting_format: 'online' | 'offline' | 'hybrid';
  status: 'open' | 'full' | 'closed';
}

interface Workshop {
  id: string;
  title: string;
  description: string;
  instructor: {
    name: string;
    expertise: string;
    avatar?: string;
  };
  scheduled_date: string;
  duration_hours: number;
  max_participants: number;
  current_participants: number;
  skill_level: string;
  topics_covered: string[];
  cost: number;
  workshop_type: 'live' | 'recorded' | 'interactive';
}

export const KnowledgeExchangeTab = () => {
  const [activeSection, setActiveSection] = useState<'mentors' | 'resources' | 'study_groups' | 'workshops'>('mentors');
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchKnowledgeData();
  }, [activeSection]);

  const fetchKnowledgeData = async () => {
    try {
      const mockMentors: Mentor[] = [
        {
          id: '1',
          name: 'Dr. Sarah Chen',
          bio: 'Senior Software Engineer at Google with 8+ years experience in full-stack development and AI/ML.',
          expertise_areas: ['React', 'Node.js', 'Python', 'Machine Learning', 'System Design'],
          experience_level: 'expert',
          availability: '10 hours/week',
          mentorship_style: 'project-based',
          rating: 4.9,
          sessions_completed: 127,
          specialties: ['Career Guidance', 'Technical Interview Prep', 'Architecture Design'],
          languages: ['English', 'Mandarin'],
          avatar: undefined
        },
        {
          id: '2',
          name: 'Marcus Johnson',
          bio: 'Former startup CTO, now helping builders navigate the entrepreneurial journey.',
          expertise_areas: ['Startup Strategy', 'Product Management', 'Team Leadership', 'Fundraising'],
          experience_level: 'expert',
          availability: '6 hours/week',
          mentorship_style: 'strategic',
          rating: 4.8,
          sessions_completed: 89,
          specialties: ['Startup Scaling', 'Product Strategy', 'Leadership'],
          languages: ['English', 'Spanish'],
          avatar: undefined
        },
        {
          id: '3',
          name: 'Priya Sharma',
          bio: 'UX Design Lead passionate about creating intuitive user experiences.',
          expertise_areas: ['UI/UX Design', 'Figma', 'User Research', 'Design Systems'],
          experience_level: 'advanced',
          availability: '8 hours/week',
          mentorship_style: 'hands-on',
          rating: 4.7,
          sessions_completed: 156,
          specialties: ['Design Thinking', 'Portfolio Review', 'Design Systems'],
          languages: ['English', 'Hindi'],
          avatar: undefined
        }
      ];

      const mockResources: LearningResource[] = [
        {
          id: '1',
          title: 'Complete React Hooks Masterclass',
          description: 'Deep dive into React Hooks with practical examples and real-world projects.',
          type: 'course',
          difficulty_level: 'intermediate',
          topics: ['React', 'Hooks', 'State Management'],
          creator: { name: 'Alex Thompson' },
          rating: 4.8,
          duration_minutes: 480,
          url: 'https://example.com/react-hooks',
          is_free: false,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'System Design Interview Guide',
          description: 'Comprehensive guide to system design interviews with case studies.',
          type: 'article',
          difficulty_level: 'advanced',
          topics: ['System Design', 'Interviews', 'Architecture'],
          creator: { name: 'Engineering Team' },
          rating: 4.9,
          duration_minutes: 120,
          url: 'https://example.com/system-design',
          is_free: true,
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          title: 'API Design Best Practices Workshop',
          description: 'Learn to design scalable and maintainable APIs from industry experts.',
          type: 'workshop',
          difficulty_level: 'intermediate',
          topics: ['API Design', 'REST', 'GraphQL'],
          creator: { name: 'Dev Community' },
          rating: 4.6,
          duration_minutes: 180,
          url: 'https://example.com/api-design',
          is_free: true,
          created_at: new Date().toISOString()
        }
      ];

      const mockStudyGroups: StudyGroup[] = [
        {
          id: '1',
          name: 'React Natives Study Circle',
          description: 'Weekly study sessions focused on React Native development and mobile app best practices.',
          topic: 'React Native',
          meeting_schedule: 'Tuesdays 7:00 PM EST',
          member_count: 8,
          max_members: 12,
          difficulty_level: 'intermediate',
          organizer: { id: 'org1', name: 'Jennifer Liu' },
          next_meeting: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          meeting_format: 'online',
          status: 'open'
        },
        {
          id: '2',
          name: 'AI/ML Enthusiasts',
          description: 'Exploring machine learning concepts, sharing projects, and discussing latest research.',
          topic: 'Machine Learning',
          meeting_schedule: 'Saturdays 2:00 PM EST',
          member_count: 15,
          max_members: 15,
          difficulty_level: 'advanced',
          organizer: { id: 'org2', name: 'Dr. Ahmed Hassan' },
          next_meeting: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          meeting_format: 'hybrid',
          status: 'full'
        }
      ];

      const mockWorkshops: Workshop[] = [
        {
          id: '1',
          title: 'Building Scalable Node.js Applications',
          description: 'Learn to build high-performance, scalable Node.js applications with best practices.',
          instructor: {
            name: 'David Martinez',
            expertise: 'Senior Backend Engineer',
            avatar: undefined
          },
          scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          duration_hours: 4,
          max_participants: 25,
          current_participants: 18,
          skill_level: 'intermediate',
          topics_covered: ['Node.js', 'Express', 'Database Optimization', 'Caching'],
          cost: 49,
          workshop_type: 'live'
        },
        {
          id: '2',
          title: 'UI/UX Design Fundamentals',
          description: 'Master the basics of user interface and user experience design.',
          instructor: {
            name: 'Sophie Anderson',
            expertise: 'Lead UX Designer',
            avatar: undefined
          },
          scheduled_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          duration_hours: 6,
          max_participants: 20,
          current_participants: 12,
          skill_level: 'beginner',
          topics_covered: ['Design Principles', 'Figma', 'User Research', 'Prototyping'],
          cost: 79,
          workshop_type: 'interactive'
        }
      ];

      setMentors(mockMentors);
      setResources(mockResources);
      setStudyGroups(mockStudyGroups);
      setWorkshops(mockWorkshops);
    } catch (error) {
      console.error('Error fetching knowledge data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestMentorship = async (mentorId: string) => {
    try {
      toast({
        title: "Mentorship Request Sent",
        description: "The mentor will be notified of your request!",
      });
    } catch (error) {
      console.error('Error requesting mentorship:', error);
    }
  };

  const handleJoinStudyGroup = async (groupId: string) => {
    try {
      toast({
        title: "Study Group Request Sent",
        description: "You'll be notified once approved by the organizer!",
      });
    } catch (error) {
      console.error('Error joining study group:', error);
    }
  };

  const handleRegisterWorkshop = async (workshopId: string) => {
    try {
      toast({
        title: "Workshop Registration",
        description: "You'll receive payment instructions shortly!",
      });
    } catch (error) {
      console.error('Error registering for workshop:', error);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      case 'expert': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'full': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      {/* Header with Navigation */}
      <Card className="glow-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Knowledge Exchange</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search knowledge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48"
              />
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <CardDescription>
            Learn from mentors, discover resources, join study groups, and attend workshops
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button
              variant={activeSection === 'mentors' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('mentors')}
            >
              <Users className="h-4 w-4 mr-1" />
              Mentors
            </Button>
            <Button
              variant={activeSection === 'resources' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('resources')}
            >
              <BookOpen className="h-4 w-4 mr-1" />
              Resources
            </Button>
            <Button
              variant={activeSection === 'study_groups' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('study_groups')}
            >
              <Users className="h-4 w-4 mr-1" />
              Study Groups
            </Button>
            <Button
              variant={activeSection === 'workshops' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('workshops')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Workshops
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mentors Section */}
      {activeSection === 'mentors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.map((mentor) => (
            <Card key={mentor.id} className="glow-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={`https://avatar.vercel.sh/${mentor.name}`} />
                    <AvatarFallback>
                      {mentor.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{mentor.name}</h3>
                      <Badge className={getDifficultyColor(mentor.experience_level)}>
                        {mentor.experience_level}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span className="text-xs text-muted-foreground">
                        {mentor.rating} ({mentor.sessions_completed} sessions)
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {mentor.bio}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium mb-1">Expertise:</p>
                    <div className="flex flex-wrap gap-1">
                      {mentor.expertise_areas.slice(0, 3).map((area, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium mb-1">Specialties:</p>
                    <div className="flex flex-wrap gap-1">
                      {mentor.specialties.slice(0, 2).map((specialty, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-blue-50">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{mentor.availability}</span>
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleRequestMentorship(mentor.id)}
                  >
                    <MessageCircle className="h-3 w-3 mr-1" />
                    Request Mentorship
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resources Section */}
      {activeSection === 'resources' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <Card key={resource.id} className="glow-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm line-clamp-1">{resource.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {resource.type}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {resource.description}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getDifficultyColor(resource.difficulty_level)}>
                      {resource.difficulty_level}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span className="text-xs text-muted-foreground">{resource.rating}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {resource.topics.map((topic, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {resource.duration_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{Math.floor(resource.duration_minutes / 60)}h {resource.duration_minutes % 60}m</span>
                      </div>
                    )}
                    <span className={resource.is_free ? 'text-green-600' : 'text-blue-600'}>
                      {resource.is_free ? 'Free' : 'Paid'}
                    </span>
                  </div>
                  
                  <Button size="sm" className="w-full" asChild>
                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                      <BookOpen className="h-3 w-3 mr-1" />
                      Access Resource
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Study Groups Section */}
      {activeSection === 'study_groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {studyGroups.map((group) => (
            <Card key={group.id} className="glow-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm">{group.name}</h3>
                      <Badge className={getStatusColor(group.status)}>
                        {group.status}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-3">
                      {group.description}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {group.topic}
                    </Badge>
                    <Badge className={getDifficultyColor(group.difficulty_level)}>
                      {group.difficulty_level}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{group.member_count}/{group.max_members}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{group.meeting_schedule}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={`https://avatar.vercel.sh/${group.organizer.name}`} />
                      <AvatarFallback className="text-xs">
                        {group.organizer.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      Organized by {group.organizer.name}
                    </span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <strong>Next meeting:</strong> {formatDate(group.next_meeting)}
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="w-full"
                    disabled={group.status === 'full' || group.status === 'closed'}
                    onClick={() => handleJoinStudyGroup(group.id)}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {group.status === 'full' ? 'Group Full' : 'Request to Join'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Workshops Section */}
      {activeSection === 'workshops' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workshops.map((workshop) => (
            <Card key={workshop.id} className="glow-border">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm">{workshop.title}</h3>
                      <Badge className={getDifficultyColor(workshop.skill_level)}>
                        {workshop.skill_level}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-3">
                      {workshop.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://avatar.vercel.sh/${workshop.instructor.name}`} />
                      <AvatarFallback className="text-xs">
                        {workshop.instructor.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium">{workshop.instructor.name}</p>
                      <p className="text-xs text-muted-foreground">{workshop.instructor.expertise}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {workshop.topics_covered.map((topic, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(workshop.scheduled_date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{workshop.duration_hours}h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{workshop.current_participants}/{workshop.max_participants}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      <span>${workshop.cost}</span>
                    </div>
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="w-full"
                    disabled={workshop.current_participants >= workshop.max_participants}
                    onClick={() => handleRegisterWorkshop(workshop.id)}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    {workshop.current_participants >= workshop.max_participants 
                      ? 'Workshop Full' 
                      : `Register ($${workshop.cost})`
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};