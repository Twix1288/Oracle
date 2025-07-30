import { useState } from "react";
import { BuilderAccessGate } from "@/components/BuilderAccessGate";
import { RoleSelector } from "@/components/RoleSelector";
import { GuestDashboard } from "@/components/dashboards/GuestDashboard";
import { BuilderDashboard } from "@/components/dashboards/BuilderDashboard";
import { EnhancedBuilderDashboard } from "@/components/EnhancedBuilderDashboard";
import { MentorDashboard } from "@/components/dashboards/MentorDashboard";
import { LeadDashboard } from "@/components/dashboards/LeadDashboard";
import { useOracle } from "@/hooks/useOracle";
import type { UserRole, Team } from "@/types/oracle";

function Index() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [builderInfo, setBuilderInfo] = useState<{
    name: string;
    teamId: string;
    team: Team;
  } | null>(null);
  
  const { 
    teams, 
    members, 
    updates, 
    teamStatuses,
    isLoading, 
    submitUpdate, 
    createTeam, 
    queryRAG, 
    ragResponse, 
    ragLoading
  } = useOracle(selectedRole);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    // Reset builder info when switching roles
    if (role !== 'builder') {
      setBuilderInfo(null);
    }
  };

  const handleBuilderAuthenticated = (builderName: string, teamId: string, teamInfo: Team) => {
    setSelectedRole('builder');
    setBuilderInfo({
      name: builderName,
      teamId: teamId,
      team: teamInfo
    });
  };

  const handleLeaveTeam = () => {
    setBuilderInfo(null);
    setSelectedRole(null);
  };

  // Show enhanced builder access gate for builders
  if (!selectedRole || (selectedRole === 'builder' && !builderInfo)) {
    return (
      <BuilderAccessGate 
        onBuilderAuthenticated={handleBuilderAuthenticated}
        onRoleSelected={handleRoleSelect} 
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-card to-background cosmic-sparkle">
        <div className="text-center space-y-6">
          <div className="ufo-pulse">
            <svg width="120" height="120" viewBox="0 0 100 100" fill="currentColor" className="text-primary mx-auto">
              <ellipse cx="50" cy="60" rx="35" ry="15" opacity="0.6"/>
              <ellipse cx="50" cy="45" rx="25" ry="20"/>
              <circle cx="40" cy="40" r="3" fill="white" opacity="0.8"/>
              <circle cx="50" cy="38" r="4" fill="white"/>
              <circle cx="60" cy="40" r="3" fill="white" opacity="0.8"/>
            </svg>
          </div>
          <h2 className="text-3xl font-semibold text-glow">Connecting to Oracle...</h2>
          <p className="text-muted-foreground text-lg">Establishing quantum link to the knowledge base</p>
        </div>
      </div>
    );
  }

  const handleQueryRAG = (query: string, role: UserRole) => {
    queryRAG({ query, role });
  };

  const renderDashboard = () => {
    switch (selectedRole) {
      case 'guest':
        return (
          <GuestDashboard 
            teams={teams || []}
            updates={updates || []}
            onExit={() => setSelectedRole(null)}
          />
        );
      case 'builder':
        return builderInfo ? (
          <EnhancedBuilderDashboard
            team={builderInfo.team}
            builderName={builderInfo.name}
            members={members || []}
            updates={updates || []}
            teamStatuses={teamStatuses}
            onSubmitUpdate={submitUpdate}
            onQueryRAG={handleQueryRAG}
            ragResponse={ragResponse}
            ragLoading={ragLoading}
            onLeaveTeam={handleLeaveTeam}
          />
        ) : (
          <BuilderDashboard
            teams={teams || []}
            members={members || []}
            updates={updates || []}
            teamStatuses={teamStatuses}
            selectedRole={selectedRole}
            builderId="current-builder"
            teamId={teams?.[0]?.id}
            onSubmitUpdate={submitUpdate}
            onQueryRAG={handleQueryRAG}
            ragResponse={ragResponse}
            ragLoading={ragLoading}
          />
        );
      case 'mentor':
        return (
          <MentorDashboard 
            teams={teams || []}
            members={members || []}
            updates={updates || []}
            teamStatuses={teamStatuses}
            selectedRole={selectedRole}
            mentorId="current-mentor"
          />
        );
      case 'lead':
        return (
          <LeadDashboard 
            teams={teams || []}
            members={members || []}
            updates={updates || []}
            teamStatuses={teamStatuses}
            selectedRole={selectedRole}
          />
        );
      default:
        return <BuilderAccessGate onBuilderAuthenticated={handleBuilderAuthenticated} onRoleSelected={handleRoleSelect} />;
    }
  };

  return renderDashboard();
}

export default Index;