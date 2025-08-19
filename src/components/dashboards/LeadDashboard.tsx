import { LeadDashboardEnhanced } from "../LeadDashboardEnhanced";
import { DashboardHeader } from "@/components/DashboardHeader";
import type { Team, Member, Update, UserRole } from "@/types/oracle";

interface LeadDashboardProps {
  teams: Team[];
  members: Member[];
  updates: Update[];
  teamStatuses: any[];
  selectedRole: UserRole;
  onExit: () => void;
}

export const LeadDashboard = ({ onExit }: LeadDashboardProps) => {
  return (
    <>
      <DashboardHeader 
        role="lead" 
        onExit={onExit}
      />
      <div className="container mx-auto px-6 pb-6">
        <LeadDashboardEnhanced />
      </div>
    </>
  );
};