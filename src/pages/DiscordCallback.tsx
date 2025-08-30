import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const DiscordCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Discord authorization...');

  useEffect(() => {
    const handleDiscordCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Discord authorization failed: ${error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received from Discord');
          return;
        }

        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setStatus('error');
          setMessage('You must be logged in to link your Discord account');
          return;
        }

        // Exchange code for Discord user info
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: '1234567890123456789', // Replace with actual Discord Client ID
            client_secret: 'YOUR_DISCORD_CLIENT_SECRET', // This should be in edge function
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: `${window.location.origin}/auth/discord/callback`,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error('Failed to exchange code for token');
        }

        const tokenData = await tokenResponse.json();
        
        // Get Discord user info
        const userResponse = await fetch('https://discord.com/api/users/@me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error('Failed to get Discord user info');
        }

        const discordUser = await userResponse.json();

        // Update user profile with Discord info
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            discord_id: discordUser.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }

        setStatus('success');
        setMessage(`Successfully linked Discord account @${discordUser.username}!`);
        
        toast({
          title: "Discord Account Linked",
          description: `Your Discord account @${discordUser.username} has been successfully linked!`,
        });

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/');
        }, 3000);

      } catch (error) {
        console.error('Discord callback error:', error);
        setStatus('error');
        setMessage(`Failed to link Discord account: ${error.message}`);
        
        toast({
          title: "Link Failed",
          description: "Failed to link your Discord account. Please try again.",
          variant: "destructive",
        });
      }
    };

    handleDiscordCallback();
  }, [searchParams, navigate, toast]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'border-primary/30 bg-primary/5';
      case 'success':
        return 'border-green-500/30 bg-green-500/5';
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md glow-border ${getStatusColor()}`}>
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            {getStatusIcon()}
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">
              {status === 'loading' && 'Linking Discord Account...'}
              {status === 'success' && 'Account Linked Successfully!'}
              {status === 'error' && 'Linking Failed'}
            </h1>
            
            <p className="text-muted-foreground leading-relaxed">
              {message}
            </p>
          </div>

          {status === 'success' && (
            <div className="text-sm text-muted-foreground">
              <p>You'll be redirected to the dashboard in a few seconds...</p>
            </div>
          )}

          {(status === 'error' || status === 'success') && (
            <Button 
              onClick={() => navigate('/')}
              className="ufo-gradient"
            >
              {status === 'error' ? 'Go Back to Dashboard' : 'Go to Dashboard Now'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};