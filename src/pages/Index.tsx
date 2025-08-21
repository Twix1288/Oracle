import { useAuth } from "@/hooks/useAuth";
import { LeadDashboardEnhanced } from "@/components/LeadDashboardEnhanced";
import { EnhancedBuilderDashboard } from "@/components/EnhancedBuilderDashboard";
import { MentorDashboard } from "@/components/dashboards/MentorDashboard";
import { GuestDashboard } from "@/components/dashboards/GuestDashboard";
import { useOracle } from "@/hooks/useOracle";
import { Loader2 } from "lucide-react";

function Index() {
  const { profile, loading } = useAuth();
  
  const { 
    teams, 
    members, 
    updates, 
    teamStatuses,
    isLoading: oracleLoading, 
    submitUpdate, 
    queryRAG, 
    ragResponse, 
    ragLoading
  } = useOracle(profile?.role || 'guest');

  if (loading || oracleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cosmic cosmic-sparkle">
        <div className="text-center space-y-6 p-8 ufo-card rounded-xl">
          <div className="ufo-pulse">
            <svg width="120" height="120" viewBox="0 0 100 100" fill="currentColor" className="text-primary mx-auto">
              <ellipse cx="50" cy="60" rx="35" ry="15" opacity="0.6"/>
              <ellipse cx="50" cy="45" rx="25" ry="20"/>
              <circle cx="40" cy="40" r="3" fill="white" opacity="0.8"/>
              <circle cx="50" cy="38" r="4" fill="white"/>
              <circle cx="60" cy="40" r="3" fill="white" opacity="0.8"/>
            </svg>
          </div>
          <h2 className="text-3xl font-semibold cosmic-text">Initializing PieFi Oracle...</h2>
          <p className="text-muted-foreground text-lg high-contrast-text">Connecting to your personalized dashboard</p>
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  // Render dashboard based on user's role
  const renderDashboard = () => {
    switch (profile?.role) {
      case 'lead':
        return <LeadDashboardEnhanced />;
        
      case 'mentor':
        return (
          <MentorDashboard 
            teams={teams || []}
            members={members || []}
            updates={updates || []}
            teamStatuses={teamStatuses}
            selectedRole="mentor"
            mentorId={profile.id}
            onExit={() => {}}
          />
        );
        
      case 'builder':
        // If builder has a team, show enhanced dashboard
        if (profile.team_id && teams?.find(t => t.id === profile.team_id)) {
          const team = teams.find(t => t.id === profile.team_id)!;
          return (
            <EnhancedBuilderDashboard
              team={team}
              builderName={profile.full_name || 'Builder'}
              members={members || []}
              updates={updates || []}
              teamStatuses={teamStatuses}
              onSubmitUpdate={(teamId: string, content: string, type: any, createdBy?: string) => 
                submitUpdate({ teamId, content, type, createdBy })
              }
              onQueryRAG={(params: { query: string; role: any }) => 
                queryRAG(params)
              }
              ragResponse={ragResponse}
              ragLoading={ragLoading}
              onLeaveTeam={() => {}}
            />
          );
        }
        // Fall through to guest dashboard if no team
        
      case 'guest':
      default:
        return (
          <GuestDashboard 
            teams={teams || []}
            updates={updates || []}
            onExit={() => {}}
          />
        );
    }
  };

  return renderDashboard();
}

export default Index;