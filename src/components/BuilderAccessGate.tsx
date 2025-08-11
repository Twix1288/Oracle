import React, { useState, useEffect } from "react";
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
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
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
    document.title = "Pie Fi – Next-Gen Builder Camp | Roles & Access";
    const desc = "Pie Fi: 10 weeks, 10 teams, real products. Santa Cruz builder camp with mentorship, funding, and community.";
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
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-24 left-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-24 right-10 w-56 h-56 bg-primary/10 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10">
        <header className="container mx-auto px-4 py-10 lg:py-16 text-center animate-fade-in">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 hover-scale">
            <span role="img" aria-label="pie">🥧</span>
            The Next-Gen Builder Camp for Santa Cruz
          </div>
          <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight">
            Pie Fi
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">10 Weeks. 10 Teams. Real Products.</p>
          <p className="mt-4 max-w-3xl mx-auto text-balance text-muted-foreground">
            A 10-week summer builder camp that turns students and early builders into founders.
            Build something people want, with the resources and community to make it happen.
          </p>
          <p className="mt-4 italic text-sm text-muted-foreground">"The next wave will be built this summer, not in five years"</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300">
              <span role="img" aria-label="fire">🔥</span> Applications open now!
            </span>
            <span className="text-sm text-muted-foreground">Co-hosted with <strong>Santa Cruz Works</strong></span>
            <span className="text-sm text-muted-foreground">Primary Sponsor <strong>Goodwin</strong></span>
          </div>
        </header>

        <main className="container mx-auto px-4 space-y-12 lg:space-y-16">
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <article className="col-span-2 p-6 rounded-xl border bg-card/60 backdrop-blur animate-enter">
              <h2 className="text-2xl font-bold mb-2">What is Pie Fi?</h2>
              <p className="text-muted-foreground mb-6">A new kind of builder clubhouse in Santa Cruz</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-background/60 hover-scale">
                  <h3 className="font-semibold">Builder Clubhouse</h3>
                  <p className="text-sm text-muted-foreground">Where ideas become products</p>
                </div>
                <div className="p-4 rounded-lg border bg-background/60 hover-scale">
                  <h3 className="font-semibold">Real Community</h3>
                  <p className="text-sm text-muted-foreground">Students & founders building together</p>
                </div>
                <div className="p-4 rounded-lg border bg-background/60 hover-scale">
                  <h3 className="font-semibold">Pizza Restaurant</h3>
                  <p className="text-sm text-muted-foreground">Part accelerator, all community</p>
                </div>
              </div>
            </article>

            <aside className="p-6 rounded-xl border bg-card/60 backdrop-blur animate-enter">
              <h2 className="text-xl font-bold mb-4">Choose your role</h2>
              <p className="text-sm text-muted-foreground mb-4">Use your access code to enter.</p>
              <div className="grid grid-cols-1 gap-3">
                {/* Role Selection Grid */}
                {Object.entries(roleInfo).map(([role, info]) => (
                  <Card 
                    key={role}
                    className={`cursor-pointer transition-all hover:scale-105 glow-border group ${
                      selectedRole === role ? 'ring-2 ring-primary shadow-lg' : ''
                    }`}
                    onClick={() => handleRoleClick(role as UserRole)}
                  >
                    <CardHeader className="py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${info.color}`}>
                          <info.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{info.label}</CardTitle>
                          <CardDescription className="text-xs">{info.description}</CardDescription>
                        </div>
                        <Badge variant={info.needsCode ? "destructive" : "secondary"} className="text-2xs">
                          {info.needsCode ? 'Code' : 'Open'}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </aside>
          </section>

          <section className="p-6 rounded-xl border bg-card/60 backdrop-blur animate-enter">
            <h2 className="text-2xl font-bold mb-2">Why Now?</h2>
            <p className="text-muted-foreground mb-6">The startup playbook has been completely rewritten</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-background/60 hover-scale">
                <h3 className="font-semibold">Funding isn't the bottleneck</h3>
                <p className="text-sm text-muted-foreground">It's orientation, momentum, and proximity to the right people</p>
              </div>
              <div className="p-4 rounded-lg border bg-background/60 hover-scale">
                <h3 className="font-semibold">AI has flattened building</h3>
                <p className="text-sm text-muted-foreground">Anyone can ship. Distribution starts on Day 1</p>
              </div>
              <div className="p-4 rounded-lg border bg-background/60 hover-scale">
                <h3 className="font-semibold">Builders need real reps</h3>
                <p className="text-sm text-muted-foreground">Ship in public, learn fast, grow from a place that knows how</p>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-xl border bg-primary/5 animate-enter">
            <h2 className="text-2xl font-bold mb-2">The 10 in 10 Program</h2>
            <p className="text-muted-foreground mb-6">Turn ideas into shipped products</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border bg-background/60 text-center">
                <div className="text-4xl font-bold">10</div>
                <div className="text-sm text-muted-foreground">Teams Selected</div>
              </div>
              <div className="p-4 rounded-lg border bg-background/60 text-center">
                <div className="text-4xl font-bold">10</div>
                <div className="text-sm text-muted-foreground">Week Sprint</div>
              </div>
              <div className="p-4 rounded-lg border bg-background/60 text-center">
                <div className="text-4xl">🍕</div>
                <div className="text-sm text-muted-foreground">10 Pizzas / Team</div>
              </div>
              <div className="p-4 rounded-lg border bg-background/60 text-center">
                <div className="text-4xl font-bold">1</div>
                <div className="text-sm text-muted-foreground">Demo Day</div>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-xl border bg-card/60 backdrop-blur animate-enter">
            <h2 className="text-2xl font-bold mb-4">Crystal clear expectations</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-background/60">
                <h3 className="font-semibold">What It IS</h3>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <li>10-week builder sprint for next-gen founders</li>
                  <li>Launchpad for shipping real products & forming teams</li>
                  <li>Small needs-based grants and full Pie Fi Stack</li>
                  <li>Public building, squad energy, peer learning</li>
                  <li>Tangible products, career-launching, demo day</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg border bg-background/60">
                <h3 className="font-semibold">What It ISN'T</h3>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <li>Another hackathon or pitch contest</li>
                  <li>Cash grab or startup lottery</li>
                  <li>Traditional fund or guaranteed investment</li>
                  <li>Solo, secretive, or zero-sum</li>
                  <li>Participation trophy</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-xl border bg-card/60 backdrop-blur animate-enter">
            <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="max-w-3xl">
              <Accordion type="single" collapsible>
                <AccordionItem value="q1">
                  <AccordionTrigger>Do I need an idea/team to apply?</AccordionTrigger>
                  <AccordionContent>No, individuals welcome! We'll help you squad up.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2">
                  <AccordionTrigger>Do I have to be from Santa Cruz?</AccordionTrigger>
                  <AccordionContent>Not at all! We welcome anyone from the Bay Area who can make it to events.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q3">
                  <AccordionTrigger>Is funding guaranteed?</AccordionTrigger>
                  <AccordionContent>No. Small grants may be available case-by-case; real value is mentorship, resources, and community.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q4">
                  <AccordionTrigger>Do I have to be technical?</AccordionTrigger>
                  <AccordionContent>No. We value diverse skills like design, business, and domain expertise.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q5">
                  <AccordionTrigger>What happens at Demo Day?</AccordionTrigger>
                  <AccordionContent>A launchpad to meet investors, users, and media—your product's debut.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="q6">
                  <AccordionTrigger>Is this just another accelerator?</AccordionTrigger>
                  <AccordionContent>No. We’re building a sustainable, community-first builder model.</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>
        </main>
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