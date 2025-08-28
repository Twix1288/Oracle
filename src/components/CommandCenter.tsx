import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Send, Command, User, MessageSquare, HelpCircle, FileText, TrendingUp, Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CommandCenterProps {
  onCommand?: (command: string, args: string[]) => void;
}

const COMMANDS = [
  { 
    command: "/help", 
    description: "Show available commands", 
    icon: HelpCircle,
    usage: "/help [command]" 
  },
  { 
    command: "/resources", 
    description: "Get stage-specific resources", 
    icon: FileText,
    usage: "/resources [topic]" 
  },
  { 
    command: "/update", 
    description: "Post team update", 
    icon: TrendingUp,
    usage: "/update <message>" 
  },
  { 
    command: "/message", 
    description: "Send message to role/user", 
    icon: MessageSquare,
    usage: "/message @role <message>" 
  },
  { 
    command: "/mention", 
    description: "Mention a user", 
    icon: User,
    usage: "/mention @username" 
  },
  { 
    command: "/notify", 
    description: "Send notification", 
    icon: Bell,
    usage: "/notify @role <message>" 
  }
];

export const CommandCenter = ({ onCommand }: CommandCenterProps) => {
  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const { profile, user } = useAuth();

  const parseCommand = (input: string) => {
    const parts = input.trim().split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    return { command, args };
  };

  const sendNotification = async (targetRole: string, message: string, mentionedUser?: string) => {
    try {
      await supabase.from('messages').insert({
        sender_id: user?.id,
        sender_role: profile?.role as any,
        receiver_role: targetRole as any,
        receiver_id: mentionedUser || null,
        content: mentionedUser 
          ? `You were mentioned: ${message}` 
          : `System notification: ${message}`,
        team_id: profile?.team_id
      });
      
      toast.success(`Notification sent to ${targetRole}s`);
    } catch (error) {
      toast.error('Failed to send notification');
    }
  };

  const executeCommand = async (input: string) => {
    const { command, args } = parseCommand(input);
    
    setCommandHistory(prev => [...prev, input]);
    
    switch (command) {
      case '/help':
        setShowHelp(true);
        toast.info("Available commands displayed below");
        break;
        
      case '/resources':
        const topic = args.join(' ') || 'general';
        toast.info(`Fetching resources for: ${topic}`);
        if (onCommand) onCommand(command, [topic]);
        break;
        
      case '/update':
        if (args.length === 0) {
          toast.error("Usage: /update <your team update message>");
          return;
        }
        const updateContent = args.join(' ');
        try {
          await supabase.from('updates').insert({
            team_id: profile?.team_id!,
            type: 'daily' as any,
            content: updateContent,
            created_by: user?.id
          });
          toast.success("Team update posted!");
        } catch (error) {
          toast.error("Failed to post update");
        }
        break;
        
      case '/message':
        if (args.length < 2 || !args[0].startsWith('@')) {
          toast.error("Usage: /message @role <message>");
          return;
        }
        const targetRole = args[0].substring(1);
        const messageContent = args.slice(1).join(' ');
        await sendNotification(targetRole, messageContent);
        break;
        
      case '/mention':
        if (args.length < 1 || !args[0].startsWith('@')) {
          toast.error("Usage: /mention @username");
          return;
        }
        const mentionedUser = args[0].substring(1);
        await sendNotification('all', `You were mentioned by ${profile?.full_name || 'someone'}`, mentionedUser);
        break;
        
      case '/notify':
        if (args.length < 2 || !args[0].startsWith('@')) {
          toast.error("Usage: /notify @role <message>");
          return;
        }
        const notifyRole = args[0].substring(1);
        const notifyContent = args.slice(1).join(' ');
        await sendNotification(notifyRole, notifyContent);
        break;
        
      default:
        toast.error(`Unknown command: ${command}. Type /help for available commands.`);
    }
    
    setCommandInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    executeCommand(commandInput);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Terminal className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Command Center</h2>
        <Badge variant="outline" className="text-primary">
          Interactive
        </Badge>
      </div>

      {/* Command Input */}
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <Terminal className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary/60" />
              <Input
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Type a command... (e.g., /help, /update, /message @mentors)"
                className="pl-10 font-mono bg-background/50 border-primary/20 focus:border-primary/50"
              />
            </div>
            <Button type="submit" disabled={!commandInput.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Execute
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Available Commands */}
      {showHelp && (
        <Card className="bg-card/50 backdrop-blur border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Command className="h-5 w-5 text-primary" />
              Available Commands
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {COMMANDS.map((cmd) => (
                <div key={cmd.command} className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded bg-primary/20">
                      <cmd.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-medium text-primary">
                        {cmd.command}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {cmd.description}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground/80 mt-1">
                        Usage: {cmd.usage}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Command History */}
      {commandHistory.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="h-4 w-4 text-primary" />
              Command History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {commandHistory.slice(-10).reverse().map((cmd, index) => (
                  <div key={index} className="text-xs font-mono text-muted-foreground">
                    <span className="text-primary">$</span> {cmd}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-card/30 backdrop-blur border-primary/10">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandInput("/help")}
              className="text-xs"
            >
              Show Help
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandInput("/resources ")}
              className="text-xs"
            >
              Get Resources
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandInput("/update ")}
              className="text-xs"
            >
              Post Update
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandInput("/message @mentors ")}
              className="text-xs"
            >
              Message Mentors
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};