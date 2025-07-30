import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Building2, Users, Calendar, MapPin, Sparkles } from "lucide-react";
import type { Team } from "@/types/oracle";

interface TeamProfileCardProps {
  team: Team;
  builderName: string;
  teamMemberCount: number;
  onLeaveTeam?: () => void;
}

// Generate team-specific colors based on team name
const generateTeamColors = (teamName: string) => {
  const colors = [
    { primary: "bg-blue-500/20 text-blue-300 border-blue-500/30", accent: "text-blue-400" },
    { primary: "bg-green-500/20 text-green-300 border-green-500/30", accent: "text-green-400" },
    { primary: "bg-purple-500/20 text-purple-300 border-purple-500/30", accent: "text-purple-400" },
    { primary: "bg-orange-500/20 text-orange-300 border-orange-500/30", accent: "text-orange-400" },
    { primary: "bg-pink-500/20 text-pink-300 border-pink-500/30", accent: "text-pink-400" },
    { primary: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", accent: "text-cyan-400" },
    { primary: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", accent: "text-yellow-400" },
    { primary: "bg-red-500/20 text-red-300 border-red-500/30", accent: "text-red-400" },
  ];
  
  const hash = teamName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
};

export const TeamProfileCard = ({ team, builderName, teamMemberCount, onLeaveTeam }: TeamProfileCardProps) => {
  const teamColors = generateTeamColors(team.name);
  const teamInitials = team.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Card className={`glow-border bg-card/80 backdrop-blur-sm ${teamColors.primary}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className={`${teamColors.primary} font-bold text-lg`}>
              {teamInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">Team Profile</h3>
            <p className="text-sm text-muted-foreground">Your current assignment</p>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Team Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Building2 className={`w-5 h-5 ${teamColors.accent}`} />
            <div>
              <p className="font-medium">{team.name}</p>
              <p className="text-sm text-muted-foreground">Team Name</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Sparkles className={`w-5 h-5 ${teamColors.accent}`} />
            <div>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                {team.stage}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">Current Stage</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Users className={`w-5 h-5 ${teamColors.accent}`} />
            <div>
              <p className="font-medium">{teamMemberCount} Members</p>
              <p className="text-sm text-muted-foreground">Team Size</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <MapPin className={`w-5 h-5 ${teamColors.accent}`} />
            <div>
              <p className="font-medium">{builderName}</p>
              <p className="text-sm text-muted-foreground">Your Role: Builder</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Calendar className={`w-5 h-5 ${teamColors.accent}`} />
            <div>
              <p className="font-medium">{new Date(team.created_at).toLocaleDateString()}</p>
              <p className="text-sm text-muted-foreground">Team Created</p>
            </div>
          </div>
        </div>
        
        {/* Team Description */}
        {team.description && (
          <div className="p-3 rounded-lg bg-background/30 border border-primary/10">
            <p className="text-sm leading-relaxed">{team.description}</p>
          </div>
        )}
        
        {/* Tags */}
        {team.tags && team.tags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Focus Areas:</p>
            <div className="flex flex-wrap gap-2">
              {team.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-primary/5 border-primary/20">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Leave Team Warning */}
        {onLeaveTeam && (
          <div className="pt-3 border-t border-primary/10">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLeaveTeam}
              className="w-full text-destructive hover:text-destructive hover:border-destructive/50"
            >
              Leave Team Session
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              You'll need a new access code to rejoin
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};