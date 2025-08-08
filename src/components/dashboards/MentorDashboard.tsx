import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MessageSquare, TrendingUp, AlertTriangle, Clock, BookOpen } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { TeamDashboard } from "../TeamDashboard";
import { MessagingCenter } from "../MessagingCenter";
import { EnhancedOracle } from "../EnhancedOracle";
import { MentorRequests } from "../MentorRequests";
import type { Team, Member, Update, UserRole } from "@/types/oracle";
import { supabase } from "@/integrations/supabase/client";

interface MentorDashboardProps {
  teams: Team[];
  members: Member[];
  updates: Update[];
  teamStatuses: any[];
  selectedRole: UserRole;
  mentorId?: string;
  onExit: () => void;
}

export const MentorDashboard = ({ teams, members, updates, teamStatuses, mentorId, onExit }: MentorDashboardProps) => {
  const [activeTab, setActiveTab] = useState("teams");
  const [reqLoading, setReqLoading] = useState(false);
  const [reqSummary, setReqSummary] = useState<string>("");

  // Filter teams assigned to this mentor
  const assignedTeams = teams.filter(team => team.assigned_mentor_id === mentorId);
  const assignedTeamIds = assignedTeams.map(team => team.id);
  
  // Filter data for assigned teams only
  const mentorTeamStatuses = teamStatuses.filter(status => 
    assignedTeamIds.includes(status.team_id)
  );
  const mentorUpdates = updates.filter(update => 
    assignedTeamIds.includes(update.team_id)
  );

  const getMentorMetrics = () => {
    const totalTeams = assignedTeams.length;
    const recentUpdates = mentorUpdates.filter(update => 
      new Date(update.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;
    const staleTeams = assignedTeams.filter(team => {
      const status = mentorTeamStatuses.find(s => s.team_id === team.id);
      return !status?.last_update || 
        new Date(status.last_update) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }).length;

    return { totalTeams, recentUpdates, staleTeams };
  };

  const metrics = getMentorMetrics();

  const getTeamRiskLevel = (teamId: string) => {
    const teamUpdates = mentorUpdates.filter(u => u.team_id === teamId);
    const recentUpdates = teamUpdates.filter(u => 
      new Date(u.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    if (recentUpdates.length === 0) return "high";
    if (recentUpdates.length < 3) return "medium";
    return "low";
  };

  return (
    <>
      <DashboardHeader 
        role="mentor" 
        onExit={onExit}
      />
      <div className="container mx-auto px-6 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-green-500/20 ufo-pulse">
          <User className="h-6 w-6 text-green-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-glow">Mentor Command Center</h1>
          <p className="text-muted-foreground">Guide your teams to success</p>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm text-muted-foreground">Your Teams</p>
                <p className="text-2xl font-bold">{metrics.totalTeams}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm text-muted-foreground">Today's Updates</p>
                <p className="text-2xl font-bold">{metrics.recentUpdates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm text-muted-foreground">Teams at Risk</p>
                <p className="text-2xl font-bold">{metrics.staleTeams}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Risk Overview */}
      {assignedTeams.length > 0 && (
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Team Health Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedTeams.map((team) => {
                const riskLevel = getTeamRiskLevel(team.id);
                const riskColors = {
                  low: "bg-green-500/20 text-green-300 border-green-500/30",
                  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
                  high: "bg-red-500/20 text-red-300 border-red-500/30"
                };
                
                return (
                  <div key={team.id} className="p-3 rounded-lg bg-background/30 border border-primary/10">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{team.name}</h4>
                      <Badge className={riskColors[riskLevel]} variant="outline">
                        {riskLevel} risk
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{team.description}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {teamStatuses.find(s => s.team_id === team.id)?.last_update ? 
                        `Updated ${new Date(teamStatuses.find(s => s.team_id === team.id)?.last_update).toLocaleDateString()}` :
                        "No recent updates"
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-card/50 backdrop-blur border-primary/20">
          <TabsTrigger value="teams" className="data-[state=active]:bg-primary/20">
            <User className="h-4 w-4 mr-2" />
            My Teams
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-primary/20">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="requests" className="data-[state=active]:bg-primary/20">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="oracle" className="data-[state=active]:bg-primary/20">
            <TrendingUp className="h-4 w-4 mr-2" />
            Oracle Assistant
          </TabsTrigger>
          <TabsTrigger value="resources" className="data-[state=active]:bg-primary/20">
            <BookOpen className="h-4 w-4 mr-2" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="guidance" className="data-[state=active]:bg-primary/20">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Guidance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams">
          {assignedTeams.length === 0 ? (
            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardContent className="p-8 text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Teams Assigned</h3>
                <p className="text-muted-foreground">
                  You haven't been assigned to any teams yet. Contact your lead for team assignments.
                </p>
              </CardContent>
            </Card>
          ) : (
            <TeamDashboard 
              teams={assignedTeams} 
              teamStatuses={mentorTeamStatuses} 
              members={members.filter(m => assignedTeamIds.includes(m.team_id || ''))} 
              selectedRole="mentor" 
            />
          )}
        </TabsContent>

        <TabsContent value="messages">
          <MessagingCenter userRole="mentor" userId={mentorId} />
        </TabsContent>

        <TabsContent value="requests">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <MentorRequests mentorId={mentorId} assignedTeamIds={assignedTeamIds} />
            </div>
            <div className="space-y-3">
              <Card className="glow-border bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>Oracle Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">RAG summary across mentor requests and team updates.</div>
                  <Button
                    disabled={reqLoading}
                    onClick={async () => {
                      try {
                        setReqLoading(true);
                        const prompt = `Summarize mentor requests for my assigned teams. Highlight critical blockers, duplicates, and propose next 3 actions per theme.`;
                        const { data, error } = await supabase.functions.invoke('enhanced-oracle', {
                          body: { query: prompt, role: 'mentor', userId: mentorId }
                        });
                        if (error) throw error;
                        setReqSummary((data?.answer as string) || '');
                      } catch (e: any) {
                        setReqSummary('');
                      } finally {
                        setReqLoading(false);
                      }
                    }}
                    className="ufo-gradient hover:opacity-90"
                  >
                    {reqLoading ? 'Summarizing…' : 'Summarize Requests'}
                  </Button>
                  {reqSummary && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 whitespace-pre-wrap text-sm">
                      {reqSummary}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="oracle">
          <EnhancedOracle 
            selectedRole="mentor"
            userId={mentorId}
          />
        </TabsContent>

        <TabsContent value="resources">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>📚 Resources to Guide Your Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-background/30 border border-primary/10 space-y-2">
                  <h4 className="font-medium text-primary">Team Communication</h4>
                  <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                    <li><a className="story-link" href="https://www.atlassian.com/blog/teamwork/team-communication" target="_blank" rel="noreferrer">High‑signal updates and async rituals</a></li>
                    <li><a className="story-link" href="https://basecamp.com/guides/how-we-communicate" target="_blank" rel="noreferrer">Clear writing for faster teams</a></li>
                    <li><a className="story-link" href="https://www.youtube.com/watch?v=R3G2oS-p9KE" target="_blank" rel="noreferrer">Running effective standups</a></li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-background/30 border border-primary/10 space-y-2">
                  <h4 className="font-medium text-primary">Leadership</h4>
                  <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                    <li><a className="story-link" href="https://leaddev.com/leadership-skills" target="_blank" rel="noreferrer">Coaching vs. directing</a></li>
                    <li><a className="story-link" href="https://rework.withgoogle.com/" target="_blank" rel="noreferrer">Feedback frameworks that stick</a></li>
                    <li><a className="story-link" href="https://www.youtube.com/watch?v=H0_yKBitO8M" target="_blank" rel="noreferrer">One‑on‑ones that unblock</a></li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-background/30 border border-primary/10 space-y-2">
                  <h4 className="font-medium text-primary">Tech Coaching</h4>
                  <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                    <li><a className="story-link" href="https://martinfowler.com/articles/lean-engineering.html" target="_blank" rel="noreferrer">Lean engineering practices</a></li>
                    <li><a className="story-link" href="https://kentcdodds.com/blog" target="_blank" rel="noreferrer">Code review that teaches</a></li>
                    <li><a className="story-link" href="https://www.youtube.com/watch?v=ZJcT9K_1vZQ" target="_blank" rel="noreferrer">Testing in product teams</a></li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-background/30 border border-primary/10 space-y-2">
                  <h4 className="font-medium text-primary">Startup Advising</h4>
                  <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                    <li><a className="story-link" href="https://www.ycombinator.com/library" target="_blank" rel="noreferrer">YC library: PMF and iterating</a></li>
                    <li><a className="story-link" href="https://www.youtube.com/watch?v=Hh6nQf2U14w" target="_blank" rel="noreferrer">Prioritization under uncertainty</a></li>
                    <li><a className="story-link" href="https://www.paulgraham.com/articles.html" target="_blank" rel="noreferrer">Early user development</a></li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-background/30 border border-primary/10 space-y-2">
                  <h4 className="font-medium text-primary">Using Oracle</h4>
                  <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                    <li>Ask: “Show risks for my teams without updates in 7 days.”</li>
                    <li>Ask: “Summarize blockers across assigned teams.”</li>
                    <li>Ask: “Draft guidance for Team X’s current milestone.”</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guidance">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Mentorship Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-medium text-primary">Weekly Check-ins</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Schedule regular 1:1 meetings with each team</li>
                  <li>• Review their progress and challenges</li>
                  <li>• Provide technical and strategic guidance</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-primary">Red Flags to Watch</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Teams with no updates for 7+ days</li>
                  <li>• Repeated mentions of the same blockers</li>
                  <li>• Lack of milestone progress</li>
                  <li>• Team communication issues</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-primary">Best Practices</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Encourage daily updates from teams</li>
                  <li>• Use the Oracle to understand team patterns</li>
                  <li>• Connect teams with similar challenges</li>
                  <li>• Escalate issues to leads when needed</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
};