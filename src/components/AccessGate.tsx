import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, User, Shield, Eye, Lock } from "lucide-react";
import type { UserRole } from "@/types/oracle";

interface AccessGateProps {
  onRoleSelected: (role: UserRole) => void;
}

const roleInfo = {
  builder: {
    label: "Builder",
    description: "Team member developing products",
    icon: Rocket,
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    needsCode: true
  },
  mentor: {
    label: "Mentor", 
    description: "Guide and advisor to teams",
    icon: User,
    color: "bg-green-500/20 text-green-300 border-green-500/30",
    needsCode: true
  },
  lead: {
    label: "Lead",
    description: "Incubator program leader", 
    icon: Shield,
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    needsCode: true
  },
  guest: {
    label: "Guest",
    description: "Public visitor access",
    icon: Eye,
    color: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    needsCode: false
  }
};

export const AccessGate = ({ onRoleSelected }: AccessGateProps) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [showCodeDialog, setShowCodeDialog] = useState(false);

  const handleRoleClick = (role: UserRole) => {
    setSelectedRole(role);
    setError("");
    
    if (roleInfo[role].needsCode) {
      setShowCodeDialog(true);
    } else {
      onRoleSelected(role);
    }
  };

  const handleCodeSubmit = async () => {
    if (!selectedRole || !code) return;

    try {
      // Validate access code with database
      const { data, error } = await supabase.rpc('validate_access_code', {
        p_code: code.trim(),
        p_role: selectedRole
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const accessCodeData = data[0];
        
        // If this is a team-specific code, assign user to that team
        if (accessCodeData.team_id) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              team_id: accessCodeData.team_id,
              role: selectedRole 
            })
            .eq('id', (await supabase.auth.getUser()).data.user?.id);
          
          if (profileError) {
            console.error('Profile update error:', profileError);
          }
        } else {
          // General access code - just update role  
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ role: selectedRole })
            .eq('id', (await supabase.auth.getUser()).data.user?.id);
          
          if (profileError) {
            console.error('Profile update error:', profileError);
          }
        }

        // Increment usage count
        const { data: codeData } = await supabase
          .from('access_codes')
          .select('current_uses')
          .eq('id', accessCodeData.id)
          .single();
        
        await supabase
          .from('access_codes')
          .update({ 
            current_uses: (codeData?.current_uses || 0) + 1 
          })
          .eq('id', accessCodeData.id);

        // Valid code found
        onRoleSelected(selectedRole);
        setShowCodeDialog(false);
        setCode("");
        setError("");
      } else {
        setError("Invalid access code. Please check your code and try again.");
      }
    } catch (error) {
      console.error('Access code validation error:', error);
      setError("Failed to validate access code. Please try again.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl ufo-pulse"></div>
            <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 p-8 rounded-full border border-primary/30">
              <Rocket className="h-16 w-16 text-primary" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent cosmic-text">
            Welcome to PieFi
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Your AI-powered incubator for revolutionary ideas. Join as a Builder, Mentor, Lead, or explore as a Guest.
          </p>
        </div>
        <div className="flex justify-center gap-4 flex-wrap">
          <Badge variant="outline" className="text-sm px-4 py-2">
            <User className="h-4 w-4 mr-2" />
            AI Oracle Guidance
          </Badge>
          <Badge variant="outline" className="text-sm px-4 py-2">
            <Shield className="h-4 w-4 mr-2" />
            Expert Mentorship
          </Badge>
          <Badge variant="outline" className="text-sm px-4 py-2">
            <Rocket className="h-4 w-4 mr-2" />
            Stage-Based Growth
          </Badge>
        </div>
      </div>

      {/* Role Selection Grid */}
      <div>
        <h2 className="text-2xl font-bold text-center mb-6 cosmic-text">Choose Your Role</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         {Object.entries(roleInfo).map(([role, info]) => (
           <Card 
             key={role}
             className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] glow-border group bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 ${
               selectedRole === role ? 'ring-2 ring-primary shadow-lg ufo-glow' : ''
             }`}
             onClick={() => handleRoleClick(role as UserRole)}
           >
             <CardHeader className="text-center pb-3">
               <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${info.color} group-hover:scale-110 transition-transform duration-300`}>
                 <info.icon className="w-6 h-6" />
               </div>
               <CardTitle className="text-lg font-semibold cosmic-text">{info.label}</CardTitle>
               <CardDescription className="text-sm text-muted-foreground px-2">
                 {info.description}
               </CardDescription>
             </CardHeader>
             <CardContent className="pt-0 text-center">
               {info.needsCode && (
                 <Badge variant="outline" className="text-xs border-primary/30 text-primary/80">
                   <Lock className="w-3 h-3 mr-1" />
                   Access Code Required
                 </Badge>
               )}
               {!info.needsCode && (
                 <Badge variant="secondary" className="text-xs">
                   <Eye className="w-3 h-3 mr-1" />
                   Open Access
                 </Badge>
               )}
             </CardContent>
           </Card>
         ))}
        </div>
      </div>

      {/* Access Code Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="max-w-md mx-auto bg-card/95 backdrop-blur border-primary/20">
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-3">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold cosmic-text">Access Code Required</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your {selectedRole} access code to continue
              </p>
              <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                <p>Access codes available:</p>
                {selectedRole === 'lead' && (
                  <p>• <code className="bg-background px-1 rounded">PIEFI-LEAD-MASTER-2025</code> (Master)</p>
                )}
                {selectedRole === 'mentor' && (
                  <p className="text-muted-foreground text-center">Contact your lead for mentor access codes</p>
                )}
                {selectedRole === 'builder' && (
                  <p className="text-muted-foreground text-center">Contact your lead for builder access codes</p>
                )}
              </div>
            </div>
            <div>
              <Input
                id="access-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter access code"
                className="text-center font-mono tracking-wider"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleCodeSubmit()}
              />
            </div>
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCodeDialog(false);
                  setCode("");
                  setError("");
                }} 
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCodeSubmit} 
                disabled={!code.trim()} 
                className="px-6 ufo-gradient hover:opacity-90"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};