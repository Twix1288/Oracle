import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, User, Shield, Eye, Lock, Sparkles } from "lucide-react";
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

  const { data: accessCodes } = useQuery({
    queryKey: ['access_codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const handleRoleClick = (role: UserRole) => {
    setSelectedRole(role);
    setError("");
    
    if (roleInfo[role].needsCode) {
      setShowCodeDialog(true);
    } else {
      onRoleSelected(role);
    }
  };

  const handleCodeSubmit = () => {
    if (!selectedRole || !code) return;

    const validCode = accessCodes?.find(
      ac => ac.role === selectedRole && ac.code === code
    );

    if (validCode) {
      onRoleSelected(selectedRole);
      setShowCodeDialog(false);
    } else {
      setError("Invalid access code. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background relative overflow-hidden">
      {/* Cosmic background effects */}
      <div className="absolute inset-0 cosmic-sparkle opacity-20" />
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-xl ufo-pulse" />
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-primary/5 rounded-full blur-2xl ufo-float" />

      <div className="relative z-10 container mx-auto px-4 py-8 lg:py-12">
        {/* Header */}
        <div className="text-center mb-12 lg:mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 rounded-full bg-primary/10 ufo-glow">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-glow">
              PieFi Oracle
            </h1>
          </div>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Your AI-powered incubator assistant. Select your role to access personalized insights and tools.
          </p>
        </div>

        {/* Role Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12 lg:mb-16">
          {Object.entries(roleInfo).map(([role, info]) => (
            <Card 
              key={role}
              className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] lg:hover:scale-105 glow-border group ${
                selectedRole === role ? 'ring-2 ring-primary shadow-lg ufo-glow' : ''
              }`}
              onClick={() => handleRoleClick(role as UserRole)}
            >
              <CardHeader className="text-center pb-3">
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${info.color} group-hover:scale-110 transition-transform duration-300`}>
                  <info.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg font-semibold">{info.label}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{info.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col gap-2">
                  <Badge 
                    variant={info.needsCode ? "destructive" : "secondary"} 
                    className="self-center text-xs font-medium"
                  >
                    {info.needsCode ? (
                      <>
                        <Lock className="w-3 h-3 mr-1" />
                        Access Code Required
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3 mr-1" />
                        Open Access
                      </>
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}

        {/* Demo Access Codes */}
        <Card className="max-w-3xl mx-auto glow-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2 text-lg">
              <Lock className="w-5 h-5 text-primary" />
              Demo Access Codes
            </CardTitle>
            <CardDescription className="text-center">
              Use these codes to test different roles and explore the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors">
                <div className="font-semibold text-sm text-primary mb-2">Lead</div>
                <code className="text-xs bg-background px-3 py-1.5 rounded-md border font-mono">LEAD001</code>
                <div className="text-xs text-muted-foreground mt-2">Full Admin Access</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors">
                <div className="font-semibold text-sm text-green-600 mb-2">Mentor</div>
                <code className="text-xs bg-background px-3 py-1.5 rounded-md border font-mono">MENTOR001</code>
                <div className="text-xs text-muted-foreground mt-2">Team Guidance</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-colors">
                <div className="font-semibold text-sm text-blue-600 mb-2">Builder</div>
                <code className="text-xs bg-background px-3 py-1.5 rounded-md border font-mono">BUILD001</code>
                <div className="text-xs text-muted-foreground mt-2">Team Member</div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Access Code Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Enter Access Code
            </DialogTitle>
            <DialogDescription>
              Please enter your access code to continue as <strong>{selectedRole && roleInfo[selectedRole]?.label}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="access-code" className="text-sm font-medium">Access Code</Label>
              <Input
                id="access-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter your access code"
                className="mt-2 font-mono"
                autoFocus
              />
            </div>
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowCodeDialog(false)} className="px-6">
                Cancel
              </Button>
              <Button onClick={handleCodeSubmit} disabled={!code.trim()} className="px-6">
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};