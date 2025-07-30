import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Search, BarChart3, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { RoleSelector } from "@/components/RoleSelector";
import { QueryBar } from "@/components/QueryBar";
import { ProgressTracker } from "@/components/ProgressTracker";
import { TeamDashboard } from "@/components/TeamDashboard";
import { useOracle } from "@/hooks/useOracle";
import type { UserRole } from "@/types/oracle";

const Index = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('guest');
  const { toast } = useToast();
  
  const {
    teams,
    updates,
    members,
    teamStatuses,
    isLoading,
    submitUpdate,
    queryRAG,
    ragResponse,
    ragLoading,
  } = useOracle(selectedRole);

  const handleSubmitUpdate = (teamId: string, content: string, type: any, createdBy?: string) => {
    submitUpdate({ teamId, content, type, createdBy });
    toast({
      title: "Update submitted",
      description: "Your progress update has been recorded.",
    });
  };

  const handleRAGQuery = (query: string, role: UserRole) => {
    queryRAG({ query, role });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Brain className="h-16 w-16 mx-auto animate-pulse text-primary" />
          <h2 className="text-2xl font-semibold">Loading Oracle...</h2>
          <p className="text-muted-foreground">Connecting to the knowledge base</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">The Oracle</h1>
                <p className="text-sm text-muted-foreground">Intelligent Incubator Dashboard</p>
              </div>
            </div>
            <RoleSelector selectedRole={selectedRole} onRoleChange={setSelectedRole} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Query Bar */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Ask Oracle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QueryBar
                onQuery={handleRAGQuery}
                isLoading={ragLoading}
                response={ragResponse}
                selectedRole={selectedRole}
              />
            </CardContent>
          </Card>
        </section>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="teams" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 lg:w-auto">
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams">
            <TeamDashboard
              teams={teams || []}
              teamStatuses={teamStatuses || []}
              members={members || []}
              selectedRole={selectedRole}
            />
          </TabsContent>

          <TabsContent value="progress">
            <ProgressTracker
              updates={updates || []}
              teams={teams || []}
              onSubmitUpdate={handleSubmitUpdate}
              selectedRole={selectedRole}
            />
          </TabsContent>

          <TabsContent value="insights">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Team Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {['ideation', 'development', 'testing', 'launch', 'growth'].map(stage => {
                      const count = teams?.filter(team => team.stage === stage).length || 0;
                      return (
                        <div key={stage} className="flex justify-between text-sm">
                          <span className="capitalize">{stage}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Updates</span>
                      <span className="font-medium">{updates?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Teams</span>
                      <span className="font-medium">{teams?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Members</span>
                      <span className="font-medium">{members?.length || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Role Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-2">
                    <p>Current role: <span className="font-medium capitalize">{selectedRole}</span></p>
                    <p className="text-muted-foreground">
                      {selectedRole === 'builder' && "View your team's progress and submit updates"}
                      {selectedRole === 'mentor' && "Monitor and guide your assigned teams"}
                      {selectedRole === 'lead' && "Full program oversight and analytics"}
                      {selectedRole === 'guest' && "Public information and general insights"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
