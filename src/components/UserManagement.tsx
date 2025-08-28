import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Code, Settings, Search, Edit, Trash2, Plus, Key } from "lucide-react";
import { toast } from "sonner";
import { BuildCodeManager } from "./BuildCodeManager";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: 'builder' | 'mentor' | 'lead' | 'guest';
  team_id?: string;
  created_at: string;
  avatar_url?: string;
  experience_level?: string;
  skills?: string[];
}

export const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [newAccessCode, setNewAccessCode] = useState("");
  
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserProfile[];
    }
  });

  // Fetch teams for code generation
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, description');
      
      if (error) throw error;
      return data;
    }
  });

  // Generate access code for user
  const generateUserCodeMutation = useMutation({
    mutationFn: async ({ userId, role, teamId }: { userId: string, role: string, teamId?: string }) => {
      const user = users.find(u => u.id === userId);
      if (!user) throw new Error('User not found');

      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 6);
      const generatedCode = `${role.toUpperCase()}-${user.full_name?.replace(/\s+/g, '').substring(0, 4).toUpperCase() || 'USER'}-${timestamp}${random}`.toUpperCase();

      const codeData = {
        code: generatedCode,
        role: role as any,
        description: `Personal access code for ${user.full_name || user.email}`,
        team_id: teamId || null,
        is_active: true,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        generated_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { data, error } = await supabase
        .from('access_codes')
        .insert([codeData])
        .select()
        .single();

      if (error) throw error;
      return { ...data, userName: user.full_name || user.email };
    },
    onSuccess: (data) => {
      setNewAccessCode(data.code);
      toast.success(`Access code generated for user: ${data.code}`);
      queryClient.invalidateQueries({ queryKey: ['access_codes'] });
    },
    onError: (error) => {
      toast.error('Failed to generate access code: ' + error.message);
    }
  });

  // Update user role
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: role as any })
        .eq('id', userId);
      
      if (error) throw error;
      return { userId, role };
    },
    onSuccess: () => {
      toast.success('User role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update user role: ' + error.message);
    }
  });

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'lead': return 'destructive';
      case 'mentor': return 'secondary';
      case 'builder': return 'default';
      default: return 'outline';
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsEditDialogOpen(true);
  };

  const handleGenerateCode = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    generateUserCodeMutation.mutate({ 
      userId, 
      role: user.role,
      teamId: user.team_id 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">User Management</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-card/50 backdrop-blur">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="codes" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Generate Codes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Users ({filteredUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No users found</div>
                ) : (
                  filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.full_name || 'No name set'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role.toUpperCase()}
                            </Badge>
                            {user.experience_level && (
                              <Badge variant="outline" className="text-xs">
                                {user.experience_level}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateCode(user.id)}
                          disabled={generateUserCodeMutation.isPending}
                        >
                          <Key className="h-4 w-4 mr-1" />
                          Code
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes">
          <BuildCodeManager teams={teams} users={users} />
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={selectedUser.avatar_url} />
                  <AvatarFallback>
                    {selectedUser.full_name?.charAt(0) || selectedUser.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{selectedUser.full_name || 'No name set'}</div>
                  <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="builder">Builder</SelectItem>
                    <SelectItem value="mentor">Mentor</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateUserRoleMutation.mutate({ userId: selectedUser.id, role: newRole })}
                  disabled={updateUserRoleMutation.isPending}
                  className="flex-1"
                >
                  Update Role
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generated Code Display */}
      {newAccessCode && (
        <Dialog open={!!newAccessCode} onOpenChange={() => setNewAccessCode("")}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Access Code Generated</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <Label>Generated Access Code:</Label>
                <div className="font-mono text-lg font-bold text-primary mt-2">
                  {newAccessCode}
                </div>
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(newAccessCode);
                  toast.success("Access code copied to clipboard!");
                }}
                className="w-full"
              >
                Copy to Clipboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};