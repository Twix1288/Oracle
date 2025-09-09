import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, Calendar, Target, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OfferHelpButton } from '@/components/OfferHelpButton';
import { ConnectButton } from '@/components/ConnectButton';
import { ExpressInterestButton } from '@/components/ExpressInterestButton';
import { OracleSuggestButton } from '@/components/OracleSuggestButton';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  user_id: string;
  full_name: string;
  role: string;
}

interface TeamData {
  id: string;
  name: string;
  description: string;
  project_name: string;
  project_description: string;
  tech_stack: string[];
  skills_needed: string[];
  team_size_needed: number;
  timeline_months: number;
  stage: string;
  created_at: string;
}

export function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchTeamData();
      fetchCurrentUser();
    }
  }, [id]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchTeamData = async () => {
    try {
      // Fetch team data
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Fetch team members using RPC
      const { data: membersData, error: membersError } = await supabase.rpc('team_neighbors', {
        team_id: id
      });

      if (membersError) {
        console.error('Members fetch error:', membersError);
      } else {
        setMembers(membersData || []);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      toast({
        title: "Error",
        description: "Failed to load team data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActionSuccess = () => {
    toast({
      title: "Success",
      description: "Action completed successfully!",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading team data...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Team not found</div>
      </div>
    );
  }

  const isMember = members.some(member => member.user_id === currentUserId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Team Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{team.name}</CardTitle>
              <p className="text-muted-foreground mt-2">{team.description}</p>
            </div>
            <Badge variant="outline">{team.stage}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">
                {members.length} / {team.team_size_needed} members
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">{team.timeline_months} months</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="text-sm">Stage: {team.stage}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {!isMember && currentUserId && (
              <ExpressInterestButton
                projectId={team.id}
                projectName={team.name}
                onSuccess={handleActionSuccess}
              />
            )}
            
            <OfferHelpButton
              onSuccess={handleActionSuccess}
            />

            <OracleSuggestButton
              project={{
                id: team.id,
                title: team.project_name || team.name,
                description: team.project_description || team.description || ''
              }}
              onSuccess={handleActionSuccess}
              variant="outline"
            />
          </div>
        </CardContent>
      </Card>

      {/* Project Details */}
      {team.project_name && (
        <Card>
          <CardHeader>
            <CardTitle>Project: {team.project_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{team.project_description}</p>
            
            {team.tech_stack && team.tech_stack.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Tech Stack
                </h4>
                <div className="flex flex-wrap gap-2">
                  {team.tech_stack.map((tech, index) => (
                    <Badge key={index} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {team.skills_needed && team.skills_needed.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Skills Needed</h4>
                <div className="flex flex-wrap gap-2">
                  {team.skills_needed.map((skill, index) => (
                    <Badge key={index} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member, index) => (
              <div key={member.user_id}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{member.full_name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {member.role}
                    </p>
                  </div>
                  {currentUserId && member.user_id !== currentUserId && (
                    <ConnectButton
                      targetId={member.user_id}
                      targetName={member.full_name}
                      onSuccess={handleActionSuccess}
                      variant="outline"
                      size="sm"
                    />
                  )}
                </div>
                {index < members.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-muted-foreground">No members found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}