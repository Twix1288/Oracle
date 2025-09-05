import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Star, Clock, Target, ArrowRight } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface TeamMatch {
  team: any;
  member_count: number;
  skills_match: number;
  compatibility_score: number;
  match_reasons: string[];
}

interface SmartProjectMatcherProps {
  onTeamSelect?: (teamId: string) => void;
  maxResults?: number;
}

export const SmartProjectMatcher: React.FC<SmartProjectMatcherProps> = ({
  onTeamSelect,
  maxResults = 6
}) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<TeamMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadSmartMatches();
    }
  }, [user]);

  const loadSmartMatches = async () => {
    try {
      setLoading(true);

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      setUserProfile(profile);

      if (!profile) return;

      // Get comprehensive context for AI matching
      const { data: context } = await supabase.rpc('get_comprehensive_oracle_context', {
        p_user_id: user!.id
      });

      // Get available teams with enhanced matching data
      const { data: availableTeams } = await supabase
        .from('teams')
        .select(`
          *,
          members!inner(count)
        `)
        .neq('id', profile.team_id || '')
        .eq('stage', 'formation'); // Only show teams still forming

      if (!availableTeams) return;

      // Calculate compatibility scores for each team
      const teamMatches: TeamMatch[] = availableTeams.map(team => {
        const memberCount = team.members?.[0]?.count || 0;
        const hasSpace = memberCount < (team.max_members || 5);
        
        if (!hasSpace) return null;

        // Calculate skills match
        const userSkills = profile.skills || [];
        const neededSkills = team.skills_needed || [];
        const skillsMatch = neededSkills.filter(skill => 
          userSkills.includes(skill)
        ).length;

        // Calculate compatibility score based on multiple factors
        let compatibilityScore = 0;
        const matchReasons: string[] = [];

        // Skills compatibility (40% weight)
        if (skillsMatch > 0) {
          compatibilityScore += (skillsMatch / neededSkills.length) * 40;
          matchReasons.push(`${skillsMatch} matching skills`);
        }

        // Tech stack compatibility (25% weight)
        const userTech = profile.preferred_technologies || [];
        const teamTech = team.tech_stack || [];
        const techMatch = teamTech.filter(tech => 
          userTech.some(userT => userT.toLowerCase().includes(tech.toLowerCase()))
        ).length;
        if (techMatch > 0) {
          compatibilityScore += (techMatch / teamTech.length) * 25;
          matchReasons.push(`${techMatch} tech stack matches`);
        }

        // Experience level compatibility (15% weight)
        const experienceLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
        const userExpIndex = experienceLevels.indexOf(profile.experience_level || 'beginner');
        const teamSizeBonus = team.team_size_needed > memberCount ? 10 : 0;
        compatibilityScore += teamSizeBonus;

        // Project type interest (10% weight)
        const userInterests = profile.interests || [];
        if (team.project_type && userInterests.includes(team.project_type)) {
          compatibilityScore += 10;
          matchReasons.push('matching project interests');
        }

        // Timeline compatibility (10% weight)
        const userGoals = profile.learning_goals || [];
        const timelineMatch = team.timeline_months <= 6 ? 
          (userGoals.includes('quick_project') ? 10 : 5) : 
          (userGoals.includes('long_term_project') ? 10 : 5);
        compatibilityScore += timelineMatch;

        if (matchReasons.length === 0) {
          matchReasons.push('open to new opportunities');
        }

        return {
          team,
          member_count: memberCount,
          skills_match: skillsMatch,
          compatibility_score: Math.round(compatibilityScore),
          match_reasons: matchReasons
        };
      }).filter(Boolean) as TeamMatch[];

      // Sort by compatibility score and limit results
      const sortedMatches = teamMatches
        .sort((a, b) => b.compatibility_score - a.compatibility_score)
        .slice(0, maxResults);

      setMatches(sortedMatches);
    } catch (error) {
      console.error('Error loading smart matches:', error);
      toast({
        title: "Error",
        description: "Failed to load project matches. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (accessCode: string, teamName: string) => {
    try {
      const { data, error } = await supabase.rpc('use_access_code', {
        p_user_id: user!.id,
        p_code: accessCode,
        p_builder_name: userProfile?.full_name || ''
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "Successfully Joined Team!",
          description: `Welcome to ${teamName}!`,
        });
        
        if (onTeamSelect) {
          onTeamSelect(accessCode);
        }
        
        // Refresh matches after joining
        loadSmartMatches();
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
        <h2 className="text-2xl font-bold">Smart Project Matches</h2>
        <p className="text-muted-foreground">
          AI-powered recommendations based on your skills, interests, and goals
        </p>
      </div>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Matches Found</p>
            <p className="text-muted-foreground">
              Complete your profile to get better project recommendations
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match, index) => (
            <Card key={match.team.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
              <div className="absolute top-4 right-4">
                <Badge variant={
                  match.compatibility_score >= 80 ? "default" :
                  match.compatibility_score >= 60 ? "secondary" : "outline"
                }>
                  <Star className="w-3 h-3 mr-1" />
                  {match.compatibility_score}% match
                </Badge>
              </div>
              
              <CardHeader>
                <CardTitle className="line-clamp-2">
                  {match.team.project_name || match.team.name}
                </CardTitle>
                <CardDescription className="line-clamp-3">
                  {match.team.project_description || match.team.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {match.member_count}/{match.team.max_members || 5}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {match.team.timeline_months}mo
                  </div>
                </div>

                {match.team.tech_stack && match.team.tech_stack.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {match.team.tech_stack.slice(0, 3).map((tech: string) => (
                      <Badge key={tech} variant="outline" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                    {match.team.tech_stack.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{match.team.tech_stack.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Why this matches:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {match.match_reasons.slice(0, 2).map((reason, idx) => (
                      <li key={idx} className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button 
                  onClick={() => handleJoinTeam(match.team.access_code, match.team.name)}
                  className="w-full"
                  variant={match.compatibility_score >= 80 ? "default" : "outline"}
                >
                  Join Team
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};