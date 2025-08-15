import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/useAuth';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
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

  if (!profile?.onboarding_completed) {
    return <DetailedOnboarding onComplete={() => window.location.reload()} />;
  }

  // Optional team joining - skip if user doesn't want to join a team yet
  // if (!profile?.team_id) {
  //   return <TeamJoinFlow onComplete={() => window.location.reload()} />;
  // }

  return <>{children}</>;
}

function App() {
  return (
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
  );
}

export default App;
