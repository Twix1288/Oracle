import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Users, UserCheck, Shield, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AccessGateProps {
  onRoleAssigned: () => void;
}

export const AccessGate = ({ onRoleAssigned }: AccessGateProps) => {
  const [accessCode, setAccessCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { user, updateProfile } = useAuth();

  const masterCodes = [
    {
      code: 'BUILD2024',
      role: 'builder',
      label: 'Builder',
      description: 'Team member building products',
      icon: Users,
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    {
      code: 'MENTOR2024',
      role: 'mentor',
      label: 'Mentor',
      description: 'Guide and advisor to teams',
      icon: UserCheck,
      color: 'bg-green-500/20 text-green-300 border-green-500/30'
    },
    {
      code: 'LEAD2024',
      role: 'lead',
      label: 'Lead',
      description: 'Program leader',
      icon: Shield,
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    },
    {
      code: 'GUEST2024',
      role: 'guest',
      label: 'Guest',
      description: 'Public visitor access',
      icon: User,
      color: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  ];

  const handleSubmitCode = async () => {
    if (!accessCode.trim() || !user) return;

    setIsValidating(true);
    try {
      // Use the use_access_code function
      const { data, error } = await supabase.rpc('use_access_code', {
        p_user_id: user.id,
        p_code: accessCode.trim().toUpperCase()
      });

      if (error) throw error;

      if (data && typeof data === 'object' && 'success' in data && (data as any).success) {
        toast.success(`Welcome! You are now assigned as ${(data as any).role}.`);
        onRoleAssigned();
      } else {
        toast.error((data as any)?.error || 'Invalid access code');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to validate access code');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCodeClick = (code: string) => {
    setAccessCode(code);
  };

  return (
    <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-background/95 backdrop-blur-sm glow-border">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-3 rounded-full bg-primary/20 ufo-pulse">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to PieFi Oracle</CardTitle>
          <p className="text-muted-foreground">
            Enter your access code to get started with your role
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Access Code Input */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="Enter your access code"
                className="font-mono text-center text-lg"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmitCode();
                  }
                }}
              />
              <Button 
                onClick={handleSubmitCode}
                disabled={!accessCode.trim() || isValidating}
                className="ufo-gradient px-6"
              >
                {isValidating ? 'Validating...' : 'Submit'}
              </Button>
            </div>
          </div>

          {/* Available Codes Display */}
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Available access codes:
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {masterCodes.map(({ code, role, label, description, icon: Icon, color }) => (
                <Card
                  key={code}
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    accessCode === code 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleCodeClick(code)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{label}</h4>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                    </div>
                    <div className="font-mono text-sm bg-background/50 p-2 rounded border text-center">
                      {code}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Information */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>How it works:</strong> Enter the access code provided by your program leader 
              to get your role and access to the appropriate dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};