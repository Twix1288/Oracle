import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserCheck, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';

export const RoleManager = () => {
  const { profile, assignRole } = useAuth();
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState<'builder' | 'mentor' | 'lead' | 'guest'>('guest');
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  // Fetch all users (only for leads)
  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: profile?.role === 'lead',
  });

  // Fetch role assignments
  const { data: roleAssignments } = useQuery({
    queryKey: ['role-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_assignments')
        .select(`
          *,
          profiles:user_id (full_name, email),
          assigned_by_profile:assigned_by (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: profile?.role === 'lead',
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role, reason }: { userId: string; role: any; reason: string }) => {
      return await assignRole(userId, role, reason);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Role assigned successfully!');
        queryClient.invalidateQueries({ queryKey: ['all-users'] });
        queryClient.invalidateQueries({ queryKey: ['role-assignments'] });
        setSelectedUser('');
        setSelectedRole('guest');
        setReason('');
      } else {
        toast.error(data.error || 'Failed to assign role');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign role');
    },
  });

  const handleAssignRole = () => {
    if (!selectedUser || !selectedRole) return;
    
    assignRoleMutation.mutate({
      userId: selectedUser,
      role: selectedRole,
      reason: reason || 'Role assigned by admin'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'lead': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'mentor': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'builder': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (profile?.role !== 'lead') {
    return (
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">Only leads can manage user roles.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/20">
          <UserCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-muted-foreground">Assign and manage user roles in the system</p>
        </div>
      </div>

      {/* Assign New Role */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Assign User Role
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.full_name || user.email}</span>
                        <Badge className={getRoleColor(user.role)} variant="outline">
                          {user.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
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
          </div>
          
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder="Why are you assigning this role?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-20"
            />
          </div>
          
          <Button 
            onClick={handleAssignRole}
            disabled={!selectedUser || !selectedRole || assignRoleMutation.isPending}
            className="w-full"
          >
            {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
          </Button>
        </CardContent>
      </Card>

      {/* Current Users */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Current Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : users?.length === 0 ? (
            <p className="text-muted-foreground">No users found</p>
          ) : (
            <div className="space-y-3">
              {users?.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-primary/10"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{user.full_name || 'Unnamed User'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleColor(user.role)} variant="outline">
                      {user.role}
                    </Badge>
                    {user.team_id && (
                      <Badge variant="outline" className="text-xs">
                        Team Member
                      </Badge>
                    )}
                    {user.onboarding_completed && (
                      <Badge variant="outline" className="text-xs bg-green-500/20 text-green-300">
                        Onboarded
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Role Changes */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Recent Role Changes</CardTitle>
        </CardHeader>
        <CardContent>
          {roleAssignments?.length === 0 ? (
            <p className="text-muted-foreground">No role changes recorded</p>
          ) : (
            <div className="space-y-3">
              {roleAssignments?.map((assignment: any) => (
                <div 
                  key={assignment.id} 
                  className="p-3 rounded-lg bg-background/30 border border-primary/10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {assignment.profiles?.full_name || 'User'} assigned as{' '}
                        <Badge className={getRoleColor(assignment.assigned_role)} variant="outline">
                          {assignment.assigned_role}
                        </Badge>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        By {assignment.assigned_by_profile?.full_name || 'System'} • {' '}
                        {new Date(assignment.created_at).toLocaleDateString()}
                      </p>
                      {assignment.reason && (
                        <p className="text-sm text-muted-foreground italic">"{assignment.reason}"</p>
                      )}
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