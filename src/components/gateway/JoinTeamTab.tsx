import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function JoinTeamTab() {
  const [accessCode, setAccessCode] = useState('');
  const [builderName, setBuilderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAccessCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get current user session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Please sign in first before using your access code');
      }

      // Use the access code via the RPC function
      const { data, error } = await supabase
        .rpc('use_access_code', {
          p_user_id: user.id,
          p_code: accessCode.trim(),
          p_builder_name: builderName.trim() || null
        });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; error?: string; role?: string; team_name?: string };

      if (!result.success) {
        throw new Error(result.error || 'Failed to use access code');
      }

      toast.success(`Welcome ${builderName || 'to PieFi'}! Joined ${result.team_name} as ${result.role}.`);
      
      // Redirect to dashboard
      navigate('/');
      
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Users className="mx-auto h-16 w-16 text-primary mb-4" />
        <h2 className="text-2xl font-bold mb-2">Join an Existing Team</h2>
        <p className="text-muted-foreground">
          Enter the access code provided by your team creator to join their project
        </p>
      </div>

      <form onSubmit={handleAccessCodeLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="access-code">Team Access Code</Label>
          <div className="relative">
            <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="access-code"
              type="text"
              placeholder="Enter your access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="pl-10 font-mono"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="builder-name">Your Display Name (Optional)</Label>
          <Input
            id="builder-name"
            type="text"
            placeholder="How should your team know you?"
            value={builderName}
            onChange={(e) => setBuilderName(e.target.value)}
          />
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Button type="submit" className="w-full" disabled={loading || !accessCode}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Joining Team...
            </>
          ) : (
            <>
              <Users className="mr-2 h-4 w-4" />
              Join Team
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-semibold mb-2">💡 Don't have a code?</h3>
        <p className="text-sm text-muted-foreground">
          Ask your team creator to generate an access code for you, or switch to the "Create Team" tab to start your own project.
        </p>
      </div>
    </div>
  );
}