import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOracle } from "@/hooks/useOracle";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { UserIdentityOnboarding } from "@/components/onboarding/UserIdentityOnboarding";
import { Hub } from "@/components/Hub";
import { ProjectOnboarding } from "@/components/ProjectOnboarding";
import { AccessCodeSuccess } from "@/components/AccessCodeSuccess";
import { GuestDashboard } from "@/components/dashboards/GuestDashboard";
import { NewBuilderDashboard } from "@/components/NewBuilderDashboard";
import { MentorDashboard } from "@/components/dashboards/MentorDashboard";
import type { UserRole } from "@/types/oracle";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  
  // Local state for flow management
  const [currentView, setCurrentView] = useState<'hub' | 'project-onboarding' | 'access-code-success'>('hub');
  const [selectedRole, setSelectedRole] = useState<UserRole>('guest');
  
  // Track project creation data for access code display
  const [projectData, setProjectData] = useState<{
    accessCode?: string;
    teamName?: string;
    teamId?: string;
    isProjectLead?: boolean;
  } | null>(null);

  // Oracle hook for data fetching
  const { 
    teams, 
    members, 
    updates, 
    isLoading: oracleLoading 
  } = useOracle(selectedRole);

  // AUTHENTICATION GUARD
  useEffect(() => {
    console.log('=== AUTH GUARD DEBUG ===');
    console.log('User:', user?.id);
    console.log('Profile:', profile);
    console.log('Auth Loading:', loading);
    
    if (!loading && !user) {
      console.log('❌ Not authenticated - redirecting to auth');
      navigate('/auth', { replace: true });
      return;
    }

    if (user && profile) {
      console.log('✅ User authenticated with profile');
      console.log('Profile onboarding completed:', profile.onboarding_completed);
      console.log('Profile role:', profile.role);
      
      // Set role based on profile if onboarding is complete
      if (profile.onboarding_completed && profile.role && profile.role !== 'unassigned') {
        console.log('✅ Setting role:', profile.role);
        setSelectedRole(profile.role);
      } else {
        console.log('🔄 User needs onboarding or role assignment');
        setSelectedRole('guest');
      }
    }
  }, [user, profile, loading, navigate]);

  const handleLogout = async () => {
    console.log('🚪 Logging out...');
    setSelectedRole('guest');
  };

  const handleRoleSelect = (role: UserRole) => {
    console.log('🎭 Role selected:', role);
    setSelectedRole(role);
  };

  const handleBuilderAuthenticated = (builderName: string, teamId: string, teamInfo: any) => {
    console.log('🏗️ Builder authenticated:', builderName, teamId);
    setSelectedRole('builder');
  };

  const handleUserIdentityComplete = (data: any) => {
    console.log('🎉 User identity onboarding completed:', data);
    // Profile will be updated automatically by the component
  };

  const handleCreateProject = () => {
    setCurrentView('project-onboarding');
  };

  const handleProjectComplete = (data: any) => {
    console.log('🎉 Project onboarding completed:', data);
    setProjectData(data);
    setCurrentView('access-code-success');
  };

  const handleBackToHub = () => {
    setCurrentView('hub');
  };

  // LOADING STATE
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
          <h2 className="text-3xl font-semibold cosmic-text">Authenticating...</h2>
          <p className="text-muted-foreground text-lg high-contrast-text">Verifying your access</p>
        </div>
      </div>
    );
  }

  // Show user identity onboarding if profile is not complete
  if (!profile?.onboarding_completed) {
    return (
      <UserIdentityOnboarding onComplete={handleUserIdentityComplete} />
    );
  }

  // Show hub if user completed identity but hasn't chosen a specific role yet
  if (profile?.role === 'unassigned') {
    // Handle different views within the hub flow
    switch (currentView) {
      case 'project-onboarding':
        return (
          <ProjectOnboarding 
            onComplete={handleProjectComplete}
            onBack={handleBackToHub}
          />
        );
      
      case 'access-code-success':
        return (
          <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle">
            <div className="container mx-auto px-4 py-12">
              <div className="max-w-2xl mx-auto">
                <AccessCodeSuccess 
                  accessCode={projectData?.accessCode!}
                  teamName={projectData?.teamName}
                  role="builder"
                  isProjectLead={projectData?.isProjectLead || true}
                  onContinue={() => {
                    window.location.reload();
                  }}
                />
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <Hub 
            userProfile={profile} 
            onCreateProject={handleCreateProject}
          />
        );
    }
  }

  // ORACLE LOADING
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
          <h2 className="text-3xl font-semibold cosmic-text">Connecting to Oracle...</h2>
          <p className="text-muted-foreground text-lg high-contrast-text">Establishing quantum link to the knowledge base</p>
        </div>
      </div>
    );
  }

  const handleExitToGateway = () => {
    navigate('/gateway', { replace: true });
  };

  // DASHBOARD ROUTING - Based on profile role
  const renderDashboard = () => {
    const currentRole = profile?.role || selectedRole;
    
    console.log('🎯 Rendering dashboard for role:', currentRole);
    
    switch (currentRole) {
      case 'guest':
        return (
          <GuestDashboard 
            teams={teams || []}
            updates={updates || []}
            onExit={handleExitToGateway}
          />
        );
      case 'builder':
        return (
          <NewBuilderDashboard 
            teams={teams || []}
            members={members || []}
            updates={updates || []}
            onExit={handleExitToGateway}
          />
        );
      case 'mentor':
        return (
          <MentorDashboard 
            teams={teams || []}
            members={members || []}
            updates={updates || []}
            teamStatuses={[]}
            selectedRole={selectedRole}
            mentorId={user?.id || "current-mentor"}
            onExit={handleExitToGateway}
          />
        );
      // Lead role removed as per requirements
      default:
        console.log('❓ No valid role selected or invalid role:', currentRole);
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
};

export default Index;