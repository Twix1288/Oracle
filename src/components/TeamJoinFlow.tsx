import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, Key, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TeamJoinFlowProps {
  onComplete: () => void;
}

export const TeamJoinFlow = ({ onComplete }: TeamJoinFlowProps) => {
  const { joinTeamWithCode } = useAuth();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await joinTeamWithCode(accessCode.trim());
      
      if (result.success) {
        toast.success(`Welcome to ${result.team_name}!`);
        onComplete();
      } else {
        setError(result.error || 'Failed to join team');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-background/95 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Join Your Team</span>
          </div>
          <CardTitle className="text-2xl">Enter Team Access Code</CardTitle>
          <p className="text-muted-foreground">
            Enter the access code provided by your team leader to join your team
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleJoinTeam} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessCode">Access Code</Label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="accessCode"
                  type="text"
                  placeholder="Enter your team access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="pl-10 text-center font-mono"
                  required
                />
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full" disabled={loading || !accessCode.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining team...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Join Team
                </>
              )}
            </Button>
            
            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={onComplete}
                className="text-sm text-muted-foreground"
              >
                Skip for now (join team later)
              </Button>
            </div>
          </form>
          
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Don't have an access code?</h4>
            <p className="text-sm text-muted-foreground">
              Contact your team leader or mentor to get your team access code. 
              You can also join a team later from your profile settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};