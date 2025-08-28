import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TrendingUp, Target, CheckCircle, Clock, ArrowRight, Sparkles, Brain } from "lucide-react";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  stage: string;
  description?: string;
}

const STAGES = [
  { id: 'ideation', name: 'Ideation', order: 1, color: 'bg-blue-500/20 text-blue-300' },
  { id: 'validation', name: 'Validation', order: 2, color: 'bg-purple-500/20 text-purple-300' },
  { id: 'development', name: 'Development', order: 3, color: 'bg-orange-500/20 text-orange-300' },
  { id: 'launch', name: 'Launch', order: 4, color: 'bg-green-500/20 text-green-300' },
  { id: 'growth', name: 'Growth', order: 5, color: 'bg-pink-500/20 text-pink-300' },
  { id: 'scale', name: 'Scale', order: 6, color: 'bg-yellow-500/20 text-yellow-300' }
];

export const StageTracker = () => {
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [newStage, setNewStage] = useState<string>("");
  const [stageNote, setStageNote] = useState<string>("");
  const [isDetecting, setIsDetecting] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teams-with-stage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, stage, description')
        .order('name');
      
      if (error) throw error;
      return data as Team[];
    }
  });

  // Update team stage
  const updateStageMutation = useMutation({
    mutationFn: async ({ teamId, stage, note }: { teamId: string, stage: string, note?: string }) => {
      const { error } = await supabase
        .from('teams')
        .update({ 
          stage: stage as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId);
      
      if (error) throw error;

      // Add stage update log
      if (note) {
        await supabase
          .from('updates')
          .insert({
            team_id: teamId,
            type: 'daily' as any,
            content: `Stage updated to ${stage}: ${note}`,
            created_by: (await supabase.auth.getUser()).data.user?.id
          });
      }
    },
    onSuccess: () => {
      toast.success('Team stage updated successfully');
      queryClient.invalidateQueries({ queryKey: ['teams-with-stage'] });
      setSelectedTeam("");
      setNewStage("");
      setStageNote("");
    },
    onError: (error) => {
      toast.error('Failed to update stage: ' + error.message);
    }
  });

  // AI Stage Detection
  const detectStageMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const team = teams.find(t => t.id === teamId);
      if (!team) throw new Error('Team not found');

      // Get recent team updates for context
      const { data: updates } = await supabase
        .from('updates')
        .select('content, type, created_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(10);

      const context = updates?.map(u => `${u.type}: ${u.content}`).join('\n') || '';
      
      const { data, error } = await supabase.functions.invoke('enhanced-oracle', {
        body: {
          query: `Analyze this team's progress and suggest their current stage. Team: ${team.name}, Description: ${team.description}, Recent updates: ${context}`,
          role: 'lead',
          teamId,
          detectStage: true
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.detected_stage) {
        setNewStage(data.detected_stage);
        toast.success(`AI detected stage: ${data.detected_stage}`);
      }
    },
    onError: (error) => {
      toast.error('Failed to detect stage: ' + error.message);
    }
  });

  const handleStageUpdate = () => {
    if (!selectedTeam || !newStage) return;
    
    updateStageMutation.mutate({
      teamId: selectedTeam,
      stage: newStage,
      note: stageNote
    });
  };

  const handleAIDetection = (teamId: string) => {
    setIsDetecting(true);
    detectStageMutation.mutate(teamId, {
      onSettled: () => setIsDetecting(false)
    });
  };

  const getStageProgress = (currentStage: string) => {
    const stage = STAGES.find(s => s.id === currentStage);
    return stage ? (stage.order / STAGES.length) * 100 : 0;
  };

  const getStageInfo = (stageId: string) => {
    return STAGES.find(s => s.id === stageId) || STAGES[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Stage Tracking</h2>
        <Badge variant="outline" className="text-primary">
          AI Powered
        </Badge>
      </div>

      {/* Team Stage Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => {
          const stageInfo = getStageInfo(team.stage);
          const progress = getStageProgress(team.stage);
          
          return (
            <Card key={team.id} className="bg-card/50 backdrop-blur border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAIDetection(team.id)}
                    disabled={isDetecting}
                    className="h-6 w-6 p-0"
                  >
                    {isDetecting ? (
                      <Sparkles className="h-3 w-3 animate-spin" />
                    ) : (
                      <Brain className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <Badge variant="outline" className={`w-fit ${stageInfo.color}`}>
                  {stageInfo.name}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTeam(team.id)}
                    className="w-full"
                  >
                    <Target className="h-3 w-3 mr-1" />
                    Update Stage
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stage Update Form */}
      {selectedTeam && (
        <Card className="bg-card/50 backdrop-blur border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Update Team Stage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue />
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
              
              <div className="space-y-2">
                <Label>New Stage</Label>
                <Select value={newStage} onValueChange={setNewStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${stage.color.split(' ')[0]}`} />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Stage Update Notes (Optional)</Label>
              <Textarea
                value={stageNote}
                onChange={(e) => setStageNote(e.target.value)}
                placeholder="Describe the progress or reason for stage change..."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTeam("");
                  setNewStage("");
                  setStageNote("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStageUpdate}
                disabled={!newStage || updateStageMutation.isPending}
                className="flex-1"
              >
                {updateStageMutation.isPending ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Stage
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage Progress Visualization */}
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Journey Stages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {STAGES.map((stage, index) => (
              <div key={stage.id} className="flex items-center">
                <div className="flex flex-col items-center space-y-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${stage.color}`}>
                    {index + 1}
                  </div>
                  <div className="text-xs font-medium text-center">{stage.name}</div>
                </div>
                {index < STAGES.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};