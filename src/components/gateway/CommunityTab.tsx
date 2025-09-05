import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, Eye, Telescope, Compass } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function CommunityTab() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoinCommunity = async () => {
    setLoading(true);
    setError('');

    try {
      // Get current user session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Please sign in first to join the community');
      }

      // Update user profile to guest role (community member)
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          role: 'guest',
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        throw updateError;
      }

      toast.success('Welcome to the PieFi community! Explore and discover amazing projects.');
      
      // Redirect to dashboard
      navigate('/');
      
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const communityFeatures = [
    { icon: Eye, title: 'Discover Projects', description: 'Explore public teams and their innovations' },
    { icon: Telescope, title: 'Learn & Observe', description: 'See how successful teams operate' },
    { icon: Compass, title: 'Find Inspiration', description: 'Get ideas for your future projects' }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Globe className="mx-auto h-16 w-16 text-primary mb-4" />
        <h2 className="text-2xl font-bold mb-2">Join the Community</h2>
        <p className="text-muted-foreground">
          Explore the PieFi ecosystem, discover projects, and get inspired by what others are building
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {communityFeatures.map(({ icon: Icon, title, description }) => (
          <div key={title} className="p-4 border border-border rounded-lg bg-background/50">
            <Icon className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>

      <div className="p-6 bg-gradient-to-r from-primary/10 to-primary-glow/10 rounded-lg border border-primary/20">
        <h3 className="text-lg font-semibold mb-3">🌟 What you'll get access to:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Public Teams</Badge>
            <span className="text-sm">View team profiles and projects</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Project Updates</Badge>
            <span className="text-sm">Follow progress and milestones</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Community Insights</Badge>
            <span className="text-sm">Learn from successful patterns</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Future Opportunities</Badge>
            <span className="text-sm">Upgrade to builder or mentor anytime</span>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleJoinCommunity} className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Joining Community...
          </>
        ) : (
          <>
            <Globe className="mr-2 h-4 w-4" />
            Join as Community Member
          </>
        )}
      </Button>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-semibold mb-2">💡 Ready to do more?</h3>
        <p className="text-sm text-muted-foreground mb-3">
          You can always upgrade your role later by returning to this Gateway Hub:
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Create your own team</Badge>
          <Badge variant="outline">Join an existing team</Badge>
          <Badge variant="outline">Become a mentor</Badge>
        </div>
      </div>
    </div>
  );
}