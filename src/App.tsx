import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Gateway from '@/pages/Gateway';
import NotFound from '@/pages/NotFound';

import { DetailedOnboarding } from '@/components/DetailedOnboarding';
import { TeamJoinFlow } from '@/components/TeamJoinFlow';
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

  // Only show onboarding if user hasn't completed it AND is a guest (no assigned role)
  if (!profile?.onboarding_completed && profile?.role === 'guest') {
    return <DetailedOnboarding onComplete={() => {
      // Force refresh of auth state after onboarding completion
      // This will re-evaluate the profile and redirect appropriately
      setTimeout(() => {
        // The auth hook will automatically refetch the profile data
        // No need for full page reload
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
            <Route path="/gateway" element={<Gateway />} />
            
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
