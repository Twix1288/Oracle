import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Users, TrendingUp, Calendar, Sparkles, MessageSquare } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { GloriousOracle } from "../GloriousOracle";
import { UserProfileEditor } from "../UserProfileEditor";
import type { Team, Update } from "@/types/oracle";

interface GuestDashboardProps {
  teams: Team[];
  updates: Update[];
  onExit: () => void;
}

export const GuestDashboard = ({ teams, updates, onExit }: GuestDashboardProps) => {
  const [activeTab, setActiveTab] = useState("oracle");
  // Filter to show only sanitized, public data
  const publicTeams = teams.map(team => ({
    ...team,
    description: team.description ? "Building innovative solutions" : undefined,
    // Remove sensitive information
    assigned_mentor_id: undefined
  }));

  const publicUpdates = updates
    .filter(update => update.type !== 'mentor_meeting') // Hide sensitive meetings
    .map(update => ({
      ...update,
      content: update.content.length > 100 
        ? `${update.content.substring(0, 100)}...` 
        : update.content,
      created_by: undefined // Anonymize
    }))
    .slice(0, 10); // Limit to recent updates

  const getMetrics = () => {
    const totalTeams = publicTeams.length;
    const activeStages = [...new Set(publicTeams.map(team => team.stage))];
    const recentUpdates = publicUpdates.filter(update => 
      new Date(update.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    return { totalTeams, activeStages: activeStages.length, recentUpdates };
  };

  const metrics = getMetrics();

  const stageColors = {
    ideation: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    development: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    testing: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    launch: "bg-green-500/20 text-green-300 border-green-500/30",
    growth: "bg-orange-500/20 text-orange-300 border-orange-500/30"
  };

  return (
    <>
      <DashboardHeader 
        role="guest" 
        onExit={onExit}
      />
      <div className="container mx-auto px-6 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/20 ufo-pulse">
          <Eye className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold cosmic-text">PieFi Incubator</h1>
          <p className="readable-muted">Public mission overview</p>
        </div>
      </div>

      {/* Welcome Message */}
      <Card className="ufo-card">
        <CardContent className="p-6 text-center">
          <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 ufo-pulse" />
          <h3 className="text-xl font-medium mb-2 high-contrast-text">Welcome to PieFi</h3>
          <p className="readable-muted max-w-2xl mx-auto">
            PieFi is an innovative incubator program where teams build the future. 
            Explore our active teams, their progress, and the amazing projects taking shape.
          </p>
        </CardContent>
      </Card>

      {/* Public Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="ufo-card interactive-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm readable-muted">Active Teams</p>
                <p className="text-2xl font-bold high-contrast-text">{metrics.totalTeams}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="ufo-card interactive-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm readable-muted">Development Stages</p>
                <p className="text-2xl font-bold high-contrast-text">{metrics.activeStages}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="ufo-card interactive-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-sm readable-muted">Weekly Updates</p>
                <p className="text-2xl font-bold high-contrast-text">{metrics.recentUpdates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 ufo-card">
          <TabsTrigger value="oracle" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <MessageSquare className="h-4 w-4 mr-2" />
            Oracle Intelligence
          </TabsTrigger>
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Eye className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="about" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Sparkles className="h-4 w-4 mr-2" />
            About
          </TabsTrigger>
        </TabsList>

        <TabsContent value="oracle">
          <GloriousOracle 
            selectedRole="guest"
          />
        </TabsContent>

        <TabsContent value="overview">
      {/* Active Teams Overview */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Active Teams
          </CardTitle>
        </CardHeader>
        <CardContent>
          {publicTeams.length === 0 ? (
            <p className="text-muted-foreground text-center">No active teams</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicTeams.map((team) => (
                <div 
                  key={team.id} 
                  className="p-4 rounded-lg bg-background/30 border border-primary/10 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{team.name}</h4>
                    <Badge 
                      className={stageColors[team.stage as keyof typeof stageColors]} 
                      variant="outline"
                    >
                      {team.stage}
                    </Badge>
                  </div>
                  
                  {team.description && (
                    <p className="text-sm text-muted-foreground">{team.description}</p>
                  )}
                  
                  {team.tags && team.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {team.tags.slice(0, 3).map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs bg-primary/10 text-primary border-primary/30"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Public Updates Feed */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {publicUpdates.length === 0 ? (
            <p className="text-muted-foreground text-center">No recent activity</p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {publicUpdates.map((update) => (
                <div 
                  key={update.id} 
                  className="p-3 rounded-lg bg-background/30 border border-primary/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                        {update.type.replace('_', ' ')}
                      </Badge>
                      {update.teams && (
                        <span className="text-sm text-muted-foreground">
                          Team {update.teams.name}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(update.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="text-sm leading-relaxed">{update.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>


        <TabsContent value="about">
          {/* FAQ Section */}
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>About PieFi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-medium text-primary">What is PieFi?</h4>
                <p className="text-sm text-muted-foreground">
                  PieFi is an innovative incubator program that helps teams build and launch cutting-edge products. 
                  We provide mentorship, resources, and guidance throughout the development journey.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-primary">How does the program work?</h4>
                <p className="text-sm text-muted-foreground">
                  Teams progress through different stages: ideation, development, testing, launch, and growth. 
                  Each team is paired with experienced mentors who provide guidance and support.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-primary">Want to join?</h4>
                <p className="text-sm text-muted-foreground">
                  Interested in joining PieFi? Contact our team to learn about application opportunities 
                  and how you can become part of our innovation ecosystem.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
};