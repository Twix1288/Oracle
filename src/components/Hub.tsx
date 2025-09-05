import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Users, 
  UserCheck, 
  Eye, 
  Sparkles,
  Rocket,
  MessageCircle,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface HubProps {
  userProfile: any;
  onCreateProject: () => void;
}

export const Hub = ({ userProfile, onCreateProject }: HubProps) => {
  const [accessCode, setAccessCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const { updateProfile } = useAuth();

  const handleJoinTeam = async () => {
    if (!accessCode.trim()) {
      toast({
        title: "Access Code Required",
        description: "Please enter an access code to join a team.",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    try {
      const { data: accessCodeData, error } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', accessCode.trim())
        .eq('is_active', true)
        .single();

      if (error || !accessCodeData) {
        throw new Error('Invalid access code');
      }

      const { error: profileError } = await updateProfile({
        role: accessCodeData.role || 'builder',
        team_id: accessCodeData.team_id
      });

      if (profileError) throw profileError;

      toast({ title: "Successfully Joined! 🎉" });
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join team.",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleBecomeMentor = async () => {
    try {
      const { error } = await updateProfile({ role: 'mentor' });
      if (error) throw error;
      toast({ title: "Welcome, Mentor! 🎓" });
      window.location.reload();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background cosmic-sparkle">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-glow mb-4">Welcome to the Hub! 🌟</h1>
            <p className="text-xl text-muted-foreground mb-2">Hey {userProfile?.full_name || 'there'}!</p>
            <p className="text-muted-foreground">What would you like to do today?</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="glow-border interactive-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Plus className="h-6 w-6 text-primary" />
                  Create New Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Start your own project and become the owner</p>
                <Button onClick={onCreateProject} className="w-full ufo-gradient">
                  <Rocket className="h-4 w-4 mr-2" />
                  Launch Project
                </Button>
              </CardContent>
            </Card>

            <Card className="glow-border interactive-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  Join a Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Have an access code? Join an existing project</p>
                <Input
                  placeholder="Enter access code..."
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                />
                <Button onClick={handleJoinTeam} disabled={isJoining} className="w-full" variant="outline">
                  {isJoining ? "Joining..." : "Join Team"}
                </Button>
              </CardContent>
            </Card>

            <Card className="glow-border interactive-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <UserCheck className="h-6 w-6 text-primary" />
                  Become a Mentor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Share your expertise and guide other builders</p>
                <Button onClick={handleBecomeMentor} className="w-full" variant="outline">
                  Join as Mentor
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="glow-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Your Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    {userProfile?.skills?.map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                    )) || <span className="text-muted-foreground text-sm">No skills listed</span>}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Looking For</h4>
                  <div className="flex flex-wrap gap-1">
                    {userProfile?.looking_for_skills?.map((skill: string) => (
                      <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                    )) || <span className="text-muted-foreground text-sm">Not specified</span>}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Interests</h4>
                  <div className="flex flex-wrap gap-1">
                    {userProfile?.interests?.map((interest: string) => (
                      <Badge key={interest} variant="outline" className="text-xs">{interest}</Badge>
                    )) || <span className="text-muted-foreground text-sm">Not specified</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};