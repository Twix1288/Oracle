import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, UserCheck, Shield, Lightbulb, Users, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/oracle";

const roleOptions = {
  builder: {
    icon: Lightbulb,
    label: "Builder",
    description: "Join a team and build amazing products",
    color: "from-blue-500/20 to-blue-600/20 border-blue-500/30",
    tagColor: "bg-blue-500/10 text-blue-700 border-blue-200",
    requiresTeam: true,
    requiresAccessCode: true
  },
  mentor: {
    icon: UserCheck,
    label: "Mentor", 
    description: "Guide and support teams throughout their journey",
    color: "from-green-500/20 to-green-600/20 border-green-500/30",
    tagColor: "bg-green-500/10 text-green-700 border-green-200",
    requiresTeam: false,
    requiresAccessCode: true
  },
  lead: {
    icon: Shield,
    label: "Lead",
    description: "Manage the incubator program and oversee all operations",
    color: "from-purple-500/20 to-purple-600/20 border-purple-500/30", 
    tagColor: "bg-purple-500/10 text-purple-700 border-purple-200",
    requiresTeam: false,
    requiresAccessCode: true
  },
  guest: {
    icon: Users,
    label: "Guest",
    description: "Explore publicly available content and resources",
    color: "from-gray-500/20 to-gray-600/20 border-gray-500/30",
    tagColor: "bg-gray-500/10 text-gray-700 border-gray-200", 
    requiresTeam: false,
    requiresAccessCode: false
  }
};

interface RoleAssignmentProps {
  onRoleAssigned: () => void;
}

export const RoleAssignment = ({ onRoleAssigned }: RoleAssignmentProps) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [builderName, setBuilderName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { user, updateProfile } = useAuth();

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    const roleConfig = roleOptions[role as keyof typeof roleOptions];
    
    if (role === 'guest') {
      // Assign guest role immediately
      handleGuestAssignment();
    } else if (roleConfig?.requiresAccessCode) {
      setShowAccessCode(true);
    }
  };

  const handleGuestAssignment = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      const { error } = await updateProfile({
        role: 'guest',
        onboarding_completed: true
      });

      if (error) throw error;

      toast({
        title: "Welcome!",
        description: "You now have guest access to explore PieFi."
      });

      onRoleAssigned();
    } catch (error: any) {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign role. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccessCodeSubmit = async () => {
    if (!user || !selectedRole || !accessCode.trim()) return;

    setIsProcessing(true);
    try {
      // Use the new access code function
      const { data, error } = await supabase.rpc('use_access_code', {
        p_user_id: user.id,
        p_code: accessCode.trim(),
        p_builder_name: selectedRole === 'builder' ? builderName.trim() : null
      });

      if (error) throw error;
      
      // Type the response data properly
      const responseData = data as any;
      if (!responseData || typeof responseData !== 'object' || !responseData.success) {
        const errorMessage = responseData && typeof responseData === 'object' && responseData.error 
          ? responseData.error 
          : 'Invalid or expired access code';
        throw new Error(errorMessage);
      }

      const roleInfo = roleOptions[selectedRole as keyof typeof roleOptions];
      toast({
        title: "Role Assigned!",
        description: `Welcome! You are now a ${roleInfo?.label}.`
      });

      onRoleAssigned();
    } catch (error: any) {
      toast({
        title: "Access Code Invalid", 
        description: error.message || "Please check your access code and try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetSelection = () => {
    setSelectedRole(null);
    setShowAccessCode(false);
    setAccessCode("");
    setBuilderName("");
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-cosmic p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <div className="p-4 rounded-full bg-primary/20 w-fit mx-auto mb-4">
            <UserCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-glow mb-2">Welcome to PieFi!</h1>
          <p className="text-muted-foreground text-lg">
            Choose your role to get started on your journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(roleOptions).map(([role, config]) => {
            const IconComponent = config.icon;
            return (
              <Card
                key={role}
                className={`glow-border bg-gradient-to-br ${config.color} backdrop-blur hover:bg-opacity-80 transition-all duration-300 cursor-pointer`}
                onClick={() => handleRoleSelect(role as UserRole)}
              >
                <CardHeader className="text-center">
                  <div className="p-3 rounded-full bg-primary/20 w-fit mx-auto mb-2">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{config.label}</CardTitle>
                  <CardDescription className="text-base">
                    {config.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="space-y-3">
                    <Badge className={config.tagColor}>
                      {config.requiresAccessCode ? "Access Code Required" : "Open Access"}
                    </Badge>
                    
                    <Button className="w-full ufo-gradient">
                      Select {config.label}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Access Code Dialog */}
        <Dialog open={showAccessCode} onOpenChange={(open) => {
          if (!open) resetSelection();
          setShowAccessCode(open);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Enter Access Code
              </DialogTitle>
              <DialogDescription>
                {selectedRole && roleOptions[selectedRole as keyof typeof roleOptions] && (
                  <>
                    Please enter your access code to continue as{" "}
                    <strong>{roleOptions[selectedRole as keyof typeof roleOptions]?.label}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedRole === 'builder' && (
                <div>
                  <Label htmlFor="builder-name" className="text-sm font-medium">
                    Your Name *
                  </Label>
                  <Input
                    id="builder-name"
                    value={builderName}
                    onChange={(e) => setBuilderName(e.target.value)}
                    placeholder="Enter your full name"
                    className="bg-card/50"
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="access-code" className="text-sm font-medium">
                  Access Code *
                </Label>
                <Input
                  id="access-code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter your access code"
                  className="bg-card/50"
                />
              </div>

              <div className="bg-primary/5 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Access codes are provided by team leads or administrators. 
                  Contact them if you need assistance.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={resetSelection}
                className="flex-1"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAccessCodeSubmit}
                className="flex-1 ufo-gradient"
                disabled={
                  isProcessing || 
                  !accessCode.trim() || 
                  (selectedRole === 'builder' && !builderName.trim())
                }
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Need help choosing? Contact the program administrators for guidance on the best role for your involvement.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};