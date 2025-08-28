import React, { useState, useEffect } from "react";
import ufoLogo from '@/assets/ufo-logo.png';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  // SEO: title, meta description, canonical, and FAQ structured data
  useEffect(() => {
    document.title = "PieFi – Santa Cruz Builder Camp | Access Portal";
    const desc = "Join PieFi: 10-week builder camp in Santa Cruz. Real products, expert mentorship, and startup community.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);

    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {"@type":"Question","name":"Do I need an idea/team to apply?","acceptedAnswer":{"@type":"Answer","text":"No, individuals welcome! We'll help you squad up."}},
        {"@type":"Question","name":"Do I have to be from Santa Cruz?","acceptedAnswer":{"@type":"Answer","text":"Not at all! We welcome anyone from the Bay Area who can attend events."}},
        {"@type":"Question","name":"Is funding guaranteed?","acceptedAnswer":{"@type":"Answer","text":"No. Small grants may be available based on needs; real value is mentorship and community."}},
        {"@type":"Question","name":"Do I have to be technical?","acceptedAnswer":{"@type":"Answer","text":"No. We value diverse skills: design, BD, marketing, and domain expertise."}},
        {"@type":"Question","name":"What happens at Demo Day?","acceptedAnswer":{"@type":"Answer","text":"A launchpad to meet investors, users, and media—your product's debut."}},
        {"@type":"Question","name":"Is this just another accelerator?","acceptedAnswer":{"@type":"Answer","text":"No. It's a sustainable, community-first builder model—not just capital."}}
      ]
    } as const;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(faqLd);
    document.head.appendChild(script);
    return () => {
      try { document.head.removeChild(script); } catch {}
    };
  }, []);

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
    <div className="min-h-screen bg-cosmic cosmic-sparkle">
      <div className="relative">
        {/* Professional Header */}
        <header className="ufo-card border-b">
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center ufo-pulse">
                  <img 
                    src={ufoLogo} 
                    alt="PieFi Logo" 
                    className="w-12 h-12"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold cosmic-text">PieFi</h1>
                  <p className="readable-muted">Santa Cruz Builder Camp</p>
                </div>
              </div>
            </div>
            
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent text-sm font-medium mb-6 glow-border">
                <Sparkles className="w-4 h-4 ufo-pulse" />
                Applications Open Now
              </div>
              <h2 className="text-4xl md:text-5xl font-bold cosmic-text mb-4">
                10 Weeks. 10 Teams. Real Products.
              </h2>
              <p className="text-lg readable-muted leading-relaxed">
                A builder camp that turns students and early founders into product creators. 
                Build something people want with expert mentorship and community support.
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-8">
              
              {/* Program Overview */}
              <div className="lg:col-span-2 space-y-8">
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Building2 className="w-6 h-6 text-primary" />
                    <h3 className="text-xl font-semibold text-professional">Program Overview</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-primary font-semibold">10</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-professional">Teams Selected</h4>
                          <p className="text-sm text-muted-foreground">Carefully chosen startups with real potential</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-primary font-semibold">10</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-professional">Week Sprint</h4>
                          <p className="text-sm text-muted-foreground">Intensive build period with milestones</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          <Users className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <h4 className="font-medium text-professional">Expert Mentorship</h4>
                          <p className="text-sm text-muted-foreground">Industry veterans guide your journey</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          <Rocket className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <h4 className="font-medium text-professional">Demo Day</h4>
                          <p className="text-sm text-muted-foreground">Launch to investors and community</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-xl font-semibold text-professional mb-4">Why Now?</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-medium text-professional mb-2">AI-Powered Building</h4>
                      <p className="text-sm text-muted-foreground">Anyone can ship products. Distribution starts on Day 1.</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-medium text-professional mb-2">Real Experience</h4>
                      <p className="text-sm text-muted-foreground">Ship in public, learn fast, grow with community.</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Access Panel */}
              <div className="lg:col-span-1">
                <Card className="p-6 sticky top-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-professional">Access Portal</h3>
                      <p className="text-sm text-muted-foreground">Choose your role to continue</p>
                    </div>
                  </div>
                  
                  {error && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {Object.entries(roleInfo).map(([role, info]) => (
                      <Card 
                        key={role}
                        className={`cursor-pointer transition-all duration-200 border-2 hover:border-primary/50 ${
                          selectedRole === role ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                        onClick={() => handleRoleClick(role as UserRole)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <info.icon className="w-5 h-5 text-foreground" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-professional">{info.label}</h4>
                                <Badge variant={info.needsCode ? "destructive" : "secondary"} className="text-xs">
                                  {info.needsCode ? <Lock className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                                  {info.needsCode ? 'Code Required' : 'Open Access'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{info.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t">
                    <p className="text-xs text-muted-foreground text-center">
                      Sponsored by <strong>Goodwin</strong> • Co-hosted with <strong>Santa Cruz Works</strong>
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Access Code Dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="sm:max-w-lg">
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
                className="mt-2 font-mono"
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
                className="px-6"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Builders */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
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
                <p className="text-sm text-yellow-700 dark:text-yellow-200 flex items-center gap-2">
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