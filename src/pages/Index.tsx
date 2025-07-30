import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Brain, BarChart3, Users, Zap, Target, MessageSquare, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { AccessGate } from "@/components/AccessGate";
import { OracleQuery } from "@/components/OracleQuery";
import { ProgressTracker } from "@/components/ProgressTracker";
import { TeamDashboard } from "@/components/TeamDashboard";
import { useOracle } from "@/hooks/useOracle";
import type { UserRole } from "@/types/oracle";

const Index = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState("oracle");
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
  } = useOracle(selectedRole || 'guest');

  const handleSubmitUpdate = (teamId: string, content: string, type: any, createdBy?: string) => {
    submitUpdate({ teamId, content, type, createdBy });
    toast({
      title: "Mission log updated",
      description: "Your progress transmission has been recorded in the Oracle.",
    });
  };

  const handleRAGQuery = (query: string, role: UserRole) => {
    queryRAG({ query, role });
  };

  if (!selectedRole) {
    return <AccessGate onRoleSelected={setSelectedRole} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center cosmic-sparkle">
        <div className="text-center space-y-6">
          <div className="ufo-pulse">
            <svg width="120" height="120" viewBox="0 0 100 100" fill="currentColor" className="text-primary mx-auto">
              <ellipse cx="50" cy="60" rx="35" ry="15" opacity="0.6"/>
              <ellipse cx="50" cy="45" rx="25" ry="20"/>
              <circle cx="40" cy="40" r="3" fill="white" opacity="0.8"/>
              <circle cx="50" cy="38" r="4" fill="white"/>
              <circle cx="60" cy="40" r="3" fill="white" opacity="0.8"/>
            </svg>
          </div>
          <h2 className="text-3xl font-semibold text-glow">Connecting to Oracle...</h2>
          <p className="text-muted-foreground">Establishing quantum link to the knowledge base</p>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: "oracle", label: "Oracle Query", icon: Brain },
    { id: "teams", label: "Teams", icon: Users },
    { id: "progress", label: "Progress", icon: Target },
    { id: "insights", label: "Insights", icon: BarChart3 },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background cosmic-sparkle">
        {/* Sidebar */}
        <Sidebar className="border-r border-primary/20 bg-card/50 backdrop-blur">
          <SidebarContent>
            {/* Header */}
            <div className="p-6 border-b border-primary/20">
              <div className="flex items-center gap-3">
                <div className="ufo-pulse">
                  <svg width="32" height="32" viewBox="0 0 100 100" fill="currentColor" className="text-primary">
                    <ellipse cx="50" cy="60" rx="35" ry="15" opacity="0.6"/>
                    <ellipse cx="50" cy="45" rx="25" ry="20"/>
                    <circle cx="40" cy="40" r="3" fill="white" opacity="0.8"/>
                    <circle cx="50" cy="38" r="4" fill="white"/>
                    <circle cx="60" cy="40" r="3" fill="white" opacity="0.8"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-glow">PieFi Oracle</h1>
                  <p className="text-xs text-muted-foreground capitalize">{selectedRole} Mission Control</p>
                </div>
              </div>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel className="text-primary">Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton 
                        onClick={() => setActiveTab(item.id)}
                        isActive={activeTab === item.id}
                        className="group hover:bg-primary/10 data-[active=true]:bg-primary/20 data-[active=true]:text-primary"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Role Change */}
            <div className="mt-auto p-4 border-t border-primary/20">
              <button
                onClick={() => setSelectedRole(null)}
                className="w-full p-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                🚀 Change Role
              </button>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b border-primary/20 bg-card/30 backdrop-blur p-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-primary hover:bg-primary/10" />
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Mission Dashboard</h2>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-6 space-y-6 overflow-auto">
            {activeTab === "oracle" && (
              <OracleQuery
                onQuery={handleRAGQuery}
                isLoading={ragLoading}
                response={ragResponse}
                selectedRole={selectedRole}
              />
            )}

            {activeTab === "teams" && (
              <TeamDashboard
                teams={teams || []}
                teamStatuses={teamStatuses || []}
                members={members || []}
                selectedRole={selectedRole}
              />
            )}

            {activeTab === "progress" && (
              <ProgressTracker
                updates={updates || []}
                teams={teams || []}
                onSubmitUpdate={handleSubmitUpdate}
                selectedRole={selectedRole}
              />
            )}

            {activeTab === "insights" && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="glow-border bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Team Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {['ideation', 'development', 'testing', 'launch', 'growth'].map(stage => {
                        const count = teams?.filter(team => team.stage === stage).length || 0;
                        return (
                          <div key={stage} className="flex justify-between items-center text-sm">
                            <span className="capitalize text-muted-foreground">{stage}</span>
                            <span className="font-medium text-primary">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glow-border bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Mission Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Updates</span>
                        <span className="font-medium text-primary">{updates?.length || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Active Teams</span>
                        <span className="font-medium text-primary">{teams?.length || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Crew</span>
                        <span className="font-medium text-primary">{members?.length || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glow-border bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Your Access Level
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Role:</span>
                        <span className="font-medium capitalize text-primary">{selectedRole}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {selectedRole === 'builder' && "Access your team's mission logs and progress tracking"}
                        {selectedRole === 'mentor' && "Monitor and guide your assigned teams across the galaxy"}
                        {selectedRole === 'lead' && "Full mission control and strategic oversight of all operations"}
                        {selectedRole === 'guest' && "Public transmission access and general mission information"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;