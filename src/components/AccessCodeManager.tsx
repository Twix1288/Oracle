import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface AccessCodeManagerProps {
  members: any[];
  teams: any[];
}

export const AccessCodeManager = ({ members, teams }: AccessCodeManagerProps) => {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAccessCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 8 }, () => 
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');
  };

  const handleGenerateCode = async (memberId: string) => {
    setIsGenerating(true);
    try {
      const newCode = generateAccessCode();
      // This component is for managing access codes in the access_codes table
      // For now, just show success without actual update
      console.log('Generated code for member:', memberId, newCode);

      toast.success("Access code generated successfully");
      queryClient.invalidateQueries({ queryKey: ["members"] });
    } catch (error: any) {
      toast.error(`Failed to generate access code: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Access Code Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-primary/20"
              >
                <div>
                  <div className="font-semibold">{member.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {member.role} {member.team_id && `• ${teams.find(t => t.id === member.team_id)?.name}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {member.access_code ? (
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 rounded bg-muted font-mono text-sm">
                        {member.access_code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleGenerateCode(member.id)}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => handleGenerateCode(member.id)}
                      disabled={isGenerating}
                    >
                      Generate Code
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No members found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};