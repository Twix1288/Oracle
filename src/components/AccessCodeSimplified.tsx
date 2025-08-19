import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { KeyRound, Plus, Copy, Check, Users, Mail } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { UserRole } from "@/types/oracle";

// Simplified Access Codes for team invitations only
export const AccessCodeSimplified = () => {
  const { profile } = useAuth();
  const [newInvite, setNewInvite] = useState({
    team_id: '',
    role: 'builder' as UserRole,
    email: '',
    message: ''
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ['teams-for-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, stage')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch team invites
  const { data: invites, isLoading } = useQuery({
    queryKey: ['team-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_codes')
        .select(`
          id, code, role, team_id, description, is_active, expires_at, created_at,
          teams:team_id (name, stage)
        `)
        .not('team_id', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Create team invite mutation
  const createInviteMutation = useMutation({
    mutationFn: async (inviteData: any) => {
      // Generate unique code
      const code = `TEAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('access_codes')
        .insert([{
          code,
          role: inviteData.role,
          team_id: inviteData.team_id,
          description: `Team invitation for ${inviteData.email}`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          generated_by: profile?.id
        }]);
      if (error) throw error;
      
      return { code, data };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['team-invites'] });
      toast.success(`Team invitation created! Code: ${result.code}`);
      setNewInvite({ team_id: '', role: 'builder', email: '', message: '' });
    },
    onError: (error) => {
      toast.error('Failed to create team invitation');
      console.error(error);
    }
  });

  const handleCreateInvite = () => {
    if (!newInvite.team_id || !newInvite.email) {
      toast.error('Please select a team and enter an email address');
      return;
    }
    
    createInviteMutation.mutate(newInvite);
  };

  const copyInviteLink = (code: string) => {
    const inviteUrl = `${window.location.origin}/?invite=${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success('Invite link copied to clipboard!');
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'mentor': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'builder': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (profile?.role !== 'lead' && profile?.role !== 'mentor') {
    return (
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardContent className="p-6 text-center">
          <KeyRound className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">Only leads and mentors can create team invitations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/20">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Team Invitations</h2>
          <p className="text-muted-foreground">Invite specific people to join teams directly</p>
        </div>
      </div>

      {/* Create Team Invitation */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Create Team Invitation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Team</Label>
              <Select 
                value={newInvite.team_id} 
                onValueChange={(value) => setNewInvite(prev => ({ ...prev, team_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.stage})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Role</Label>
              <Select 
                value={newInvite.role} 
                onValueChange={(value: UserRole) => setNewInvite(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="builder">Builder</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={newInvite.email}
                onChange={(e) => setNewInvite(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter their email address"
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Personal Message (Optional)</Label>
            <Textarea
              value={newInvite.message}
              onChange={(e) => setNewInvite(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Add a personal message to the invitation..."
              className="min-h-20"
            />
          </div>
          
          <Button 
            onClick={handleCreateInvite}
            disabled={!newInvite.team_id || !newInvite.email || createInviteMutation.isPending}
            className="w-full"
          >
            {createInviteMutation.isPending ? 'Creating...' : 'Create Team Invitation'}
          </Button>
        </CardContent>
      </Card>

      {/* Active Invitations */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Active Team Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading invitations...</p>
          ) : !invites || invites.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Active Invitations</h3>
              <p className="text-muted-foreground">
                Create team invitations to directly invite people to specific teams.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((invite: any) => (
                <div 
                  key={invite.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/30 border border-primary/10"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getRoleColor(invite.role)} variant="outline">
                          {invite.role}
                        </Badge>
                        <span className="text-sm font-medium">
                          {invite.teams?.name || 'Unknown Team'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {invite.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(invite.created_at).toLocaleDateString()} • 
                        Expires: {invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInviteLink(invite.code)}
                      className="flex items-center gap-2"
                    >
                      {copiedCode === invite.code ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copiedCode === invite.code ? 'Copied!' : 'Copy Link'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="p-4 rounded-lg bg-muted/20 border border-primary/20">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          How Team Invitations Work
        </h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Create invitations for specific people to join specific teams</p>
          <p>• Share the invite link directly with them via email or message</p>
          <p>• When they register with the invite code, they're automatically assigned to the team</p>
          <p>• Invitations expire after 7 days for security</p>
        </div>
      </div>
    </div>
  );
};