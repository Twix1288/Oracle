import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Code, Sparkles, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import type { UserRole } from '@/types/oracle';

interface Team {
  id: string;
  name: string;
  description?: string;
}

interface BuildCodeManagerProps {
  teams: Team[];
  users?: Array<{
    id: string;
    email: string;
    full_name?: string;
    role: string;
  }>;
}

interface GeneratedCode {
  code: string;
  role: UserRole;
  teamName?: string;
  description?: string;
}

export const BuildCodeManager = ({ teams, users = [] }: BuildCodeManagerProps) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('builder');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [maxUses, setMaxUses] = useState<string>('');
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCode[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const queryClient = useQueryClient();

  const generateCodeMutation = useMutation({
    mutationFn: async (params: {
      role: UserRole;
      teamId?: string;
      description: string;
      maxUses?: number;
    }) => {
      const codeData: any = {
        role: params.role,
        description: params.description,
        is_active: true,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        generated_by: (await supabase.auth.getUser()).data.user?.id
      };

      if (params.teamId) {
        codeData.team_id = params.teamId;
      }

      if (params.maxUses) {
        codeData.max_uses = params.maxUses;
        codeData.current_uses = 0;
      }

      // Generate a unique code
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      const rolePrefix = params.role.toUpperCase().substring(0, 3);
      const teamName = params.teamId ? teams.find(t => t.id === params.teamId)?.name : '';
      const teamPrefix = teamName ? teamName.replace(/\s+/g, '').substring(0, 4).toUpperCase() : 'GEN';
      
      const generatedCode = `${rolePrefix}-${teamPrefix}-${timestamp}${random}`.toUpperCase();
      codeData.code = generatedCode;

      const { data, error } = await supabase
        .from('access_codes')
        .insert([codeData])
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        teamName: teamName || undefined
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['access_codes'] });
      
      const newCode: GeneratedCode = {
        code: data.code,
        role: data.role,
        teamName: data.teamName,
        description: data.description
      };
      
      setGeneratedCodes(prev => [newCode, ...prev]);
      toast.success('Build code generated successfully!');
      
      // Reset form
      setDescription('');
      setMaxUses('');
      setSelectedTeamId('');
      setSelectedUserId('');
    },
    onError: (error) => {
      toast.error('Failed to generate code: ' + error.message);
    }
  });

  const handleGenerateCode = async () => {
    if (!description.trim()) {
      toast.error('Please provide a description for the code');
      return;
    }

    if (selectedRole === 'builder' && !selectedTeamId) {
      toast.error('Please select a team for builder codes');
      return;
    }

    setIsGenerating(true);
    
    try {
      await generateCodeMutation.mutateAsync({
        role: selectedRole,
        teamId: selectedRole === 'builder' ? selectedTeamId : undefined,
        description: description.trim(),
        maxUses: maxUses ? parseInt(maxUses) : undefined
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'builder': return 'default';
      case 'mentor': return 'secondary';
      case 'lead': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 cosmic-text">
            <Code className="w-5 h-5 text-primary" />
            Generate Build Codes
          </CardTitle>
          <CardDescription>
            Create access codes for builders, mentors, and leads to join the program
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role Type</Label>
              <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="builder">Builder</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {users.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="user">Assign to User (Optional)</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedRole === 'builder' && (
              <div className="space-y-2">
                <Label htmlFor="team">Team Assignment</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for this access code..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxUses">Max Uses (Optional)</Label>
            <Input
              id="maxUses"
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Leave empty for unlimited uses"
              min="1"
            />
          </div>

          <Button 
            onClick={handleGenerateCode}
            disabled={isGenerating}
            className="w-full glass-button"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Generating Code...
              </>
            ) : (
              <>
                <Code className="w-4 h-4 mr-2" />
                Generate Build Code
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedCodes.length > 0 && (
        <Card className="glow-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 cosmic-text">
              <Sparkles className="w-5 h-5 text-accent" />
              Generated Codes
            </CardTitle>
            <CardDescription>
              Recently generated access codes (session only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedCodes.map((codeData, index) => (
                <div key={index} className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(codeData.role)}>
                        {codeData.role.toUpperCase()}
                      </Badge>
                      {codeData.teamName && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {codeData.teamName}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(codeData.code)}
                      className="hover:bg-primary/20"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="font-mono text-lg font-bold text-primary bg-primary/10 px-3 py-2 rounded border">
                    {codeData.code}
                  </div>
                  
                  {codeData.description && (
                    <p className="text-sm text-muted-foreground">
                      {codeData.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <Alert className="mt-4 border-primary/20 bg-primary/5">
              <Calendar className="w-4 h-4" />
              <AlertDescription>
                All generated codes are valid for 1 year and will be saved to the database for future use.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
};