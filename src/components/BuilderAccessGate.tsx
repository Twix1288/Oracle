import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, User, Shield, Eye, Lock, Sparkles, AlertTriangle, Users, Building2 } from "lucide-react";
import type { UserRole, Team } from "@/types/oracle";

interface BuilderAccessGateProps {
  onBuilderAuthenticated: (builderName: string, teamId: string, teamInfo: Team) => void;
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

export const BuilderAccessGate = ({ onBuilderAuthenticated, onRoleSelected }: BuilderAccessGateProps) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [code, setCode] = useState("");
  const [builderName, setBuilderName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [error, setError] = useState("");
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [validatedAccess, setValidatedAccess] = useState<{ team: Team; description?: string } | null>(null);
  const [validatedCode, setValidatedCode] = useState<string | null>(null);
  
  const queryClient = useQueryClient();


  // Fetch teams for builder selection
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Team[];
    },
  });

  // Create builder assignment
  const createAssignmentMutation = useMutation({
    mutationFn: async (assignment: { builder_name: string; team_id: string; access_code: string }) => {
      const { data, error } = await supabase
        .from('builder_assignments')
        .insert([assignment]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder_assignments'] });
    }
  });

  const handleRoleClick = (role: UserRole) => {
    setSelectedRole(role);
    setError("");
    setCode("");
    setBuilderName("");
    setSelectedTeamId("");
    
    if (roleInfo[role].needsCode) {
      setShowCodeDialog(true);
    } else {
      onRoleSelected(role);
    }
  };

  const handleCodeSubmit = async () => {
    if (!selectedRole || !code.trim()) return;

    const { data, error } = await supabase.rpc('validate_access_code', {
      p_code: code.trim(),
      p_role: selectedRole,
    });

    if (error) {
      setError("Validation failed. Please try again.");
      return;
    }

    if (data && data.length > 0) {
      if (selectedRole === 'builder') {
        const row = data[0] as { team_id: string; description?: string };
        const team = teams?.find(t => t.id === row.team_id);
        if (team) {
          setValidatedAccess({ team, description: row.description || '' });
          setBuilderName(row.description || '');
          setValidatedCode(code.trim());
          setShowConfirmDialog(true);
          setShowCodeDialog(false);
        }
      } else {
        onRoleSelected(selectedRole);
        setShowCodeDialog(false);
      }
      setCode("");
      setError("");
    } else {
      setError("Invalid access code. Please try again.");
    }
  };

  const handleConfirmAccess = async () => {
    if (!validatedAccess || !builderName.trim() || !validatedCode) return;

    try {
      // Create builder assignment record
      await createAssignmentMutation.mutateAsync({
        builder_name: builderName,
        team_id: validatedAccess.team.id,
        access_code: validatedCode
      });

      // Authenticate the builder
      onBuilderAuthenticated(builderName, validatedAccess.team.id, validatedAccess.team);
      setShowConfirmDialog(false);
      setValidatedAccess(null);
    } catch (error) {
      setError("Failed to complete authentication. Please try again.");
      setShowConfirmDialog(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-card relative overflow-hidden">
      {/* Subtle background effects */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/20 rounded-full blur-xl" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-primary/10 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 lg:py-12">
        {/* Header with PieFi UFO Logo */}
        <div className="text-center mb-12 lg:mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-4 rounded-full bg-primary/10 subtle-glow">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-professional">
              PieFi Oracle
            </h1>
          </div>
          <p className="text-xl lg:text-2xl readable-text max-w-3xl mx-auto px-4">
            Your AI-powered incubator assistant. Select your role to access personalized insights and tools.
          </p>
        </div>

        {/* Role Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12 lg:mb-16">
          {Object.entries(roleInfo).map(([role, info]) => (
            <Card 
              key={role}
              className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] professional-border group ${
                selectedRole === role ? 'ring-2 ring-primary shadow-lg' : ''
              } card-professional`}
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
        </div>

      </div>

      {/* Access Code Dialog - Enhanced for Builders */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="sm:max-w-lg glow-border bg-card/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Lock className="w-6 h-6 text-primary" />
              {selectedRole === 'builder' ? 'Team Access Authentication' : 'Enter Access Code'}
            </DialogTitle>
            <DialogDescription className="text-base">
              {selectedRole === 'builder' 
                ? 'Enter your details and team-specific access code to continue'
                : `Please enter your access code to continue as ${selectedRole && roleInfo[selectedRole]?.label}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label htmlFor="access-code" className="text-sm font-medium text-foreground">
                Access Code
              </Label>
              <Input
                id="access-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter your access code"
                className="mt-2 font-mono bg-background border-border text-foreground"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your lead provided this code with your name and team assignment
              </p>
            </div>
            
            {error && (
              <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              </div>
            )}
            
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowCodeDialog(false)} className="px-6">
                Cancel
              </Button>
              <Button 
                onClick={handleCodeSubmit} 
                disabled={!code.trim()} 
                className="px-6 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Builders */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="glow-border bg-card/95 backdrop-blur-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Confirm Team Access
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Please confirm your team assignment details:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {validatedAccess && (
            <div className="space-y-4 my-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Name:</span>
                      <span>{builderName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Team:</span>
                      <span>{validatedAccess.team.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Stage:</span>
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        {validatedAccess.team.stage}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Access Code:</span>
                      <code className="text-sm bg-background px-2 py-1 rounded border font-mono">
                        {validatedCode}
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Once confirmed, you'll be locked to this team for this session.
                </p>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAccess}>
              Confirm & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};