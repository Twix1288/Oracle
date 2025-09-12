import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye, 
  Users, 
  GraduationCap, 
  Sparkles, 
  Activity, 
  TrendingUp,
  Network,
  MessageCircle,
  UserPlus,
  BookOpen,
  HandHeart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SuperOracle } from './SuperOracle';
import { OracleSuggestButton } from './OracleSuggestButton';
import { OfferHelpButton } from './OfferHelpButton';
import { ConnectButton } from './ConnectButton';
import { JoinWorkshopButton } from './JoinWorkshopButton';
import { OracleCommandPanel } from './OracleCommandPanel';

interface OracleInsight {
  id: string;
  type: 'connection' | 'skill_match' | 'workshop' | 'collaboration';
  title: string;
  description: string;
  confidence: number;
  evidence_count: number;
  actionable: boolean;
  created_at: string;
}

interface NetworkConnection {
  id: string;
  name: string;
  role: string;
  shared_interests: string[];
  connection_strength: number;
  mutual_connections: number;
}

interface SkillOffer {
  id: string;
  skill: string;
  owner_name: string;
  availability: string;
  match_score: number;
}

interface Workshop {
  id: string;
  title: string;
  description: string;
  host_name: string;
  attendees: number;
  max_attendees: number;
  scheduled_at: string;
}

export function OracleInsightsPage() {
  const [insights, setInsights] = useState<OracleInsight[]>([]);
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [skillOffers, setSkillOffers] = useState<SkillOffer[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('insights');
  const { toast } = useToast();
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user) {
      loadOracleData();
      // Set up real-time updates
      const interval = setInterval(loadOracleData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadOracleData = async () => {
    try {
      setIsLoading(true);
      
      // Load Oracle insights from logs with user context
      const { data: oracleLogs, error: logsError } = await supabase
        .from('oracle_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;

      // Transform oracle logs into insights with better context
      const transformedInsights: OracleInsight[] = oracleLogs.map(log => {
        let insightType: 'connection' | 'skill_match' | 'workshop' | 'collaboration' = 'collaboration';
        let title = `Oracle Insight: ${log.query_type}`;
        
        // Better categorization based on query content and user profile
        if (log.query.toLowerCase().includes('connect') || log.query.toLowerCase().includes('network')) {
          insightType = 'connection';
          title = `Network Analysis: ${profile?.role || 'Builder'} Insights`;
        } else if (log.query.toLowerCase().includes('skill') || log.query.toLowerCase().includes('help')) {
          insightType = 'skill_match';
          title = `Skill Matching: ${profile?.skills?.join(', ') || 'Your Skills'}`;
        } else if (log.query.toLowerCase().includes('workshop') || log.query.toLowerCase().includes('learn')) {
          insightType = 'workshop';
          title = `Learning Opportunity: ${profile?.role || 'Builder'} Development`;
        }

        return {
          id: log.id,
          type: insightType,
          title,
          description: log.query.substring(0, 150) + '...',
          confidence: log.confidence || 0.8,
          evidence_count: log.sources || 0,
          actionable: log.helpful !== false,
          created_at: log.created_at
        };
      });

      setInsights(transformedInsights);

      // Load network connections - simplified to avoid relationship errors
      const { data: connectionData, error: connError } = await supabase
        .from('connection_requests')
        .select('*')
        .eq('requester_id', user?.id)
        .eq('status', 'accepted');

      if (!connError && connectionData) {
        // Get profile data separately to avoid relationship errors
        const profileIds = connectionData.map(conn => conn.requested_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, role, skills')
          .in('id', profileIds);

        const networkConnections: NetworkConnection[] = connectionData.map(conn => {
          const profile = profilesData?.find(p => p.id === conn.requested_id);
          return {
            id: conn.id,
            name: profile?.full_name || 'Unknown',
            role: profile?.role || 'builder',
            shared_interests: profile?.skills || [],
            connection_strength: Math.random() * 100, // Placeholder
            mutual_connections: Math.floor(Math.random() * 10)
          };
        });
        setConnections(networkConnections);
      }

      // Load skill offers - simplified
      const { data: skillData, error: skillError } = await supabase
        .from('skill_offers')
        .select('*')
        .eq('status', 'active')
        .limit(5);

      if (!skillError && skillData) {
        // Get owner profiles separately
        const ownerIds = skillData.map(offer => offer.owner_id);
        const { data: ownersData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ownerIds);

        const skillOffers: SkillOffer[] = skillData.map(offer => {
          const owner = ownersData?.find(o => o.id === offer.owner_id);
          return {
            id: offer.id,
            skill: offer.skill,
            owner_name: owner?.full_name || 'Unknown',
            availability: offer.availability || 'Available',
            match_score: Math.random() * 100 // Placeholder - should be calculated
          };
        });
        setSkillOffers(skillOffers);
      }

      // Load workshops
      const { data: workshopData, error: workshopError } = await supabase
        .from('workshops')
        .select('*')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5);

      if (!workshopError && workshopData) {
        const workshops: Workshop[] = workshopData.map(workshop => ({
          id: workshop.id,
          title: workshop.title,
          description: workshop.description || '',
          host_name: 'Workshop Host', // Placeholder as host_name doesn't exist in schema
          attendees: Array.isArray(workshop.attendees) ? workshop.attendees.length : 0,
          max_attendees: workshop.max_attendees || 50,
          scheduled_at: workshop.scheduled_at
        }));
        setWorkshops(workshops);
      }

    } catch (error) {
      console.error('Error loading Oracle data:', error);
      toast({
        title: "Error",
        description: "Failed to load Oracle insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerLearningLoop = async () => {
    try {
      const response = await supabase.functions.invoke('oracle-learning-loop', {
        body: {
          oracle_log_id: insights[0]?.id || '',
          feedback_data: {},
          action: 'analyze_feedback'
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: "Learning loop triggered successfully!",
      });

      // Refresh data
      loadOracleData();
    } catch (error) {
      console.error('Learning loop error:', error);
      toast({
        title: "Error",
        description: "Failed to trigger learning loop.",
        variant: "destructive",
      });
    }
  };

  const handleOracleCommand = async (command: string) => {
    console.log('Oracle command executed:', command);
    
    try {
      // Handle functional commands directly
      if (command.startsWith('/message ')) {
        if (!user?.id) {
          toast({
            title: "Authentication Required",
            description: "Please log in to send messages.",
            variant: "destructive"
          });
          return;
        }
        
        const messageMatch = command.match(/^\/message\s+([^:]+):\s*(.+)$/);
        const recipient = messageMatch?.[1] || 'team';
        const message = messageMatch?.[2] || command.substring(9);
        
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .insert({
            content: message,
            sender_id: user.id,
            team_id: teamId || null
          })
          .select()
          .single();

        if (messageError) throw messageError;

        toast({
          title: "Message Sent",
          description: `Message sent to ${recipient}: "${message}"`,
        });
        loadOracleData();
        return;
      }

      if (command.startsWith('/update ')) {
        if (!user?.id) {
          toast({
            title: "Authentication Required",
            description: "Please log in to create updates.",
            variant: "destructive"
          });
          return;
        }
        
        const updateContent = command.substring(8);
        
        const { data: updateData, error: updateError } = await supabase
          .from('updates')
          .insert({
            title: `Project Update - ${new Date().toLocaleDateString()}`,
            content: updateContent,
            type: 'general',
            user_id: user.id
          })
          .select()
          .single();

        if (updateError) throw updateError;

        toast({
          title: "Update Created",
          description: `Project update created: "${updateContent}"`,
        });
        loadOracleData();
        return;
      }

      // Call GraphRAG for other commands
      const response = await supabase.functions.invoke('graphrag', {
        body: {
          action: 'oracle_command',
          actor_id: user?.id,
          target_id: user?.id,
          body: { 
            command: command,
            context: 'oracle_insights_page'
          }
        }
      });

      if (response.error) throw response.error;

      // Trigger learning loop
      await supabase.functions.invoke('oracle-learning-loop', {
        body: {
          oracle_log_id: response.data?.log_id || '',
          feedback_data: { 
            command: command, 
            success: true,
            user_id: user?.id,
            context: 'oracle_insights_interaction'
          },
          action: 'analyze_feedback'
        }
      });

      // Refresh data to show new insights
      loadOracleData();
      
      toast({
        title: "Oracle Command Executed",
        description: `Command "${command}" processed successfully`,
      });
    } catch (error) {
      console.error('Oracle command error:', error);
      toast({
        title: "Command Failed",
        description: `Failed to execute: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const renderInsightCard = (insight: OracleInsight) => (
    <Card key={insight.id} className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          {insight.title}
          <Badge variant="outline" className="ml-auto">
            {Math.round(insight.confidence * 100)}% confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{insight.evidence_count} sources</span>
            <span>•</span>
            <span>{new Date(insight.created_at).toLocaleDateString()}</span>
            {insight.actionable && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="text-xs">Actionable</Badge>
              </>
            )}
          </div>
          <div className="flex gap-1">
            {insight.type === 'connection' && (
              <Button 
                onClick={() => handleOracleCommand('/view connections')} 
                variant="outline" 
                size="sm"
                className="text-xs"
              >
                <Users className="mr-1 h-3 w-3" />
                View Network
              </Button>
            )}
            {insight.type === 'skill_match' && (
              <Button 
                onClick={() => handleOracleCommand('/offer help')} 
                variant="outline" 
                size="sm"
                className="text-xs"
              >
                <HandHeart className="mr-1 h-3 w-3" />
                Offer Help
              </Button>
            )}
            {insight.type === 'workshop' && (
              <Button 
                onClick={() => handleOracleCommand('/join workshop')} 
                variant="outline" 
                size="sm"
                className="text-xs"
              >
                <GraduationCap className="mr-1 h-3 w-3" />
                Find Workshops
              </Button>
            )}
            {insight.type === 'collaboration' && (
              <Button 
                onClick={() => handleOracleCommand('/suggest collaboration')} 
                variant="outline" 
                size="sm"
                className="text-xs"
              >
                <MessageCircle className="mr-1 h-3 w-3" />
                Find Collaborators
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please log in to access Oracle insights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Oracle Insights
          </h1>
          <p className="text-muted-foreground">
            AI-powered insights and recommendations for your builder journey
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleOracleCommand('/message team: Hello team! How is everyone doing?')} variant="outline" size="sm">
            <MessageCircle className="mr-2 h-4 w-4" />
            Send Message
          </Button>
          <Button onClick={() => handleOracleCommand('/update Just made great progress on our project!')} variant="outline" size="sm">
            <Activity className="mr-2 h-4 w-4" />
            Create Update
          </Button>
          <Button onClick={triggerLearningLoop} variant="outline" size="sm">
            <Activity className="mr-2 h-4 w-4" />
            Trigger Learning Loop
          </Button>
          <Button onClick={loadOracleData} variant="outline" size="sm">
            Refresh Data
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="insights">
            <Eye className="mr-2 h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="connections">
            <Users className="mr-2 h-4 w-4" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="skills">
            <TrendingUp className="mr-2 h-4 w-4" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="workshops">
            <GraduationCap className="mr-2 h-4 w-4" />
            Workshops
          </TabsTrigger>
          <TabsTrigger value="oracle">
            <MessageCircle className="mr-2 h-4 w-4" />
            Oracle Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Recent Oracle Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading insights...</div>
              ) : insights.length > 0 ? (
                insights.map(renderInsightCard)
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No insights available. Start chatting with Oracle to generate insights!
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Your Network
                <Button 
                  onClick={() => handleOracleCommand('/view connections')} 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Analyze Network
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {connections.map(conn => (
                  <div key={conn.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{conn.name}</p>
                      <p className="text-sm text-muted-foreground">{conn.role}</p>
                      <div className="flex gap-1 mt-1">
                        {conn.shared_interests.slice(0, 2).map(interest => (
                          <Badge key={interest} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{Math.round(conn.connection_strength)}% match</p>
                      <p className="text-xs text-muted-foreground">{conn.mutual_connections} mutual</p>
                      <ConnectButton
                        targetId={conn.id}
                        targetName={conn.name}
                        variant="outline"
                        size="sm"
                        onSuccess={loadOracleData}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Skill Offers & Matching
                <Button 
                  onClick={() => handleOracleCommand('/offer help')} 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto"
                >
                  <HandHeart className="mr-2 h-4 w-4" />
                  Find Help Opportunities
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {skillOffers.map(offer => (
                  <div key={offer.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{offer.skill}</p>
                      <p className="text-sm text-muted-foreground">by {offer.owner_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{offer.availability}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{Math.round(offer.match_score)}% match</Badge>
                      <Button variant="outline" size="sm" className="ml-2">
                        Connect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workshops" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Recommended Workshops
                <Button 
                  onClick={() => handleOracleCommand('/join workshop')} 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto"
                >
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Find Workshops
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {workshops.map(workshop => (
                  <div key={workshop.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{workshop.title}</p>
                      <p className="text-sm text-muted-foreground mb-1">{workshop.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Host: {workshop.host_name}</span>
                        <span>•</span>
                        <span>{workshop.attendees}/{workshop.max_attendees} attendees</span>
                        <span>•</span>
                        <span>{new Date(workshop.scheduled_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <JoinWorkshopButton
                      workshopId={workshop.id}
                      workshopTitle={workshop.title}
                      variant="outline"
                      size="sm"
                      onSuccess={loadOracleData}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oracle" className="space-y-4">
          <div className="grid gap-6">
            <OracleCommandPanel 
              onCommandExecute={handleOracleCommand}
              className="mb-4"
            />
            <SuperOracle 
              selectedRole={profile?.role || 'builder'}
              teamId={profile?.team_id}
              userId={user?.id}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}