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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, Users, MessageSquare, Activity, Settings, Plus, Eye } from "lucide-react";
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

export const LeadDashboard = ({ teams, members, updates, teamStatuses, onExit }: LeadDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamStage, setTeamStage] = useState<"ideation" | "development" | "testing" | "launch" | "growth">("ideation");
  const [teamTags, setTeamTags] = useState("");
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
  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error("Team name is required");
      return;
    }

    setIsCreating(true);
    try {
      const tagsArray = teamTags.split(",").map(tag => tag.trim()).filter(Boolean);
      
      const { data, error } = await supabase
        .from("teams")
        .insert({
          name: teamName,
          description: teamDescription || null,
          stage: teamStage as "ideation" | "development" | "testing" | "launch" | "growth",
          tags: tagsArray.length > 0 ? tagsArray : null
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Team "${teamName}" created successfully!`);
      
      // Reset form
      setTeamName("");
      setTeamDescription("");
      setTeamStage("ideation");
      setTeamTags("");
      setIsCreateTeamOpen(false);
      
      // Refresh page to show new team
      window.location.reload();
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
      // Simple refresh to sync all data sources and Oracle context
      window.location.reload();
    } catch (e: any) {
      toast.error(`Failed to update mentor: ${e.message}`);
    }
  };

  const getEngagementMetrics = () => {
    const totalTeams = teams.length;
    const activeTeams = teamStatuses.filter(status => 
      status.last_update && new Date(status.last_update) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    const recentUpdates = updates.filter(update => 
      new Date(update.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

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
        <TabsList className="grid w-full grid-cols-5 bg-card/50 backdrop-blur border-primary/20">
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
          <TabsTrigger value="oracle" className="data-[state=active]:bg-primary/20">
            <Activity className="h-4 w-4 mr-2" />
            Oracle Assistant
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary/20">
            <Settings className="h-4 w-4 mr-2" />
            Access Control
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
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Team Management</h3>
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
                    <div className="grid gap-2">
                      <Label htmlFor="teamDescription">Description</Label>
                      <Textarea
                        id="teamDescription"
                        value={teamDescription}
                        onChange={(e) => setTeamDescription(e.target.value)}
                        placeholder="Brief team description"
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="teamStage">Stage</Label>
                      <Select value={teamStage} onValueChange={(value: any) => setTeamStage(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ideation">Ideation</SelectItem>
                          <SelectItem value="development">Development</SelectItem>
                          <SelectItem value="testing">Testing</SelectItem>
                          <SelectItem value="launch">Launch</SelectItem>
                          <SelectItem value="growth">Growth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="teamTags">Tags</Label>
                      <Input
                        id="teamTags"
                        value={teamTags}
                        onChange={(e) => setTeamTags(e.target.value)}
                        placeholder="ai, health, mobile (comma separated)"
                      />
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
            <TeamDashboard 
              teams={teams} 
              teamStatuses={teamStatuses} 
              members={members} 
              selectedRole="lead" 
            />

            {/* Mentor Assignment System */}
            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Assign Mentors to Teams</CardTitle>
                <Dialog open={isAddMentorOpen} onOpenChange={setIsAddMentorOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="ufo-gradient">
                      <Plus className="h-4 w-4 mr-1" /> Add Mentor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                      <DialogTitle>Add Mentor</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div className="grid gap-2">
                        <Label htmlFor="mentorName">Name *</Label>
                        <Input
                          id="mentorName"
                          value={newMentorName}
                          onChange={(e) => setNewMentorName(e.target.value)}
                          placeholder="Enter mentor name"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsAddMentorOpen(false)}>Cancel</Button>
                      <Button onClick={createMentor} disabled={savingMentor}>
                        {savingMentor ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4">
                {mentorsList.length === 0 && (
                  <div className="text-sm text-muted-foreground">No mentors yet. Use "Add Mentor" to create one.</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team) => (
                    <div key={team.id} className="p-3 rounded-lg bg-background/30 border border-primary/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{team.name}</h4>
                        <Badge variant="outline">{team.stage}</Badge>
                      </div>
                      <div className="space-y-2">
                        <Label>Assigned Mentor</Label>
                        <Select
                          value={mentorAssignments[team.id]}
                          onValueChange={(val) =>
                            setMentorAssignments((prev) => ({ ...prev, [team.id]: val as any }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select mentor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {mentorsList.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => handleAssignMentor(team.id)}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ))}
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

        <TabsContent value="settings">
          <AccessCodeManager />
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
};