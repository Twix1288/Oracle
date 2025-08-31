import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { createTeam, deleteTeam, regenerateAccessCode, assignMemberToTeam } from "@/utils/teamManagement";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Users, Shield, UserCheck, MessageSquare, Activity, Settings, Plus, Eye } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { TeamDashboard } from "../TeamDashboard";
import { MessagingCenter } from "../MessagingCenter";
import { SuperOracle } from "../SuperOracle";
import { AccessCodeManager } from "../AccessCodeManager";
import type { Team, Member, Update, UserRole } from "@/types/oracle";

interface LeadDashboardProps {
  teams: Team[];
  members: Member[];
  updates: Update[];
  teamStatuses: any[];
  selectedRole: UserRole;
  onExit: () => void;
}

export const LeadDashboard = ({ teams, members, updates, teamStatuses, selectedRole, onExit }: LeadDashboardProps) => {
  const [activeTab, setActiveTab] = useState("oracle");
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Mentor assignment helpers
  const mentors = members.filter((m) => m.role === "mentor");
  const queryClient = useQueryClient();
  const [mentorsList, setMentorsList] = useState<Member[]>(mentors);
  useEffect(() => {
    setMentorsList(mentors);
  }, [members]);

  const [isAddMentorOpen, setIsAddMentorOpen] = useState(false);
  const [newMentorName, setNewMentorName] = useState("");
  const [savingMentor, setSavingMentor] = useState(false);

  const [mentorAssignments, setMentorAssignments] = useState<Record<string, string | "none">>(() =>
    Object.fromEntries(teams.map((t) => [t.id, (t.assigned_mentor_id as string) || "none"]))
  );

  const createMentor = async () => {
    if (!newMentorName.trim()) {
      toast.error("Mentor name is required");
      return;
    }
    setSavingMentor(true);
    try {
      const { data, error } = await supabase
        .from("members")
        .insert({ name: newMentorName.trim(), role: "mentor" })
        .select()
        .single();
      if (error) throw error;
      setMentorsList((prev) => [data as Member, ...prev]);
      toast.success("Mentor added successfully");
      setIsAddMentorOpen(false);
      setNewMentorName("");
      queryClient.invalidateQueries({ queryKey: ["members"] });
    } catch (e: any) {
      toast.error(`Failed to add mentor: ${e.message}`);
    } finally {
      setSavingMentor(false);
    }
  };
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete team "${teamName}"? The team's data will be preserved in the database for reference.`)) {
      return;
    }

    try {
      await deleteTeam(teamId);
      toast.success(`Team "${teamName}" deleted successfully.`);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["teamStatuses"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    } catch (error: any) {
      toast.error(`Failed to delete team: ${error.message}`);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error("Team name is required");
      return;
    }

    setIsCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No authenticated user');
      
      // Check if user has lead role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single();
      
      if (!profile || profile.role !== 'lead') {
        throw new Error('You must have lead role to create teams');
      }
      
      const team = await createTeam(teamName.trim());

      toast.success(`Team "${teamName}" created successfully! Team details will be completed when members join and complete onboarding.`);
      
      // Reset form
      setTeamName("");
      setIsCreateTeamOpen(false);
      
      // Invalidate queries to refresh data without full page reload
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["teamStatuses"] });
    } catch (error: any) {
      toast.error(`Failed to create team: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssignMentor = async (teamId: string) => {
    const selected = mentorAssignments[teamId];
    const payload = selected === "none" ? { assigned_mentor_id: null } : { assigned_mentor_id: selected };
    try {
      const { error } = await supabase.from("teams").update(payload).eq("id", teamId);
      if (error) throw error;
      toast.success("Mentor assignment updated");
      
      // Invalidate queries to refresh data without full page reload
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["teamStatuses"] });
    } catch (e: any) {
      toast.error(`Failed to update mentor: ${e.message}`);
    }
  };

  const getEngagementMetrics = () => {
    const totalTeams = teams?.length || 0;
    const activeTeams = teamStatuses?.filter(status => 
      status.last_update && new Date(status.last_update) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length || 0;
    const recentUpdates = updates?.filter(update => 
      new Date(update.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length || 0;

    return { totalTeams, activeTeams, recentUpdates };
  };

  const metrics = getEngagementMetrics();

  return (
    <>
      <DashboardHeader 
        role="lead" 
        onExit={onExit}
      />
      <div className="container mx-auto px-6 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/20 ufo-pulse">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-glow">Lead Command Center</h1>
          <p className="text-muted-foreground">Full mission control and oversight</p>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Teams</p>
                <p className="text-2xl font-bold">{metrics.totalTeams}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm text-muted-foreground">Active This Week</p>
                <p className="text-2xl font-bold">{metrics.activeTeams}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm text-muted-foreground">Today's Updates</p>
                <p className="text-2xl font-bold">{metrics.recentUpdates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur border-primary/20">
          <TabsTrigger value="oracle" className="data-[state=active]:bg-primary/20">
            <Activity className="h-4 w-4 mr-2" />
            Enhanced Oracle
          </TabsTrigger>
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20">
            <Eye className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="teams" className="data-[state=active]:bg-primary/20">
            <Users className="h-4 w-4 mr-2" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-primary/20">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TeamDashboard 
            teams={teams} 
            teamStatuses={teamStatuses} 
            members={members} 
            selectedRole="lead" 
          />
        </TabsContent>

        <TabsContent value="teams">
          <div className="space-y-6">
            {/* Simple Team Creation */}
            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Team Management</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create teams for builders to join during onboarding
                    </p>
                  </div>
                  <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
                    <DialogTrigger asChild>
                      <Button className="ufo-gradient">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Team
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Create New Team</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="teamName">Team Name *</Label>
                          <Input
                            id="teamName"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="Enter team name"
                          />
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            <strong>Note:</strong> Team details will be completed when members join and complete onboarding.
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCreateTeamOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateTeam} disabled={isCreating}>
                          {isCreating ? "Creating..." : "Create Team"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team) => (
                    <Card key={team.id} className="border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{team.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {team.stage}
                          </Badge>
                        </div>
                        {team.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {team.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs text-muted-foreground">
                            Created: {new Date(team.created_at).toLocaleDateString()}
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTeam(team.id, team.name)}
                            className="h-7"
                          >
                            Delete
                          </Button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs">
                            <span className="text-muted-foreground">Created: </span>
                            <span className="font-mono">{new Date(team.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                      </CardContent>
                    </Card>
                  ))}
                </div>
                {teams.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No teams created yet. Create your first team to get started!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unassigned Users */}
            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-yellow-400" />
                  Unassigned Users
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Users who haven't joined a team yet
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.filter(m => !m.team_id).map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-primary/20">
                      <div>
                        <div className="font-semibold">{member.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Role: {member.role}
                        </div>
                      </div>
                      <Select
                        value={member.team_id || ""}
                        onValueChange={async (teamId) => {
                          try {
                            await assignMemberToTeam(member.id, teamId || null);
                            toast.success("User assigned to team successfully");
                            queryClient.invalidateQueries({ queryKey: ["members"] });
                          } catch (error: any) {
                            toast.error(`Failed to assign user: ${error.message}`);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Assign to team" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  {members.filter(m => !m.team_id).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>All users are assigned to teams!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Master Access Code */}
            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  Master Access Code
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Simple access code system for assigning roles
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Builder Code */}
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <h4 className="font-semibold text-blue-400">Builder Code</h4>
                    </div>
                    <div className="font-mono text-lg bg-background/50 p-2 rounded border text-center">
                      BUILD2024
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Give this to team builders
                    </p>
                  </div>

                  {/* Mentor Code */}
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="h-4 w-4 text-green-400" />
                      <h4 className="font-semibold text-green-400">Mentor Code</h4>
                    </div>
                    <div className="font-mono text-lg bg-background/50 p-2 rounded border text-center">
                      MENTOR2024
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Give this to mentors
                    </p>
                  </div>

                  {/* Lead Code */}
                  <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-purple-400" />
                      <h4 className="font-semibold text-purple-400">Lead Code</h4>
                    </div>
                    <div className="font-mono text-lg bg-background/50 p-2 rounded border text-center">
                      LEAD2024
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      For program leaders
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>How it works:</strong> Users complete onboarding, join a team, then use these codes in their dashboard to get their role and access.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="messages">
          <MessagingCenter userRole="lead" accessCode="lead-user" />
        </TabsContent>

        <TabsContent value="oracle">
          <SuperOracle 
            selectedRole="lead"
          />
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
};