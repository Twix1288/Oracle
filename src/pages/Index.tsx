import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOracle } from "@/hooks/useOracle";
import { AccessGate } from "@/components/AccessGate";
import { BuilderDashboard } from "@/components/dashboards/BuilderDashboard";
import { MentorDashboard } from "@/components/dashboards/MentorDashboard";
import { LeadDashboard } from "@/components/dashboards/LeadDashboard";
import { GuestDashboard } from "@/components/dashboards/GuestDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Link, LogOut } from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/types/oracle";

function Index() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [linkCode, setLinkCode] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [showLinkSection, setShowLinkSection] = useState(false);

  // Get Oracle data for dashboards - must be called before any conditional returns
  const oracleData = useOracle(selectedRole || 'guest');

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Set user's role from profile once loaded
  useEffect(() => {
    if (profile?.role && !selectedRole) {
      setSelectedRole(profile.role as UserRole);
    }
  }, [profile, selectedRole]);

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

  // Show gateway if no role selected and user needs to pick one
  if (!selectedRole && (!profile || !profile.role)) {
    return (
      <div className="min-h-screen bg-cosmic cosmic-sparkle">
        {/* Simplified Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/20">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 ufo-glow">
                  <svg width="28" height="28" viewBox="0 0 100 100" fill="currentColor" className="text-primary">
                    <ellipse cx="50" cy="60" rx="35" ry="15" opacity="0.6"/>
                    <ellipse cx="50" cy="45" rx="25" ry="20"/>
                    <circle cx="40" cy="40" r="3" fill="white" opacity="0.8"/>
                    <circle cx="50" cy="38" r="4" fill="white"/>
                    <circle cx="60" cy="40" r="3" fill="white" opacity="0.8"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-semibold cosmic-text">PieFi Oracle</h1>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {user ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowLinkSection(!showLinkSection)}
                      className="text-xs h-8 px-3 hover:bg-primary/10"
                    >
                      <Link className="w-3 h-3 mr-1" />
                      Link Discord
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={signOut}
                      className="text-xs h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      <LogOut className="w-3 h-3 mr-1" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.location.href = '/auth'}
                    className="ufo-gradient hover:opacity-90 text-xs h-8 px-4"
                  >
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Discord Link Section - Compact */}
        {showLinkSection && user && (
          <div className="container mx-auto px-4 py-4">
            <Card className="max-w-md mx-auto bg-card/50 backdrop-blur border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Link className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Discord Link Code</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="6-digit code"
                    value={linkCode}
                    onChange={(e) => setLinkCode(e.target.value)}
                    maxLength={6}
                    className="font-mono text-center text-sm h-8"
                  />
                  <Button
                    onClick={handleDiscordLink}
                    disabled={linkLoading || !linkCode.trim()}
                    size="sm"
                    className="ufo-gradient hover:opacity-90 h-8 px-3 text-xs"
                  >
                    {linkLoading ? "..." : "Link"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Use <code className="bg-muted px-1 py-0.5 rounded text-xs">/link</code> in Discord
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Gateway Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8 space-y-4">
            <div className="inline-block p-4 rounded-full bg-primary/10 ufo-glow mb-4">
              <svg width="48" height="48" viewBox="0 0 100 100" fill="currentColor" className="text-primary ufo-pulse">
                <ellipse cx="50" cy="60" rx="35" ry="15" opacity="0.6"/>
                <ellipse cx="50" cy="45" rx="25" ry="20"/>
                <circle cx="40" cy="40" r="3" fill="white" opacity="0.8"/>
                <circle cx="50" cy="38" r="4" fill="white"/>
                <circle cx="60" cy="40" r="3" fill="white" opacity="0.8"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold cosmic-text">Welcome to PieFi Oracle</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Your AI-powered guidance system for building extraordinary products
            </p>
          </div>
          <AccessGate onRoleSelected={handleRoleSelected} />
        </div>
      </div>
    );
  }


  // Render role-specific dashboard
  const renderDashboard = () => {
    const sharedProps = {
      teams: oracleData.teams || [],
      members: oracleData.members || [],
      updates: oracleData.updates || [],
      teamStatuses: oracleData.teamStatuses || [],
      selectedRole: selectedRole as UserRole,
      onExit: handleExit
    };

    switch (selectedRole) {
      case 'builder':
        return <BuilderDashboard {...sharedProps} />;
      case 'mentor':
        return (
          <MentorDashboard 
            {...sharedProps}
            mentorId={profile?.id}
          />
        );
      case 'lead':
        return <LeadDashboard {...sharedProps} />;
      case 'guest':
        return <GuestDashboard {...sharedProps} />;
      default:
        return null;
    }
  };

  // Show loading if no user or still loading
  if (loading || !user) {
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

  return selectedRole ? renderDashboard() : null;
}

export default Index;