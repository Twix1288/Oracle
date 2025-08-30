import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AccessGate } from "@/components/AccessGate";
import { BuilderAccessGate } from "@/components/BuilderAccessGate";
import { RoleSelector } from "@/components/RoleSelector";
import { GuestDashboard } from "@/components/dashboards/GuestDashboard";
import { BuilderDashboard } from "@/components/dashboards/BuilderDashboard";
import { EnhancedBuilderDashboard } from "@/components/EnhancedBuilderDashboard";
import { MentorDashboard } from "@/components/dashboards/MentorDashboard";
import { LeadDashboard } from "@/components/dashboards/LeadDashboard";
import { useOracle } from "@/hooks/useOracle";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";
import type { UserRole, Team } from "@/types/oracle";

function Index() {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [builderInfo, setBuilderInfo] = useState<{
    name: string;
    teamId: string;
    team: Team;
  } | null>(null);
  
  const { 
    teams, 
    members, 
    updates, 
    teamStatuses,
    isLoading, 
    submitUpdate, 
    createTeam, 
    queryRAG, 
    ragResponse, 
    ragLoading
  } = useOracle(selectedRole);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (profile && profile.role && profile.role !== 'unassigned') {
      // Auto-set role if user has completed onboarding and has a role
      setSelectedRole(profile.role);
    }
  }, [user, profile, authLoading, navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      navigate('/auth');
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    // Reset builder info when switching roles
    if (role !== 'builder') {
      setBuilderInfo(null);
    }
  };

  const handleBuilderAuthenticated = (builderName: string, teamId: string, teamInfo: Team) => {
    setSelectedRole('builder');
    setBuilderInfo({
      name: builderName,
      teamId: teamId,
      team: teamInfo
    });
  };

  const handleRoleAssigned = () => {
    // Refresh the page to get updated profile data
    window.location.reload();
  };

  const handleLeaveTeam = () => {
    setBuilderInfo(null);
    setSelectedRole(null);
  };

  // Show access gate if user is unassigned
  if (profile && profile.role === 'unassigned') {
    return (
      <div className="min-h-screen bg-cosmic cosmic-sparkle">
        {/* Logout header for unassigned users */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Welcome, {user?.email}
                </span>
              </div>
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-background hover:bg-muted/50 border-border"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
        
        <AccessGate onRoleAssigned={handleRoleAssigned} />
      </div>
    );
  }

  // Show loading while checking auth
  if (authLoading) {
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
          <h2 className="text-3xl font-semibold cosmic-text">Authenticating...</h2>
          <p className="text-muted-foreground text-lg high-contrast-text">Verifying your access</p>
        </div>
      </div>
    );
  }

  // Show enhanced builder access gate for builders (legacy)
  if (!selectedRole || (selectedRole === 'builder' && !builderInfo && profile?.role === 'builder')) {
    return (
      <div className="min-h-screen bg-cosmic cosmic-sparkle">
        {/* Logout header for role selection */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Welcome, {user?.email}
                </span>
              </div>
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-background hover:bg-muted/50 border-border"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
        
        <BuilderAccessGate 
          onBuilderAuthenticated={handleBuilderAuthenticated}
          onRoleSelected={handleRoleSelect} 
        />
      </div>
    );
  }

  if (isLoading) {
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
          <h2 className="text-3xl font-semibold cosmic-text">Connecting to Oracle...</h2>
          <p className="text-muted-foreground text-lg high-contrast-text">Establishing quantum link to the knowledge base</p>
        </div>
      </div>
    );
  }

  const handleQueryRAG = (query: string, role: UserRole) => {
    queryRAG({ query, role });
  };

  const renderDashboard = () => {
    switch (selectedRole) {
      case 'guest':
        return (
          <GuestDashboard 
            teams={teams || []}
            updates={updates || []}
            onExit={() => setSelectedRole(null)}
          />
        );
      case 'builder':
        return builderInfo ? (
          <EnhancedBuilderDashboard
            team={builderInfo.team}
            builderName={builderInfo.name}
            members={members || []}
            updates={updates || []}
            teamStatuses={teamStatuses}
            onSubmitUpdate={(teamId: string, content: string, type: any, createdBy?: string) => 
              submitUpdate({ teamId, content, type, createdBy })
            }
            onQueryRAG={(params: { query: string; role: UserRole }) => 
              queryRAG(params)
            }
            ragResponse={ragResponse}
            ragLoading={ragLoading}
            onLeaveTeam={handleLeaveTeam}
          />
        ) : (
          <BuilderDashboard
            teams={teams || []}
            members={members || []}
            updates={updates || []}
            teamStatuses={teamStatuses}
            selectedRole={selectedRole}
            builderId="current-builder"
            teamId={teams?.[0]?.id}
            onSubmitUpdate={(update: any) => 
              submitUpdate(update)
            }
            onQueryRAG={(query: string, role: UserRole) => 
              queryRAG({ query, role })
            }
            onExit={() => setSelectedRole(null)}
          />
        );
      case 'mentor':
        return (
          <MentorDashboard 
            teams={teams || []}
            members={members || []}
            updates={updates || []}
            teamStatuses={teamStatuses}
            selectedRole={selectedRole}
            mentorId="current-mentor"
            onExit={() => setSelectedRole(null)}
          />
        );
      case 'lead':
        return (
          <LeadDashboard 
            teams={teams || []}
            members={members || []}
            updates={updates || []}
            teamStatuses={teamStatuses}
            selectedRole={selectedRole}
            onExit={() => setSelectedRole(null)}
          />
        );
      default:
        return <BuilderAccessGate onBuilderAuthenticated={handleBuilderAuthenticated} onRoleSelected={handleRoleSelect} />;
    }
  };

  return renderDashboard();
}

export default Index;