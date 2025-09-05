import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { PersonalOnboarding } from '@/components/onboarding/PersonalOnboarding';
import { EnhancedBuilderDashboard } from "@/components/EnhancedBuilderDashboard";
import { MentorDashboard } from "@/components/dashboards/MentorDashboard";
import { useAuth } from "@/hooks/useAuth";

function Index() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const handleOnboardingComplete = () => {
    // Redirect to Gateway after personal onboarding
    navigate('/gateway', { replace: true });
  };

  const handleExitToGateway = () => {
    navigate('/gateway', { replace: true });
  };

  const handleLogout = async () => {
    // Handle logout logic
    navigate('/auth', { replace: true });
  };

  // LOADING STATE
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-cosmic">
        <div className="text-center space-y-6 p-8 rounded-xl">
          <h2 className="text-3xl font-semibold">Authenticating...</h2>
          <p className="text-muted-foreground text-lg">Verifying your access</p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show personal onboarding if profile is not complete
  if (user && profile && !profile.onboarding_completed) {
    return (
      <PersonalOnboarding 
        userId={user.id} 
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // After onboarding completion, redirect to Gateway hub
  if (user && profile && profile.onboarding_completed) {
    // Check if user has a team and role
    if (profile.team_id && profile.role === 'builder') {
      // Show team dashboard for builders with teams
      // Redirect to Gateway hub for builders with teams (for now)
      return <Navigate to="/gateway" replace />;
    } else if (profile.role === 'mentor') {
      // Show mentor dashboard
      // Redirect to Gateway hub for mentors (for now)
      return <Navigate to="/gateway" replace />;
    } else {
      // Redirect to Gateway hub for unassigned users or those without teams
      return <Navigate to="/gateway" replace />;
    }
  }

  // Fallback - should not normally reach here
  return <Navigate to="/gateway" replace />;
}

export default Index;