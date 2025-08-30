import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  MessageSquare, Activity, Users, Settings, RefreshCw, 
  CheckCircle, XCircle, Clock, ExternalLink, Copy, 
  Zap, Globe, LinkIcon
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BotStatus {
  online: boolean;
  lastPing: string;
  commandsExecuted: number;
  linkedAccounts: number;
  errors: number;
}

interface BotCommand {
  id: string;
  command_name: string;
  user_id: string;
  guild_id: string;
  success: boolean;
  error_message?: string;
  created_at: string;
  response_time_ms?: number;
}

interface LinkedAccount {
  id: string;
  full_name: string;
  role: string;
  discord_id: string;
  linked_at: string;
}

export const DiscordBotManagement = () => {
  const [botStatus, setBotStatus] = useState<BotStatus>({
    online: false,
    lastPing: '',
    commandsExecuted: 0,
    linkedAccounts: 0,
    errors: 0
  });
  const [recentCommands, setRecentCommands] = useState<BotCommand[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("status");
  
  const { toast } = useToast();

  const DISCORD_BOT_ENDPOINT = 'https://dijskfbokusyxkcfwkrc.supabase.co/functions/v1/discord-bot';

  useEffect(() => {
    fetchBotData();
    const interval = setInterval(fetchBotData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchBotData = async () => {
    try {
      // Simulate bot status since we don't have the full Discord integration yet
      setBotStatus({
        online: true,
        lastPing: new Date().toISOString(),
        commandsExecuted: 42,
        linkedAccounts: 3,
        errors: 0
      });

      // Mock recent commands for display
      const mockCommands: BotCommand[] = [
        {
          id: '1',
          command_name: 'resources',
          user_id: 'user123',
          guild_id: 'guild456',
          success: true,
          created_at: new Date().toISOString(),
          response_time_ms: 250
        },
        {
          id: '2',
          command_name: 'help',
          user_id: 'user789',
          guild_id: 'guild456',
          success: true,
          created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          response_time_ms: 150
        }
      ];
      
      setRecentCommands(mockCommands);

      // Mock linked accounts
      const mockLinkedAccounts: LinkedAccount[] = [
        {
          id: '1',
          full_name: 'John Doe',
          role: 'builder',
          discord_id: '123456789',
          linked_at: new Date().toISOString()
        },
        {
          id: '2',
          full_name: 'Jane Smith',
          role: 'mentor',
          discord_id: '987654321',
          linked_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setLinkedAccounts(mockLinkedAccounts);

    } catch (error) {
      console.error('Failed to fetch bot data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyEndpoint = () => {
    navigator.clipboard.writeText(DISCORD_BOT_ENDPOINT);
    toast({
      title: "Copied!",
      description: "Discord bot endpoint URL copied to clipboard"
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getCommandStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'lead': return 'text-purple-400';
      case 'mentor': return 'text-green-400';
      case 'builder': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p>Loading Discord bot status...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/20 ufo-pulse">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-glow">Discord Bot Management</h2>
          <p className="text-muted-foreground">Monitor and manage the PieFi Discord Oracle integration</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {botStatus.online ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-400/30">
              <Activity className="h-3 w-3 mr-1" />
              Online
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-400/30">
              <XCircle className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur border-primary/20">
          <TabsTrigger value="status" className="data-[state=active]:bg-primary/20">
            <Activity className="h-4 w-4 mr-2" />
            Status
          </TabsTrigger>
          <TabsTrigger value="commands" className="data-[state=active]:bg-primary/20">
            <Zap className="h-4 w-4 mr-2" />
            Command Logs
          </TabsTrigger>
          <TabsTrigger value="accounts" className="data-[state=active]:bg-primary/20">
            <Users className="h-4 w-4 mr-2" />
            Linked Accounts
          </TabsTrigger>
          <TabsTrigger value="setup" className="data-[state=active]:bg-primary/20">
            <Settings className="h-4 w-4 mr-2" />
            Setup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bot Status</p>
                    <p className="text-2xl font-bold">
                      {botStatus.online ? (
                        <span className="text-green-400">Online</span>
                      ) : (
                        <span className="text-red-400">Offline</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Commands Executed</p>
                    <p className="text-2xl font-bold">{botStatus.commandsExecuted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Linked Accounts</p>
                    <p className="text-2xl font-bold">{botStatus.linkedAccounts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Errors</p>
                    <p className="text-2xl font-bold">{botStatus.errors}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Bot Health & Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <span className="font-medium">Last Activity</span>
                  </div>
                  <span className="text-muted-foreground">
                    {botStatus.lastPing ? formatTimestamp(botStatus.lastPing) : 'Never'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-purple-400" />
                    <span className="font-medium">Cross-Platform Sync</span>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-400/30">
                    Active
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                  <div className="flex items-center gap-3">
                    <LinkIcon className="h-5 w-5 text-orange-400" />
                    <span className="font-medium">Account Linking</span>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-400/30">
                    Enabled
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commands">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Command Logs</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBotData}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Command</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Guild</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCommands.map((command) => (
                      <TableRow key={command.id}>
                        <TableCell>
                          {getCommandStatusIcon(command.success)}
                        </TableCell>
                        <TableCell className="font-mono">
                          /{command.command_name}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {command.user_id?.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {command.guild_id?.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {command.response_time_ms ? `${command.response_time_ms}ms` : '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatTimestamp(command.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Linked Discord Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Discord ID</TableHead>
                      <TableHead>Linked Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          {account.full_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getRoleColor(account.role)}>
                            {account.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {account.discord_id}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatTimestamp(account.linked_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup">
          <div className="space-y-6">
            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Discord Bot Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Interaction Endpoint URL</h4>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 rounded bg-muted/50 text-xs font-mono">
                      {DISCORD_BOT_ENDPOINT}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyEndpoint}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use this URL as the "Interactions Endpoint URL" in your Discord Developer Portal.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-background/30 border border-blue-500/20">
                  <h4 className="font-medium text-blue-400 mb-2">Setup Instructions</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Go to Discord Developer Portal and select your bot application</li>
                    <li>Navigate to "General Information" section</li>
                    <li>Set the "Interactions Endpoint URL" to the URL above</li>
                    <li>Save the changes and test with <code>/help</code> command</li>
                    <li>Invite the bot to your Discord server with proper permissions</li>
                  </ol>
                </div>

                <div className="p-4 rounded-lg bg-background/30 border border-green-500/20">
                  <h4 className="font-medium text-green-400 mb-2">Available Commands</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><code>/help</code> - Show all commands</div>
                    <div><code>/resources [topic]</code> - Find resources</div>
                    <div><code>/connect [challenge]</code> - Find experts</div>
                    <div><code>/find [search]</code> - Search members</div>
                    <div><code>/message [user] [content]</code> - Send message</div>
                    <div><code>/update [progress]</code> - Log progress</div>
                    <div><code>/link</code> - Link Discord account</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://discord.com/developers/applications', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Discord Developer Portal
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(DISCORD_BOT_ENDPOINT, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Test Endpoint
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glow-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Cross-Platform Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-background/30">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-400" />
                      Message Sync
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Messages sent via Discord bot appear in website dashboard and vice versa.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-background/30">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      Command Mirror
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      All Oracle commands work identically on Discord and website.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-background/30">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-400" />
                      Profile Sync
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Profile updates automatically sync across both platforms.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-background/30">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-purple-400" />
                      Real Resources
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Both platforms fetch real YouTube videos, articles, and connections.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};