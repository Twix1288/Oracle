import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, Plus, Trash2, Eye, EyeOff, Copy, Check, Users2, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import type { UserRole } from "@/types/oracle";
import { Separator } from "@/components/ui/separator";

interface AccessCode {
  id: string;
  role: UserRole;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const AccessCodeManager = () => {
  const [newCode, setNewCode] = useState({
    role: 'builder' as UserRole,
    code: '',
    selectedUserId: '',
    customUserName: '',
    useExistingUser: true,
    team_id: undefined as string | undefined,
    mentor_id: undefined as string | undefined
  });
  const [showCodes, setShowCodes] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all registered users for the dropdown
  const { data: allUsers } = useQuery({
    queryKey: ['all-users-for-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, onboarding_completed')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch mentors
  const { data: mentors } = useQuery({
    queryKey: ['mentors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('role', 'mentor')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch access codes
  const { data: accessCodes = [], isLoading } = useQuery({
    queryKey: ['access_codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Create access code mutation
  const createCodeMutation = useMutation({
    mutationFn: async (codeData: any) => {
      const { data, error } = await supabase
        .from('access_codes')
        .insert([codeData]);
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['access_codes'] });
      if (variables?.role === 'mentor' && variables?.team_id && variables?.member_id) {
        assignMentorMutation.mutate({ team_id: variables.team_id, mentor_id: variables.member_id });
      }
      setNewCode({ 
        role: 'builder', 
        code: '', 
        selectedUserId: '', 
        customUserName: '', 
        useExistingUser: true, 
        team_id: undefined, 
        mentor_id: undefined 
      });
      toast({
        title: 'Access code created',
        description: 'New access code has been generated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create access code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Toggle code status mutation
  const toggleCodeMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('access_codes')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access_codes'] });
      toast({
        title: "Code updated",
        description: "Access code status has been updated.",
      });
    },
  });

  // Assign mentor to team mutation
  const assignMentorMutation = useMutation({
    mutationFn: async ({ team_id, mentor_id }: { team_id: string; mentor_id: string }) => {
      const { error } = await supabase
        .from('teams')
        .update({ assigned_mentor_id: mentor_id })
        .eq('id', team_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({ title: 'Mentor assigned', description: 'Mentor linked to team.' });
    },
  });

  // Delete code mutation
  const deleteCodeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('access_codes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access_codes'] });
      toast({
        title: "Code deleted",
        description: "Access code has been permanently deleted.",
      });
    },
  });

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(prev => ({ ...prev, code: result }));
  };

  const getDescription = () => {
    if (newCode.useExistingUser && newCode.selectedUserId) {
      const user = allUsers?.find(u => u.id === newCode.selectedUserId);
      return `Access code for ${user?.full_name || user?.email || 'Unknown User'}`;
    } else if (!newCode.useExistingUser && newCode.customUserName) {
      return `Access code for ${newCode.customUserName}`;
    }
    return '';
  };

  const handleCreateCode = () => {
    const description = getDescription();
    if (newCode.code && newCode.role && description) {
      const base: any = {
        role: newCode.role,
        code: newCode.code,
        description: description,
        team_id: (newCode.role === 'builder' || newCode.role === 'mentor') ? newCode.team_id : null,
      };
      if (newCode.role === 'mentor') {
        base.member_id = newCode.mentor_id;
      }
      createCodeMutation.mutate(base);
    }
  };

  const toggleCodeVisibility = (id: string) => {
    setShowCodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied to clipboard",
      description: "Access code has been copied to your clipboard.",
    });
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'lead': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'mentor': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'builder': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/20">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Access Code Management</h2>
          <p className="text-muted-foreground">Create and manage role-based access codes</p>
        </div>
      </div>

      {/* Create New Code */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Create New Access Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <Select 
                  value={newCode.role} 
                  onValueChange={(value: UserRole) => setNewCode(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="builder">Builder</SelectItem>
                    <SelectItem value="mentor">Mentor</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Access Code</label>
                <div className="flex gap-2">
                  <Input
                    value={newCode.code}
                    onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="Auto-generated"
                    className="bg-background border-border text-foreground font-mono"
                  />
                  <Button 
                    variant="outline" 
                    onClick={generateRandomCode}
                    className="border-border text-foreground hover:bg-muted"
                  >
                    Generate
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* User Selection Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-medium">Assign to User</h4>
              </div>
              
              <div className="flex gap-4 mb-4">
                <Button
                  type="button"
                  variant={newCode.useExistingUser ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewCode(prev => ({ ...prev, useExistingUser: true, selectedUserId: '', customUserName: '' }))}
                  className="flex items-center gap-2"
                >
                  <Users2 className="h-4 w-4" />
                  Existing User
                </Button>
                <Button
                  type="button"
                  variant={!newCode.useExistingUser ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewCode(prev => ({ ...prev, useExistingUser: false, selectedUserId: '', customUserName: '' }))}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  New User
                </Button>
              </div>

              {newCode.useExistingUser ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Select Registered User</label>
                  <Select 
                    value={newCode.selectedUserId} 
                    onValueChange={(value) => setNewCode(prev => ({ ...prev, selectedUserId: value }))}
                  >
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="Choose from registered users" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span>{user.full_name || user.email}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getRoleColor(user.role)}`}
                            >
                              {user.role}
                            </Badge>
                            {user.onboarding_completed && (
                              <Badge variant="outline" className="text-xs bg-green-500/20 text-green-300">
                                Complete
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {allUsers && allUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground">No registered users found. Users will appear here after they sign up.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">User Name</label>
                  <Input
                    value={newCode.customUserName}
                    onChange={(e) => setNewCode(prev => ({ ...prev, customUserName: e.target.value }))}
                    placeholder="Enter full name for new user"
                    className="bg-background border-border text-foreground"
                  />
                  <p className="text-xs text-muted-foreground">This will create an access code for a user who hasn't registered yet.</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Team and Mentor Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Team</label>
                <Select 
                  value={newCode.team_id || ""} 
                  onValueChange={(value) => setNewCode(prev => ({ ...prev, team_id: value || undefined }))}
                  disabled={!['builder','mentor'].includes(newCode.role)}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Select team (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map((team) => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newCode.role === 'mentor' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Mentor</label>
                  <Select 
                    value={newCode.mentor_id || ""} 
                    onValueChange={(value) => setNewCode(prev => ({ ...prev, mentor_id: value || undefined }))}
                  >
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder="Select mentor" />
                    </SelectTrigger>
                    <SelectContent>
                      {mentors?.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium mb-2">Preview:</p>
            <p className="text-sm text-muted-foreground">
              {getDescription() || "Complete the form to see code description"}
            </p>
          </div>

          <Button 
            onClick={handleCreateCode}
            disabled={
              !newCode.code || 
              !newCode.role || 
              (!newCode.useExistingUser && !newCode.customUserName) ||
              (newCode.useExistingUser && !newCode.selectedUserId) ||
              (newCode.role === 'mentor' && (!newCode.team_id || !newCode.mentor_id)) || 
              createCodeMutation.isPending
            }
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {createCodeMutation.isPending ? "Creating..." : "Create Access Code"}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Codes */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Existing Access Codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Manage and monitor all generated access codes. Codes can be shared with users to grant specific role access.
            </p>
          </div>
          {isLoading ? (
            <p className="text-muted-foreground">Loading access codes...</p>
          ) : accessCodes.length === 0 ? (
            <div className="text-center py-6">
              <KeyRound className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No access codes created yet</p>
              <p className="text-sm text-muted-foreground">Create your first access code to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accessCodes.map((code) => (
                <div 
                  key={code.id} 
                  className="p-4 rounded-lg bg-background/30 border border-primary/10 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getRoleColor(code.role)} variant="outline">
                        {code.role}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={code.is_active 
                          ? "bg-green-500/20 text-green-300 border-green-500/30" 
                          : "bg-red-500/20 text-red-300 border-red-500/30"
                        }
                      >
                        {code.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Created {new Date(code.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Code:</span>
                        <code className="text-primary font-mono bg-primary/10 px-2 py-1 rounded">
                          {showCodes[code.id] ? code.code : '••••••••'}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleCodeVisibility(code.id)}
                          className="h-6 w-6 p-0"
                        >
                          {showCodes[code.id] ? 
                            <EyeOff className="h-3 w-3" /> : 
                            <Eye className="h-3 w-3" />
                          }
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(code.code, code.id)}
                          className="h-6 w-6 p-0"
                        >
                          {copiedCode === code.id ? 
                            <Check className="h-3 w-3 text-green-400" /> : 
                            <Copy className="h-3 w-3" />
                          }
                        </Button>
                      </div>
                      {code.description && (
                        <p className="text-sm text-muted-foreground">{code.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleCodeMutation.mutate({ 
                          id: code.id, 
                          is_active: !code.is_active 
                        })}
                        className="border-primary/30"
                      >
                        {code.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteCodeMutation.mutate(code.id)}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
