import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import NotFound from '@/pages/NotFound';

import { DetailedOnboarding } from '@/components/DetailedOnboarding';
import { TeamJoinFlow } from '@/components/TeamJoinFlow';
import { TeamSelector } from '@/components/TeamSelector';
import { RoleAssignment } from '@/components/RoleAssignment';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient();

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  // Show role assignment if user hasn't been assigned a role yet (unassigned or null)
  if (!profile?.role || profile?.role === 'unassigned') {
    return <RoleAssignment onRoleAssigned={() => {
      // Force refresh of auth state after role assignment
      setTimeout(() => {
        // The auth hook will automatically refetch the profile data
      }, 100);
    }} />;
  }

  // Show team selection if user is a builder without a team
  if (profile?.role === 'builder' && !profile?.team_id) {
    return <TeamSelector onTeamSelected={() => {
      // Force refresh of auth state after team selection
      setTimeout(() => {
        // The auth hook will automatically refetch the profile data
      }, 100);
    }} />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route 
              path="/" 
              element={
                <AuthWrapper>
                  <Index />
                </AuthWrapper>
              } 
            />
            <Route path="/auth" element={<Auth />} />
            
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
          <Toaster />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
