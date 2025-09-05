import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Home, ArrowLeft, X, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { LogoutButton } from "@/components/LogoutButton";
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
      case 'guest': return 'Guest';
      default: return role;
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border mb-6">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                PieFi Oracle - {getRoleLabel(role)} Dashboard
              </h1>
              <div className="flex items-center gap-6 mt-1">
                {userName && (
                  <span className="text-sm text-muted-foreground">
                    Welcome, <span className="font-medium text-foreground">{userName}</span>
                  </span>
                )}
                {teamName && (
                  <span className="text-sm text-muted-foreground">
                    Team: <span className="font-medium text-foreground">{teamName}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {onHome && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onHome}
                className="bg-background hover:bg-muted/50 border-border"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Menu
              </Button>
            )}
            
            <Button 
              onClick={onExit}
              variant="outline"
              size="sm"
              className="bg-background hover:bg-muted/50 border-border"
            >
              <X className="w-4 h-4 mr-2" />
              Exit Dashboard
            </Button>
            
            <LogoutButton showDropdown />
          </div>
        </div>
      </div>
    </div>
  );
};