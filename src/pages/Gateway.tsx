import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Gateway() {
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

      toast.success(`Welcome ${builderName || 'to PieFi'}! Access granted as ${result.role}.`);
      
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
    <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-cosmic-pattern opacity-20"></div>
      
      <Card className="w-full max-w-md relative z-10 bg-background/95 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              PieFi Gateway
            </span>
          </div>
          <CardTitle className="text-2xl font-bold">Access Code Login</CardTitle>
          <CardDescription>
            Enter your access code to join your team or role
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleAccessCodeLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="access-code">Access Code</Label>
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
              <Label htmlFor="builder-name">Your Name (Optional)</Label>
              <Input
                id="builder-name"
                type="text"
                placeholder="Enter your preferred name"
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
                  Verifying...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Use Access Code
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border">
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
          
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an access code? Complete onboarding first to receive one.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}