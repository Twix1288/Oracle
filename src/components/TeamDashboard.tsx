import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Target, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import type { Team, TeamStatus, Member, UserRole } from "@/types/oracle";

interface TeamDashboardProps {
  teams: Team[];
  teamStatuses: TeamStatus[];
  members: Member[];
  selectedRole: UserRole;
}

const stageColors = {
  ideation: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  development: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  testing: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  launch: "bg-green-500/20 text-green-300 border-green-500/30",
  growth: "bg-purple-500/20 text-purple-300 border-purple-500/30"
};

const stageProgress = {
  ideation: 20,
  development: 40,
  testing: 60,
  launch: 80,
  growth: 100
};

export const TeamDashboard = ({ teams, teamStatuses, members, selectedRole }: TeamDashboardProps) => {
  const getTeamMembers = (teamId: string) => {
    return members?.filter(member => member.team_id === teamId) || [];
  };

  const getTeamStatus = (teamId: string) => {
    return teamStatuses?.find(status => status.team_id === teamId);
  };

  const getRoleGreeting = () => {
    const greetings = {
      builder: "Hi Builder! Here's your team's status:",
      mentor: "Welcome, Mentor! Overview of your teams:",
      lead: "Hello, Lead! Program-wide team overview:",
      guest: "Welcome, Guest! Public team information:"
    };
    return greetings[selectedRole];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team Overview
          </h2>
          <p className="text-muted-foreground mt-1">{getRoleGreeting()}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Active Teams</p>
          <p className="text-2xl font-bold">{teams?.length || 0}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teams?.map(team => {
          const teamMembers = getTeamMembers(team.id);
          const status = getTeamStatus(team.id);
          
          return (
            <Card key={team.id} className="glow-border bg-card/50 backdrop-blur hover:bg-card/70 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <Badge className={stageColors[team.stage]} variant="outline">
                    {team.stage}
                  </Badge>
                </div>
                {team.description && (
                  <p className="text-sm text-muted-foreground mt-2">{team.description}</p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Progress
                    </span>
                    <span className="text-muted-foreground">{stageProgress[team.stage]}%</span>
                  </div>
                  <Progress value={stageProgress[team.stage]} className="h-2" />
                </div>

                {/* Assigned Mentor */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm">
                    <Users className="h-3 w-3" />
                    <span>Mentor</span>
                  </div>
                  {(() => {
                    const mentor = members.find((m) => m.id === (team.assigned_mentor_id as any));
                    return mentor ? (
                      <Badge variant="secondary" className="text-xs">{mentor.name}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    );
                  })()}
                </div>

                {/* Team Members */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-sm">
                    <Users className="h-3 w-3" />
                    <span>Team ({teamMembers.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {teamMembers.map(member => (
                      <Badge key={member.id} variant="secondary" className="text-xs">
                        {member.name}
                      </Badge>
                    ))}
                    {teamMembers.length === 0 && (
                      <span className="text-xs text-muted-foreground">No members assigned</span>
                    )}
                  </div>
                </div>

                {/* Current Status */}
                {status && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-sm">
                      <TrendingUp className="h-3 w-3" />
                      <span>Latest Update</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {status.current_status}
                    </p>
                    {status.last_update && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(status.last_update), 'MMM d, h:mm a')}
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                {team.tags && team.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {team.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {teams?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No teams found</h3>
            <p>Teams will appear here once they're created in the system.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};