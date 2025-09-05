import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Sparkles, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AccessCodeDisplayProps {
  accessCode: string;
  role: string;
  teamName?: string;
  isProjectLead?: boolean;
  onContinue: () => void;
}

export const AccessCodeDisplay = ({ accessCode, role, teamName, isProjectLead, onContinue }: AccessCodeDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "✅ Copied!",
        description: "Access code copied to clipboard"
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the access code",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl glow-border bg-card/50 backdrop-blur">
        <CardContent className="p-8 text-center space-y-8">
          <div className="space-y-4">
            <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto ufo-pulse">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-glow">
              {isProjectLead ? "🚀 Project Created!" : "🎉 Welcome Aboard!"}
            </h1>
            <p className="text-xl text-muted-foreground">
              {isProjectLead 
                ? `Your project${teamName ? ` "${teamName}"` : ''} is now live and ready!`
                : `Welcome to the Innovation Hub! You're all set up and ready to go.`
              }
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Badge className="bg-primary/20 text-primary border-primary/30 font-medium text-lg px-4 py-2">
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Badge>
              {teamName && (
                <>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {teamName}
                  </Badge>
                </>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-semibold text-glow">
                {isProjectLead ? "Your Team Access Code" : "Your Access Code"}
              </h3>
              <p className="text-muted-foreground">
                {isProjectLead 
                  ? "Share this code with team members to invite them to your project"
                  : "Save this code - you'll need it to access your dashboard"
                }
              </p>
              
              <div className="relative">
                <div className="p-6 bg-background/80 rounded-lg border-2 border-primary/30 font-mono text-3xl font-bold text-primary tracking-widest select-all">
                  {accessCode}
                </div>
                <Button
                  onClick={copyToClipboard}
                  className="absolute -right-2 -top-2 ufo-gradient hover:opacity-90"
                  size="icon"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">What happens next:</p>
              <ul className="text-left space-y-1">
                <li>• Your profile has been created {teamName ? `and linked to "${teamName}"` : ''}</li>
                <li>• The Oracle has been personalized with your information</li>
                <li>• You'll have access to your {role}-specific dashboard</li>
                {isProjectLead && <li>• You can now invite team members using your access code</li>}
                {!isProjectLead && teamName && <li>• Your first team update has been logged</li>}
              </ul>
            </div>

            <Button 
              onClick={onContinue}
              className="w-full ufo-gradient hover:opacity-90 py-4 text-lg font-semibold"
              size="lg"
            >
              Continue to Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};