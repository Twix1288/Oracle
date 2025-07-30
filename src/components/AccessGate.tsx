import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, User, Shield, Eye } from "lucide-react";
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
    <div className="min-h-screen bg-background relative overflow-hidden cosmic-sparkle">
      {/* UFO floating animation */}
      <div className="absolute top-20 right-20 text-primary opacity-30 ufo-float">
        <svg width="80" height="80" viewBox="0 0 100 100" fill="currentColor">
          <ellipse cx="50" cy="60" rx="35" ry="15" opacity="0.6"/>
          <ellipse cx="50" cy="45" rx="25" ry="20"/>
          <circle cx="40" cy="40" r="3" fill="white" opacity="0.8"/>
          <circle cx="50" cy="38" r="4" fill="white"/>
          <circle cx="60" cy="40" r="3" fill="white" opacity="0.8"/>
        </svg>
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          {/* Header */}
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              <div className="ufo-pulse">
                <svg width="60" height="60" viewBox="0 0 100 100" fill="currentColor" className="text-primary">
                  <ellipse cx="50" cy="60" rx="35" ry="15" opacity="0.6"/>
                  <ellipse cx="50" cy="45" rx="25" ry="20"/>
                  <circle cx="40" cy="40" r="3" fill="white" opacity="0.8"/>
                  <circle cx="50" cy="38" r="4" fill="white"/>
                  <circle cx="60" cy="40" r="3" fill="white" opacity="0.8"/>
                </svg>
              </div>
              <h1 className="text-6xl font-bold text-glow">
                PieFi Oracle
              </h1>
            </div>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The intelligent mission control for incubator teams. 
              Select your role to access your personalized UFO dashboard.
            </p>
          </div>

          {/* Role Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(roleInfo).map(([role, info]) => {
              const IconComponent = info.icon;
              return (
                <button
                  key={role}
                  onClick={() => handleRoleClick(role as UserRole)}
                  className="group relative p-6 rounded-xl border-2 border-transparent bg-card/50 backdrop-blur hover:bg-card/80 transition-all duration-300 glow-border"
                >
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <IconComponent className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">{info.label}</h3>
                      <p className="text-sm text-muted-foreground">{info.description}</p>
                    </div>

                    <Badge className={info.color} variant="outline">
                      {info.needsCode ? "Code Required" : "Open Access"}
                    </Badge>
                  </div>

                  <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              );
            })}
          </div>

          {/* Sample Codes Display */}
          <div className="max-w-md mx-auto p-6 rounded-xl bg-card/30 backdrop-blur border glow-border">
            <h3 className="text-lg font-semibold mb-4 text-center">🛸 Demo Access Codes</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Builder:</span>
                <code className="text-primary font-mono">build2024</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mentor:</span>
                <code className="text-primary font-mono">guide2024</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead:</span>
                <code className="text-primary font-mono">lead2024</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Code Entry Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur border-primary/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRole && React.createElement(roleInfo[selectedRole].icon, { className: "h-5 w-5 text-primary" })}
              Enter {selectedRole && roleInfo[selectedRole].label} Access Code
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Input
              type="password"
              placeholder="Enter access code..."
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
              className="text-center font-mono tracking-wider"
            />
            
            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={handleCodeSubmit} 
                disabled={!code}
                className="flex-1 ufo-gradient hover:opacity-90"
              >
                Launch Mission 🚀
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCodeDialog(false)}
                className="border-primary/30 hover:border-primary/50"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};