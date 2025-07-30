import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Home, ArrowLeft } from "lucide-react";
import type { UserRole } from "@/types/oracle";

interface DashboardHeaderProps {
  role: UserRole;
  userName?: string;
  teamName?: string;
  onExit: () => void;
  onHome?: () => void;
}

export const DashboardHeader = ({ role, userName, teamName, onExit, onHome }: DashboardHeaderProps) => {
  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'builder': return 'Builder';
      case 'mentor': return 'Mentor';
      case 'lead': return 'Lead';
      case 'guest': return 'Guest';
      default: return role;
    }
  };

  return (
    <Card className="professional-border card-professional mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl text-professional">
                PieFi Oracle - {getRoleLabel(role)} Dashboard
              </CardTitle>
              <div className="flex items-center gap-4 mt-1">
                {userName && (
                  <span className="readable-text text-sm">
                    Welcome, <span className="font-medium text-foreground">{userName}</span>
                  </span>
                )}
                {teamName && (
                  <span className="readable-text text-sm">
                    Team: <span className="font-medium text-foreground">{teamName}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onHome && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onHome}
                className="professional-border hover:bg-muted/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExit}
              className="professional-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Exit Dashboard
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};