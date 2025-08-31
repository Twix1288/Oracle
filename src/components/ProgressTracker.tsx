import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Lightbulb, 
  Target, 
  Users, 
  Rocket, 
  TrendingUp, 
  CheckCircle,
  Circle,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import type { Team, TeamStage, Update, UserRole } from "@/types/oracle";

interface ProgressTrackerProps {
  team: Team;
  updates: Update[];
  userRole: UserRole;
  onStageUpdate?: (newStage: TeamStage) => void;
}

const stages: { 
  key: TeamStage; 
  title: string; 
  description: string; 
  icon: any;
  color: string;
  metrics: string[];
}[] = [
  {
    key: 'ideation',
    title: '🧠 Brainstorm',
    description: 'Define and validate your concept',
    icon: Lightbulb,
    color: 'purple',
    metrics: ['Problem validation', 'Market research', 'Initial concept']
  },
  {
    key: 'development',
    title: '🛠 Prototype Creation',
    description: 'Build your MVP and core features',
    icon: Target,
    color: 'blue',
    metrics: ['MVP features', 'Technical stack', 'User flow design']
  },
  {
    key: 'testing',
    title: '🧪 Final Product',
    description: 'Test, refine, and polish',
    icon: Users,
    color: 'green',
    metrics: ['User testing', 'Bug fixes', 'Feature refinement']
  },
  {
    key: 'launch',
    title: '🚀 Marketing',
    description: 'Prepare for launch and user acquisition',
    icon: Rocket,
    color: 'orange',
    metrics: ['Marketing strategy', 'Launch campaign', 'User acquisition']
  },
  {
    key: 'growth',
    title: '📈 Real Company',
    description: 'Scale and grow your business',
    icon: TrendingUp,
    color: 'pink',
    metrics: ['Revenue growth', 'Team expansion', 'Market scaling']
  }
];

const colorMap = {
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  },
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/20',
    badge: 'bg-green-500/20 text-green-300 border-green-500/30'
  },
  orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/20',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
  },
  pink: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    border: 'border-pink-500/20',
    badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
  }
};

export const ProgressTracker = ({ team, updates, userRole, onStageUpdate }: ProgressTrackerProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [stageProgress, setStageProgress] = useState<Record<TeamStage, number>>({
    ideation: 0,
    development: 0,
    testing: 0,
    launch: 0,
    growth: 0
  });

  const { toast } = useToast();

  const currentStageIndex = stages.findIndex(stage => stage.key === team.stage);
  const currentStage = stages[currentStageIndex];

  // Calculate progress based on updates and AI analysis
  useEffect(() => {
    const analyzeProgress = async () => {
      // Simple heuristic analysis - in production, this would use the Oracle's NLP
      const stageUpdates = updates.filter(update => update.team_id === team.id);
      const recentUpdates = stageUpdates.slice(0, 10);
      
      const progressEstimates: Record<TeamStage, number> = {
        ideation: 100, // Always complete if past this stage
        development: team.stage === 'ideation' ? 0 : Math.min(100, recentUpdates.length * 10),
        testing: ['ideation', 'development'].includes(team.stage) ? 0 : Math.min(100, recentUpdates.length * 8),
        launch: ['ideation', 'development', 'testing'].includes(team.stage) ? 0 : Math.min(100, recentUpdates.length * 6),
        growth: team.stage === 'growth' ? Math.min(100, recentUpdates.length * 5) : 0
      };

      // Mark completed stages as 100%
      stages.forEach((stage, index) => {
        if (index < currentStageIndex) {
          progressEstimates[stage.key] = 100;
        }
      });

      setStageProgress(progressEstimates);
    };

    analyzeProgress();
  }, [updates, team.stage, currentStageIndex]);

  const handleAdvanceStage = async () => {
    if (currentStageIndex >= stages.length - 1) return;
    
    setIsUpdating(true);
    try {
      const nextStage = stages[currentStageIndex + 1];
      
      const { error } = await supabase
        .from('teams')
        .update({ stage: nextStage.key })
        .eq('id', team.id);

      if (error) throw error;

      // Log milestone update
      await supabase.from('updates').insert({
        team_id: team.id,
        content: `🎉 Advanced to ${nextStage.title} stage! Ready to ${nextStage.description.toLowerCase()}.`,
        type: 'milestone',
        created_by: `${userRole}_user`
      });

      toast({
        title: "🚀 Stage Advanced!",
        description: `Team has progressed to ${nextStage.title}`,
      });

      onStageUpdate?.(nextStage.key);
    } catch (error) {
      console.error('Stage update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to advance stage. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const canAdvanceStage = () => {
    return (
      userRole === 'lead' || 
      userRole === 'mentor'
    ) && currentStageIndex < stages.length - 1;
  };

  const getStageStatus = (stageIndex: number) => {
    if (stageIndex < currentStageIndex) return 'completed';
    if (stageIndex === currentStageIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="space-y-6">
      {/* Current Stage Header */}
      <Card className="glow-border bg-gradient-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${colorMap[currentStage.color].bg}`}>
                <currentStage.icon className={`h-6 w-6 ${colorMap[currentStage.color].text}`} />
              </div>
              <div>
                <CardTitle className="text-xl text-glow">{currentStage.title}</CardTitle>
                <p className="text-muted-foreground">{currentStage.description}</p>
              </div>
            </div>
            {canAdvanceStage() && (
              <Button
                onClick={handleAdvanceStage}
                disabled={isUpdating}
                className="ufo-gradient hover:opacity-90"
              >
                {isUpdating ? "Updating..." : "Advance Stage"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Stage Progress</span>
              <span>{Math.round(stageProgress[currentStage.key])}%</span>
            </div>
            <Progress value={stageProgress[currentStage.key]} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Key Metrics:</p>
            <div className="flex flex-wrap gap-2">
              {currentStage.metrics.map((metric, index) => (
                <Badge 
                  key={index}
                  className={colorMap[currentStage.color].badge}
                >
                  {metric}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Timeline */}
      <Card className="glow-border bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            5-Stage Development Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stages.map((stage, index) => {
              const status = getStageStatus(index);
              const colors = colorMap[stage.color];
              const Icon = stage.icon;
              const progress = stageProgress[stage.key];

              return (
                <div key={stage.key} className="relative">
                  <div className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                    status === 'current' 
                      ? `${colors.bg} ${colors.border}` 
                      : status === 'completed'
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-muted/30 border-border'
                  }`}>
                    
                    {/* Stage Icon & Status */}
                    <div className="flex items-center gap-3">
                      {status === 'completed' ? (
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      ) : status === 'current' ? (
                        <div className={`p-2 rounded-full ${colors.bg}`}>
                          <Icon className={`h-4 w-4 ${colors.text}`} />
                        </div>
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                      
                      <div className="flex-1">
                        <h4 className={`font-semibold ${
                          status === 'current' ? colors.text : 
                          status === 'completed' ? 'text-green-400' : 
                          'text-muted-foreground'
                        }`}>
                          {stage.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">{stage.description}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {status !== 'upcoming' && (
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-muted-foreground">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1" />
                      </div>
                    )}
                  </div>

                  {/* Connection Line */}
                  {index < stages.length - 1 && (
                    <div className="absolute left-7 top-full h-4 w-0.5 bg-border" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stage Insights */}
      <Card className="glow-border bg-card/50">
        <CardHeader>
          <CardTitle>Oracle Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm">
                <span className="font-medium text-blue-400">🛸 Oracle Analysis:</span> 
                {' '}Team {team.name} is progressing well through the {currentStage.title} stage. 
                Recent activity shows {updates.slice(0, 5).length} updates in the development pipeline.
              </p>
            </div>
            
            {currentStageIndex < stages.length - 1 && (
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm">
                  <span className="font-medium text-purple-400">🔮 Next Stage Preview:</span>
                  {' '}Preparing for {stages[currentStageIndex + 1].title} - {stages[currentStageIndex + 1].description.toLowerCase()}.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};