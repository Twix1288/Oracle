import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DiscordOAuthSetupProps {
  userRole: string;
}

export const DiscordOAuthSetup = ({ userRole }: DiscordOAuthSetupProps) => {
  const [linkCode, setLinkCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [linkedAccount, setLinkedAccount] = useState<any>(null);
  const { toast } = useToast();

  // Discord OAuth URLs for development and production
  const DISCORD_OAUTH_CONFIG = {
    clientId: process.env.DISCORD_CLIENT_ID || '1234567890123456789', // Replace with actual Discord Client ID
    redirectUri: `${window.location.origin}/auth/discord/callback`,
    scope: 'identify',
    responseType: 'code'
  };

  const discordOAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_OAUTH_CONFIG.clientId}&redirect_uri=${encodeURIComponent(DISCORD_OAUTH_CONFIG.redirectUri)}&response_type=${DISCORD_OAUTH_CONFIG.responseType}&scope=${DISCORD_OAUTH_CONFIG.scope}`;

  const handleDirectLink = async () => {
    // For direct OAuth linking, redirect to Discord
    window.location.href = discordOAuthUrl;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "URL copied successfully",
    });
  };

  const handleLinkAccount = async () => {
    if (!linkCode.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid link code from Discord",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('link_discord_account', {
        p_link_code: linkCode.trim()
      });

      if (error) throw error;

      const result = data as any; // Type assertion for RPC return
      if (result.success) {
        setLinkedAccount(result);
        toast({
          title: "Account Linked",
          description: `Discord account @${result.discord_username} linked successfully!`,
        });
        setLinkCode("");
      } else {
        toast({
          title: "Link Failed",
          description: result.error || "Failed to link Discord account",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Link error:', error);
      toast({
        title: "Link Error",
        description: "Failed to link Discord account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/20">
          <ExternalLink className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Discord Integration</h2>
          <p className="text-muted-foreground">Connect your Discord account with PieFi Oracle</p>
        </div>
      </div>

      <Tabs defaultValue="link" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur border-primary/20">
          <TabsTrigger value="link">Link Account</TabsTrigger>
          <TabsTrigger value="setup">OAuth Setup</TabsTrigger>
          <TabsTrigger value="howto">How It Works</TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="space-y-6">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Connect Your Discord Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {linkedAccount ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    ✅ Discord account @{linkedAccount.discord_username} is linked successfully!
                    You can now use Oracle commands in Discord and they'll sync with your PieFi account.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="link-code">Discord Link Code or Direct OAuth</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Enter a link code from Discord bot, or use direct OAuth below.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        id="link-code"
                        value={linkCode}
                        onChange={(e) => setLinkCode(e.target.value)}
                        placeholder="Enter Discord link code (optional)..."
                        className="bg-background/50 border-primary/20"
                      />
                      <Button 
                        onClick={handleLinkAccount}
                        disabled={isLoading || !linkCode.trim()}
                        variant="outline"
                      >
                        {isLoading ? "Linking..." : "Link with Code"}
                      </Button>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleDirectLink}
                    className="w-full ufo-gradient"
                    disabled={isLoading}
                  >
                    Link with Discord OAuth
                  </Button>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Step-by-step:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                        <li>Go to Discord and run the command: <code className="bg-muted px-1 rounded">/link</code></li>
                        <li>Copy the link code provided by the bot</li>
                        <li>Paste it in the field above and click "Link Account"</li>
                        <li>Your accounts will be connected!</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Discord Developer Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>For Lead/Admin:</strong> Configure these URLs in your Discord Developer Portal OAuth2 settings.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div>
                  <Label>Redirect URI</Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      value={DISCORD_OAUTH_CONFIG.redirectUri}
                      readOnly 
                      className="bg-background/50 border-primary/20"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(DISCORD_OAUTH_CONFIG.redirectUri)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add this exact URL to OAuth2 → Redirects in Discord Developer Portal
                  </p>
                </div>

                <div>
                  <Label>OAuth2 URL (for testing)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      value={discordOAuthUrl}
                      readOnly 
                      className="bg-background/50 border-primary/20 text-xs"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(discordOAuthUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Required Scopes</Label>
                  <div className="flex gap-2 mt-1">
                    <Badge>identify</Badge>
                    <Badge variant="outline">guilds (optional)</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="howto" className="space-y-6">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>How Discord Integration Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-semibold mb-2">🔗 Account Linking</h4>
                  <p className="text-sm text-muted-foreground">
                    Connect your Discord and PieFi accounts so Oracle commands work seamlessly across both platforms.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <h4 className="font-semibold text-blue-400 mb-2">🤖 Unified Oracle</h4>
                  <p className="text-sm text-muted-foreground">
                    Use the same Oracle commands in Discord that you use on the website. 
                    /resources, /connect, /find, and more work identically.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                  <h4 className="font-semibold text-green-400 mb-2">💬 Cross-Platform Messages</h4>
                  <p className="text-sm text-muted-foreground">
                    Messages sent through Oracle appear in both Discord DMs and your PieFi Messages tab.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <h4 className="font-semibold text-purple-400 mb-2">📊 Synchronized Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Profile updates, progress tracking, and team activities sync instantly between platforms.
                  </p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Privacy:</strong> Only your Discord user ID and username are stored. 
                  No message content or other Discord data is accessed.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};