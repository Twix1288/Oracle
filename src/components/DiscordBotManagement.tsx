import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Bot, Server, MessageSquare, Users, Activity } from "lucide-react";
import { toast } from "sonner";

export const DiscordBotManagement = () => {
  const [guildName, setGuildName] = useState("");
  const [guildId, setGuildId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  
  const queryClient = useQueryClient();

  // Fetch Discord guilds
  const { data: guilds, isLoading: guildsLoading } = useQuery({
    queryKey: ["discord-guilds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discord_guilds")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch bot command logs
  const { data: commandLogs } = useQuery({
    queryKey: ["bot-command-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_commands_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  // Add Discord guild mutation
  const addGuildMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("discord_guilds")
        .insert({
          guild_id: guildId,
          guild_name: guildName,
          webhook_url: webhookUrl || null,
          is_active: true
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Discord server added successfully");
      setGuildName("");
      setGuildId("");
      setWebhookUrl("");
      queryClient.invalidateQueries({ queryKey: ["discord-guilds"] });
    },
    onError: (error) => {
      toast.error("Failed to add Discord server: " + error.message);
    }
  });

  // Toggle guild status mutation
  const toggleGuildMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from("discord_guilds")
        .update({ is_active: !isActive })
        .eq("id", id);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Guild status updated");
      queryClient.invalidateQueries({ queryKey: ["discord-guilds"] });
    }
  });

  const handleAddGuild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildName || !guildId) {
      toast.error("Guild name and ID are required");
      return;
    }
    addGuildMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Bot Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Discord Bot Setup
          </CardTitle>
          <CardDescription>
            Connect your Discord server to enable bot commands and integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium">Bot Commands Available:</h4>
            <ul className="text-sm space-y-1 ml-4">
              <li>• <code>/profile</code> - View user profile information</li>
              <li>• <code>/teams</code> - List all active teams</li>
              <li>• <code>/update [message]</code> - Submit progress updates</li>
              <li>• <code>/oracle [question]</code> - Ask the Oracle for guidance</li>
              <li>• <code>/help</code> - Show available commands</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Discord Bot Webhook URL:</h4>
            <code className="text-sm bg-background p-2 rounded border block">
              https://dijskfbokusyxkcfwkrc.supabase.co/functions/v1/discord-bot
            </code>
            <p className="text-sm text-muted-foreground mt-2">
              Use this URL when setting up slash commands in the Discord Developer Portal
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add New Guild */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Add Discord Server
          </CardTitle>
          <CardDescription>
            Register a new Discord server for bot integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddGuild} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guildName">Server Name</Label>
                <Input
                  id="guildName"
                  value={guildName}
                  onChange={(e) => setGuildName(e.target.value)}
                  placeholder="My Discord Server"
                  required
                />
              </div>
              <div>
                <Label htmlFor="guildId">Server ID</Label>
                <Input
                  id="guildId"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  placeholder="123456789012345678"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
              <Input
                id="webhookUrl"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
              />
            </div>
            
            <Button type="submit" disabled={addGuildMutation.isPending}>
              {addGuildMutation.isPending ? "Adding..." : "Add Server"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Registered Guilds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registered Servers
          </CardTitle>
          <CardDescription>
            Manage your connected Discord servers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {guildsLoading ? (
            <div>Loading guilds...</div>
          ) : guilds && guilds.length > 0 ? (
            <div className="space-y-3">
              {guilds.map((guild) => (
                <div key={guild.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{guild.guild_name}</h4>
                      <Badge variant={guild.is_active ? "default" : "secondary"}>
                        {guild.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">ID: {guild.guild_id}</p>
                    {guild.webhook_url && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Webhook configured
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleGuildMutation.mutate({
                      id: guild.id,
                      isActive: guild.is_active
                    })}
                  >
                    {guild.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No Discord servers registered yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Bot Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Bot Activity
          </CardTitle>
          <CardDescription>
            Latest bot commands and interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commandLogs && commandLogs.length > 0 ? (
            <div className="space-y-2">
              {commandLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-mono text-sm">/{log.command_name}</span>
                    <Badge variant={log.success ? "default" : "destructive"}>
                      {log.success ? "Success" : "Error"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {log.response_time_ms}ms • {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No bot activity yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};