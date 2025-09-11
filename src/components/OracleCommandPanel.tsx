import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Terminal, 
  Sparkles, 
  Users, 
  HandHeart, 
  GraduationCap,
  MessageCircle,
  Activity,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface OracleCommand {
  command: string;
  description: string;
  icon: React.ReactNode;
  category: 'connection' | 'skill' | 'learning' | 'general';
}

const availableCommands: OracleCommand[] = [
  {
    command: '/view connections',
    description: 'Analyze your network and suggest new connections',
    icon: <Users className="h-4 w-4" />,
    category: 'connection'
  },
  {
    command: '/offer help',
    description: 'Find opportunities to help other builders',
    icon: <HandHeart className="h-4 w-4" />,
    category: 'skill'
  },
  {
    command: '/join workshop',
    description: 'Find workshops and learning opportunities',
    icon: <GraduationCap className="h-4 w-4" />,
    category: 'learning'
  },
  {
    command: '/suggest collaboration',
    description: 'Get AI-powered collaboration suggestions',
    icon: <MessageCircle className="h-4 w-4" />,
    category: 'connection'
  },
  {
    command: '/ask oracle',
    description: 'Ask Oracle any question for detailed insights',
    icon: <Sparkles className="h-4 w-4" />,
    category: 'general'
  }
];

interface OracleCommandPanelProps {
  onCommandExecute?: (command: string) => void;
  className?: string;
}

export function OracleCommandPanel({ onCommandExecute, className }: OracleCommandPanelProps) {
  const [selectedCommand, setSelectedCommand] = useState<string>('');
  const [commandInput, setCommandInput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const executeCommand = async (fullCommand: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to execute Oracle commands.",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);

    try {
      // Trigger the command through Super Oracle
      const response = await supabase.functions.invoke('super-oracle', {
        body: {
          query: fullCommand,
          type: 'command',
          role: 'builder',
          userId: user.id,
          context: {
            isCommand: true,
            commandType: fullCommand.split(' ')[0].substring(1),
            userProfile: user
          }
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Trigger learning loop for command analysis
      await supabase.functions.invoke('oracle-learning-loop', {
        body: {
          oracle_log_id: response.data?.oracle_log_id || '',
          feedback_data: { 
            command: fullCommand, 
            success: true,
            user_id: user.id
          },
          action: 'analyze_feedback'
        }
      });

      toast({
        title: "Command Executed",
        description: `Oracle command "${fullCommand}" executed successfully.`,
      });

      // Notify parent component
      onCommandExecute?.(fullCommand);
      
      // Clear input
      setCommandInput('');
      setSelectedCommand('');

    } catch (error) {
      console.error('Oracle command error:', error);
      toast({
        title: "Command Failed",
        description: `Failed to execute: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleQuickCommand = (command: string) => {
    setSelectedCommand(command);
    setCommandInput(command + ' ');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commandInput.trim()) {
      executeCommand(commandInput.trim());
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'connection': return 'bg-blue-500/10 text-blue-600';
      case 'skill': return 'bg-green-500/10 text-green-600';
      case 'learning': return 'bg-purple-500/10 text-purple-600';
      case 'general': return 'bg-orange-500/10 text-orange-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Oracle Command Panel
          <Badge variant="outline" className="ml-auto">
            <Activity className="mr-1 h-3 w-3" />
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Command Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Type an Oracle command..."
            className="flex-1 font-mono"
          />
          <Button 
            type="submit" 
            disabled={!commandInput.trim() || isExecuting}
            size="sm"
          >
            {isExecuting ? (
              <Activity className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Quick Commands */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Quick Commands</h4>
          <div className="grid gap-2">
            {availableCommands.map((cmd) => (
              <div
                key={cmd.command}
                className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleQuickCommand(cmd.command)}
              >
                <div className={`p-1 rounded ${getCategoryColor(cmd.category)}`}>
                  {cmd.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                      {cmd.command}
                    </code>
                    <Badge variant="outline" className="text-xs">
                      {cmd.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {cmd.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Command Help */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">Oracle Command System:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Commands trigger AI-powered backend analysis</li>
            <li>Learning feedback loop continuously improves suggestions</li>
            <li>All actions are logged and analyzed for patterns</li>
            <li>Results are integrated with your network and profile data</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}