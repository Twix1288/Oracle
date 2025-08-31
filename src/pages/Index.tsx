import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { InitialOnboarding } from "@/components/InitialOnboarding";

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

  // AUTHENTICATION GUARD - BULLETPROOF
  useEffect(() => {
    console.log('=== AUTH GUARD DEBUG ===');
    console.log('User:', user?.id);
    console.log('Profile:', profile);
    console.log('Auth Loading:', authLoading);
    
    if (!authLoading && !user) {
      console.log('❌ Not authenticated - redirecting to auth');
      navigate('/auth');
      return;
    }

    if (user && profile) {
      console.log('✅ User authenticated with profile');
      console.log('Profile onboarding completed:', profile.onboarding_completed);
      console.log('Profile role:', profile.role);
      
      // Only set role if user has completed onboarding AND has a valid role
      if (profile.onboarding_completed && profile.role && profile.role !== 'unassigned') {
        console.log('✅ Setting role:', profile.role);
        setSelectedRole(profile.role);
      } else {
        console.log('🔄 User needs onboarding - clearing role');
        setSelectedRole(null);
      }
    }
  }, [user, profile, authLoading, navigate]);

  const handleExitToGateway = () => {
    console.log('🚪 Exiting to gateway...');
    navigate('/gateway');
  };

  const handleLogout = async () => {
    console.log('🚪 Logging out...');
    try {
      // Clear all local state first
      setSelectedRole(null);
      setBuilderInfo(null);
      
      // Sign out from Supabase
      await signOut();
      
      toast.success("✅ Logged out successfully");
      
      // Force complete page reload to reset all state
      window.location.href = '/auth';
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      toast.error("Failed to log out");
      // Force redirect anyway
      window.location.href = '/auth';
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    console.log('🎭 Role selected:', role);
    setSelectedRole(role);
    // Reset builder info when switching roles
    if (role !== 'builder') {
      setBuilderInfo(null);
    }
  };

  const handleBuilderAuthenticated = (builderName: string, teamId: string, teamInfo: Team) => {
    console.log('🏗️ Builder authenticated:', builderName, teamId);
    setSelectedRole('builder');
    setBuilderInfo({
      name: builderName,
      teamId: teamId,
      team: teamInfo
    });
  };

  const handleLeaveTeam = () => {
    console.log('🚪 Leaving team and going to gateway...');
    setBuilderInfo(null);
    setSelectedRole(null);
    navigate('/gateway');
  };

  // LOADING STATE
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

  // ONBOARDING REQUIRED - Show for users without completed onboarding
  if (user && !authLoading) {
    // If user exists but profile hasn't loaded yet, show loading
    if (!profile) {
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
            <h2 className="text-3xl font-semibold cosmic-text">Loading Profile...</h2>
            <p className="text-muted-foreground text-lg high-contrast-text">Setting up your experience</p>
          </div>
        </div>
      );
    }
    
    // If profile loaded but onboarding incomplete, show onboarding
    if (!profile.onboarding_completed || !profile.role || profile.role === 'unassigned') {
      console.log('🎯 Showing onboarding for user - incomplete profile:', {
        onboarding_completed: profile.onboarding_completed,
        role: profile.role,
        user_id: user.id
      });
      return (
        <div className="min-h-screen bg-cosmic cosmic-sparkle">
        {/* Logout header */}
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
        
        <InitialOnboarding />
      </div>
      );
    }
  }

  // ORACLE LOADING
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

  // DASHBOARD ROUTING - Only for completed users with valid roles
  const renderDashboard = () => {
    console.log('🎯 Rendering dashboard for role:', selectedRole);
    
    switch (selectedRole) {
      case 'guest':
        return (
          <GuestDashboard 
            teams={teams || []}
            updates={updates || []}
            onExit={handleExitToGateway}
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
            onExit={handleExitToGateway}
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
            onExit={handleExitToGateway}
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
            onExit={handleExitToGateway}
          />
        );
      default:
        // This should never happen with bulletproof routing
        console.log('❓ No valid role selected - this should not happen');
        return (
          <div className="min-h-screen flex items-center justify-center bg-cosmic cosmic-sparkle">
            <div className="text-center space-y-6 p-8 ufo-card rounded-xl">
              <h2 className="text-2xl font-semibold cosmic-text">Loading...</h2>
              <p className="text-muted-foreground">Setting up your dashboard...</p>
            </div>
          </div>
        );
    }
  };

  return renderDashboard();
}

export default Index;