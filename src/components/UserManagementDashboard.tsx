import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users, UserPlus, Settings, Crown, Shield, Zap, User, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { UserRole } from '@/types/oracle';

interface UserWithTeam {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  team_id?: string;
  onboarding_completed: boolean;
  created_at: string;
  teams?: { name: string; stage: string };
}

export const UserManagementDashboard = () => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithTeam | null>(null);
  const [assignmentData, setAssignmentData] = useState({
    role: 'guest' as UserRole,
    team_id: '',
    reason: ''
  });
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all users with team information
  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, full_name, email, role, team_id, onboarding_completed, created_at,
          teams:team_id (name, stage)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as UserWithTeam[];
    },
    enabled: profile?.role === 'lead',
  });

  // Fetch all teams
  const { data: teams } = useQuery({
    queryKey: ['teams-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, stage, assigned_mentor_id')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Assign role and team mutation
  const assignRoleAndTeamMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
      teamId,
      reason
    }: {
      userId: string;
      role: UserRole;
      teamId?: string;
      reason: string;
    }) => {
      // Update user profile with role and team
      const profileUpdate: any = { role };
      if (teamId) profileUpdate.team_id = teamId;

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId);

      if (profileError) throw profileError;

      // Log the role assignment
      const { error: logError } = await supabase
        .from('role_assignments')
        .insert({
          user_id: userId,
          assigned_role: role,
          assigned_by: profile?.id,
          reason
        });

      if (logError) throw logError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-management'] });
      queryClient.invalidateQueries({ queryKey: ['teams-for-assignment'] });
      setIsAssignDialogOpen(false);
      setSelectedUser(null);
      setAssignmentData({ role: 'guest', team_id: '', reason: '' });
      toast.success('User role and team assigned successfully!');
    },
    onError: (error) => {
      console.error('Assignment error:', error);
      toast.error('Failed to assign role and team. Please try again.');
    }
  });

  const handleAssignUser = (user: UserWithTeam) => {
    setSelectedUser(user);
    setAssignmentData({
      role: user.role,
      team_id: user.team_id || '',
      reason: ''
    });
    setIsAssignDialogOpen(true);
  };

  const handleSaveAssignment = () => {
    if (!selectedUser) return;

    const reason = assignmentData.reason || 
      `Assigned as ${assignmentData.role}${assignmentData.team_id ? ' to team' : ''} by lead`;

    assignRoleAndTeamMutation.mutate({
      userId: selectedUser.id,
      role: assignmentData.role,
      teamId: assignmentData.team_id || undefined,
      reason
    });
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'lead': return <Crown className="h-4 w-4 text-purple-400" />;
      case 'mentor': return <Shield className="h-4 w-4 text-green-400" />;
      case 'builder': return <Zap className="h-4 w-4 text-blue-400" />;
      default: return <User className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'lead': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'mentor': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'builder': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusBadge = (user: UserWithTeam) => {
    if (user.role === 'guest') {
      return (
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
          Awaiting Assignment
        </Badge>
      );
    }
    if (user.onboarding_completed) {
      return (
        <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
        Onboarding Pending
      </Badge>
    );
  };

  const filteredUsers = users?.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const pendingUsers = filteredUsers.filter(user => user.role === 'guest').length;

  if (profile?.role !== 'lead') {
    return (
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">Only leads can manage user assignments.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/20">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">User Management Dashboard</h2>
            <p className="text-muted-foreground">
              Assign roles and teams to registered users • {pendingUsers} pending assignments
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
            {users?.length || 0} Total Users
          </Badge>
          {pendingUsers > 0 && (
            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
              {pendingUsers} Pending
            </Badge>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Registered Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No users match your search criteria.' : 'No users have registered yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-4 rounded-lg bg-background/30 border border-primary/10 hover:bg-background/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <div>
                        <p className="font-medium">{user.full_name || 'Unnamed User'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Registered: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleColor(user.role)} variant="outline">
                          {user.role}
                        </Badge>
                        {getStatusBadge(user)}
                      </div>
                      
                      {user.teams && (
                        <Badge variant="outline" className="text-xs">
                          {user.teams.name} ({user.teams.stage})
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Dialog open={isAssignDialogOpen && selectedUser?.id === user.id} onOpenChange={setIsAssignDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignUser(user)}
                          className="flex items-center gap-2"
                        >
                          <Settings className="h-4 w-4" />
                          {user.role === 'guest' ? 'Assign Role' : 'Modify'}
                        </Button>
                      </DialogTrigger>
                      
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Assign Role & Team</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="font-medium">{selectedUser?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Role</Label>
                              <Select 
                                value={assignmentData.role} 
                                onValueChange={(value: UserRole) => 
                                  setAssignmentData(prev => ({ ...prev, role: value, team_id: value === 'guest' ? '' : prev.team_id }))
                                }
                              >
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
                            
                            <div className="space-y-2">
                              <Label>Team (Optional)</Label>
                              <Select 
                                value={assignmentData.team_id} 
                                onValueChange={(value) => setAssignmentData(prev => ({ ...prev, team_id: value }))}
                                disabled={assignmentData.role === 'guest'}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select team" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">No Team</SelectItem>
                                  {teams?.map((team) => (
                                    <SelectItem key={team.id} value={team.id}>
                                      {team.name} ({team.stage})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Reason (Optional)</Label>
                            <Input
                              value={assignmentData.reason}
                              onChange={(e) => setAssignmentData(prev => ({ ...prev, reason: e.target.value }))}
                              placeholder="Why are you making this assignment?"
                            />
                          </div>
                          
                          <div className="flex gap-2 pt-4">
                            <Button
                              variant="outline"
                              onClick={() => setIsAssignDialogOpen(false)}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSaveAssignment}
                              disabled={assignRoleAndTeamMutation.isPending}
                              className="flex-1"
                            >
                              {assignRoleAndTeamMutation.isPending ? 'Assigning...' : 'Assign'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users?.length || 0, color: 'text-blue-400' },
          { label: 'Pending', value: pendingUsers, color: 'text-yellow-400' },
          { label: 'Builders', value: filteredUsers.filter(u => u.role === 'builder').length, color: 'text-blue-400' },
          { label: 'Mentors', value: filteredUsers.filter(u => u.role === 'mentor').length, color: 'text-green-400' }
        ].map((stat, index) => (
          <Card key={index} className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};