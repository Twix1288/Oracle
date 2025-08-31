import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, UserCheck, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Team } from "@/types/oracle";

interface RoleTeamSelectionProps {
  value: {
    role?: string;
    teamId?: string;
  };
  onChange: (value: { role?: string; teamId?: string }) => void;
}

const ROLES = [
  {
    id: 'builder',
    icon: Users,
    title: 'Builder',
    description: 'Join a team and build amazing products',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  },
  {
    id: 'mentor',
    icon: UserCheck,
    title: 'Mentor',
    description: 'Guide and support builder teams',
    color: 'bg-green-500/10 text-green-400 border-green-500/20'
  },
  {
    id: 'lead',
    icon: Shield,
    title: 'Lead',
    description: 'Create and manage teams',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  },
  {
    id: 'guest',
    icon: User,
    title: 'Guest',
    description: 'Explore and learn about the program',
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
  }
];

export const RoleTeamSelection = ({ value, onChange }: RoleTeamSelectionProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available teams
  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTeams(data || []);
      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (value.role === 'builder' || value.role === 'mentor') {
      fetchTeams();
    }
  }, [value.role]);

  return (
    <div className="space-y-6">
      {/* Role Selection */}
      <div className="space-y-4">
        <h4 className="font-medium text-lg">Choose Your Role</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const isSelected = value.role === role.id;

            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'glow-border border-primary/40 bg-primary/5'
                    : 'hover:glow-border'
                }`}
                onClick={() => onChange({ ...value, role: role.id })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${role.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold high-contrast-text">
                        {role.title}
                      </h4>
                      <p className="text-sm readable-muted">
                        {role.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Badge className="bg-primary/20 text-primary border-primary/30 font-medium">
                        Selected
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Team Selection */}
      {(value.role === 'builder' || value.role === 'mentor') && (
        <div className="space-y-4">
          <h4 className="font-medium text-lg">Select Your Team</h4>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading teams...
            </div>
          ) : teams.length > 0 ? (
            <div className="space-y-4">
              {teams.map((team) => {
                const isSelected = value.teamId === team.id;

                return (
                  <Card
                    key={team.id}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'glow-border border-primary/40 bg-primary/5'
                        : 'hover:glow-border'
                    }`}
                    onClick={() => onChange({ ...value, teamId: team.id })}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold high-contrast-text">
                            {team.name}
                          </h4>
                          <p className="text-sm readable-muted">
                            {team.description || 'No description available'}
                          </p>
                        </div>
                        {isSelected && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 font-medium">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No teams available for selection. Please contact program leadership.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
