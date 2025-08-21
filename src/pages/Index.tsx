import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LeadDashboardEnhanced } from "@/components/LeadDashboardEnhanced";
import { EnhancedBuilderDashboard } from "@/components/EnhancedBuilderDashboard";
import { MentorDashboard } from "@/components/dashboards/MentorDashboard";
import { GuestDashboard } from "@/components/dashboards/GuestDashboard";
import { AccessGate } from "@/components/AccessGate";
import { useOracle } from "@/hooks/useOracle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Link, LogOut } from "lucide-react";
import { toast } from "sonner";
import type { UserRole, Team } from "@/types/oracle";

function Index() {
  const { user, profile, loading, signOut } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [linkCode, setLinkCode] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [showLinkSection, setShowLinkSection] = useState(false);
  
  const { 
    teams, 
    members, 
    updates, 
    teamStatuses,
    isLoading: oracleLoading, 
    submitUpdate, 
    queryRAG, 
    ragResponse, 
    ragLoading
  } = useOracle(selectedRole || 'guest');

  const handleDiscordLink = async () => {
    if (!linkCode.trim()) {
      toast.error("Please enter a link code");
      return;
    }

    setLinkLoading(true);
    try {
      const { data, error } = await supabase.rpc('link_discord_account', {
        p_link_code: linkCode.trim()
      });

      if (error) throw error;

      const result = data as { success: boolean; discord_username?: string; error?: string };

      if (result?.success) {
        toast.success(`Discord account linked successfully! Welcome ${result.discord_username}`);
        setLinkCode("");
        setShowLinkSection(false);
      } else {
        toast.error(result?.error || "Failed to link Discord account");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to link Discord account");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleRoleSelected = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleExit = () => {
    setSelectedRole(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cosmic cosmic-sparkle">
        <div className="text-center space-y-6 p-8 ufo-card rounded-xl">
          <div className="ufo-pulse">
            <svg width="120" height="120" viewBox="0 0 100 100" fill="currentColor" className="text-primary mx-auto">
              <ellipse cx="50" cy="60" rx="35" ry="15" opacity="0.6"/>
              <ellipse cx="50" cy="45" rx="25" ry="20"/>
              <circle cx="40" cy="40" r="3" fill="white" opacity="0.8"/>
              <circle cx="50" cy="38" r="4" fill="white"/>
              <circle cx="60" cy="40" r="3" fill="white" opacity="0.8"/>
            </svg>
          </div>
          <h2 className="text-3xl font-semibold cosmic-text">Initializing PieFi Oracle...</h2>
          <p className="text-muted-foreground text-lg high-contrast-text">Connecting to your personalized dashboard</p>
        </div>
      </div>
    );
  }

  // Show gateway if no role selected or user not authenticated
  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-cosmic cosmic-sparkle">
        {/* Header with auth controls */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <svg width="32" height="32" viewBox="0 0 100 100" fill="currentColor" className="text-primary">
                    <ellipse cx="50" cy="60" rx="35" ry="15" opacity="0.6"/>
                    <ellipse cx="50" cy="45" rx="25" ry="20"/>
                    <circle cx="40" cy="40" r="3" fill="white" opacity="0.8"/>
                    <circle cx="50" cy="38" r="4" fill="white"/>
                    <circle cx="60" cy="40" r="3" fill="white" opacity="0.8"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">PieFi Oracle Gateway</h1>
                  <p className="text-sm text-muted-foreground">Select your role to access the dashboard</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {user ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLinkSection(!showLinkSection)}
                      className="bg-background hover:bg-muted/50 border-border"
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Link Discord
                    </Button>
                    <Badge variant="secondary" className="px-3 py-1">
                      {profile?.full_name || user.email}
                    </Badge>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={signOut}
                      className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.location.href = '/auth'}
                    className="ufo-gradient hover:opacity-90"
                  >
                    Sign In
                  </Button>
                )}
              </div>
            </div>

            {/* Discord Link Section */}
            {showLinkSection && user && (
              <div className="mt-4 p-4 bg-card/50 backdrop-blur rounded-lg border border-border">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link className="w-5 h-5" />
                      Link Discord Account
                    </CardTitle>
                    <CardDescription>
                      Enter your 6-digit link code from the Discord bot to connect your accounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <Input
                        placeholder="Enter 6-digit code"
                        value={linkCode}
                        onChange={(e) => setLinkCode(e.target.value)}
                        maxLength={6}
                        className="font-mono text-center tracking-wider"
                      />
                      <Button
                        onClick={handleDiscordLink}
                        disabled={linkLoading || !linkCode.trim()}
                        className="ufo-gradient hover:opacity-90"
                      >
                        {linkLoading ? "Linking..." : "Link Account"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Get your link code by using the <code>/link</code> command in Discord
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Role Selection */}
        <div className="container mx-auto px-4 py-8">
          <AccessGate onRoleSelected={handleRoleSelected} />
        </div>
      </div>
    );
  }

  // Render dashboard based on selected role
  const renderDashboard = () => {
    if (oracleLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cosmic cosmic-sparkle">
          <div className="text-center space-y-6 p-8 ufo-card rounded-xl">
            <div className="ufo-pulse">
              <svg width="120" height="120" viewBox="0 0 100 100" fill="currentColor" className="text-primary mx-auto">
                <ellipse cx="50" cy="60" rx="35" ry="15" opacity="0.6"/>
                <ellipse cx="50" cy="45" rx="25" ry="20"/>
                <circle cx="40" cy="40" r="3" fill="white" opacity="0.8"/>
                <circle cx="50" cy="38" r="4" fill="white"/>
                <circle cx="60" cy="40" r="3" fill="white" opacity="0.8"/>
              </svg>
            </div>
            <h2 className="text-3xl font-semibold cosmic-text">Loading Dashboard...</h2>
            <p className="text-muted-foreground text-lg high-contrast-text">Preparing your workspace</p>
          </div>
        </div>
      );
    }

    switch (selectedRole) {
      case 'lead':
        return <LeadDashboardEnhanced />;
        
      case 'mentor':
        return (
          <MentorDashboard 
            teams={teams || []}
            members={members || []}
            updates={updates || []}
            teamStatuses={teamStatuses}
            selectedRole="mentor"
            mentorId={profile?.id}
            onExit={handleExit}
          />
        );
        
      case 'builder':
        // If builder has a team, show enhanced dashboard
        if (profile?.team_id && teams?.find(t => t.id === profile.team_id)) {
          const team = teams.find(t => t.id === profile.team_id)!;
          return (
            <EnhancedBuilderDashboard
              team={team}
              builderName={profile.full_name || 'Builder'}
              members={members || []}
              updates={updates || []}
              teamStatuses={teamStatuses}
              onSubmitUpdate={(teamId: string, content: string, type: any, createdBy?: string) => 
                submitUpdate({ teamId, content, type, createdBy })
              }
              onQueryRAG={(params: { query: string; role: any }) => 
                queryRAG(params)
              }
              ragResponse={ragResponse}
              ragLoading={ragLoading}
              onLeaveTeam={handleExit}
            />
          );
        }
        // Fall through to guest dashboard if no team
        
      case 'guest':
      default:
        return (
          <GuestDashboard 
            teams={teams || []}
            updates={updates || []}
            onExit={handleExit}
          />
        );
    }
  };

  return renderDashboard();
}

export default Index;