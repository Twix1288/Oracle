import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Users, Rocket } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AccessCodeSuccessProps {
  accessCode: string;
  teamName?: string;
  role: string;
  isProjectLead?: boolean;
  onContinue: () => void;
}

export const AccessCodeSuccess = ({ 
  accessCode, 
  teamName, 
  role, 
  isProjectLead,
  onContinue 
}: AccessCodeSuccessProps) => {
  const { toast } = useToast();

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(accessCode);
      toast({
        title: "Copied!",
        description: "Access code copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy the code manually",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="glow-border bg-card/50 backdrop-blur">
      <CardContent className="p-8 text-center space-y-6">
        <div className="space-y-4">
          <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
            {isProjectLead ? (
              <Rocket className="h-12 w-12 text-primary" />
            ) : (
              <Users className="h-12 w-12 text-primary" />
            )}
          </div>
          
          <h1 className="text-4xl font-bold text-glow">
            {isProjectLead ? "Project Created!" : "Welcome Aboard!"}
          </h1>
          
          <p className="text-lg text-muted-foreground">
            {isProjectLead 
              ? `Your project${teamName ? ` "${teamName}"` : ''} is now live`
              : `You've successfully joined${teamName ? ` "${teamName}"` : ' the project'}`
            }
          </p>
        </div>

        {isProjectLead && (
          <div className="bg-background/50 p-6 rounded-lg border border-primary/20 space-y-4">
            <h3 className="font-semibold text-primary">Your Team Access Code</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-2xl font-mono bg-card p-3 rounded border font-bold tracking-wider">
                {accessCode}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this code with team members to invite them to your project
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {isProjectLead 
              ? "Ready to start building? Your project dashboard awaits!"
              : "Ready to collaborate? Your project dashboard is ready!"
            }
          </div>
          
          <Button 
            onClick={onContinue}
            className="w-full ufo-gradient py-3 text-lg font-semibold"
          >
            Continue to Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};