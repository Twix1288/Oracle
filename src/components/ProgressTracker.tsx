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
import { useToast } from "@/hooks/use-toast";
import type { Team, TeamStage, Update, UserRole } from "@/types/oracle";

interface ProgressTrackerProps {
  team: Team;
  updates: Update[];
  userRole: UserRole;
  onStageUpdate?: (newStage: TeamStage) => void;
}

interface OracleStageRecommendation {
  currentStage: TeamStage;
  recommendedStage: TeamStage;
  confidence: number;
  reasoning: string;
  shouldAdvance: boolean;
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
  const [isGettingRecommendation, setIsGettingRecommendation] = useState(false);
  const [oracleRecommendation, setOracleRecommendation] = useState<OracleStageRecommendation | null>(null);
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

  // Calculate progress based on updates and AI analysis with real-time updates
  useEffect(() => {
    const analyzeProgress = async () => {
      console.log('🔍 Analyzing progress for team:', team.name, 'Current stage:', team.stage);
      
      const stageUpdates = updates.filter(update => update.team_id === team.id);
      const recentUpdates = stageUpdates.slice(0, 20);
      const veryRecentUpdates = stageUpdates.filter(u => new Date(u.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const progressEstimates: Record<TeamStage, number> = {
        ideation: 100, // Always complete if past this stage
        development: 0,
        testing: 0,
        launch: 0,
        growth: 0
      };

      // Mark completed stages as 100%
      stages.forEach((stage, index) => {
        if (index < currentStageIndex) {
          progressEstimates[stage.key] = 100;
        } else if (index === currentStageIndex) {
          // Current stage gets realistic progress based on activity
          const activityScore = Math.min(100, 
            (recentUpdates.length * 5) + 
            (veryRecentUpdates.length * 10) + 
            (Math.min(30, new Date().getTime() - new Date(team.created_at).getTime()) / (1000 * 60 * 60 * 24)) // Days since team creation
          );
          
          // More realistic progress calculation
          let stageProgress = Math.max(5, Math.min(95, activityScore));
          
          // Stage-specific adjustments
          if (stage.key === 'development') {
            const developmentKeywords = ['build', 'code', 'feature', 'mvp', 'prototype', 'implement'];
            const devUpdates = recentUpdates.filter(u => 
              developmentKeywords.some(keyword => u.content.toLowerCase().includes(keyword))
            );
            stageProgress = Math.max(10, Math.min(90, (devUpdates.length * 12) + (veryRecentUpdates.length * 8)));
          }
          
          progressEstimates[stage.key] = stageProgress;
        }
      });

      console.log('📊 Progress estimates:', progressEstimates);
      setStageProgress(progressEstimates);
    };

    analyzeProgress();
  }, [team, updates, currentStageIndex]);

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

  const getOracleStageRecommendation = async () => {
    setIsGettingRecommendation(true);
    try {
      const { data, error } = await supabase.functions.invoke('unified-oracle', {
        body: {
          query: `Analyze our team progress and recommend if we should advance from ${team.stage} stage. Recent updates: ${updates.slice(0, 10).map(u => u.content).join('. ')}`,
          role: userRole,
          teamId: team.id,
          action: 'stage_assessment'
        }
      });

      if (error) throw error;

      const recommendation: OracleStageRecommendation = {
        currentStage: team.stage,
        recommendedStage: data.recommendedStage || team.stage,
        confidence: data.confidence || 0.7,
        reasoning: data.reasoning || 'Analysis based on recent team activity',
        shouldAdvance: data.shouldAdvance || false
      };

      setOracleRecommendation(recommendation);
      
      toast({
        title: recommendation.shouldAdvance ? "🚀 Ready to Advance!" : "📊 Stage Analysis Complete",
        description: recommendation.reasoning,
      });

    } catch (error) {
      console.error('Oracle recommendation error:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to get Oracle recommendation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGettingRecommendation(false);
    }
  };

  const canAdvanceStage = () => {
    return (
      userRole === 'lead' || 
      userRole === 'mentor' ||
      userRole === 'builder'
    ) && currentStageIndex < stages.length - 1;
  };

  const getStageStatus = (stageKey: TeamStage) => {
    const stageIndex = stages.findIndex(stage => stage.key === stageKey);
    if (stageIndex < currentStageIndex) return 'completed';
    if (stageIndex === currentStageIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="space-y-6">
      {/* Current Stage Card - Enhanced Visual Design */}
      <Card className="glow-border bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-sm border-primary/30 overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-xl ${colorMap[currentStage.color].bg} ${colorMap[currentStage.color].border} border-2 shadow-lg`}>
                <currentStage.icon className={`h-8 w-8 ${colorMap[currentStage.color].text}`} />
              </div>
              <div>
                <h3 className="text-2xl font-bold cosmic-text mb-1">{currentStage.title}</h3>
                <p className="text-muted-foreground text-lg">{currentStage.description}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold cosmic-text mb-1">
                {Math.round(stageProgress[currentStage.key])}%
              </div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium cosmic-text">Stage Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round(stageProgress[currentStage.key])}%</span>
            </div>
            <Progress 
              value={stageProgress[currentStage.key]} 
              className="h-3 glow-border"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {currentStage.metrics.map((metric, index) => (
              <div key={index} className="text-center p-3 bg-background/50 rounded-lg border border-primary/20">
                <div className="text-sm font-medium cosmic-text">{metric}</div>
                <div className="text-xs text-muted-foreground mt-1">In Progress</div>
              </div>
            ))}
          </div>

          {/* Oracle Recommendation */}
          {oracleRecommendation && (
            <div className={`p-4 rounded-lg border-2 mb-4 ${
              oracleRecommendation.shouldAdvance 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-blue-500/10 border-blue-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className={`h-4 w-4 ${
                  oracleRecommendation.shouldAdvance ? 'text-green-400' : 'text-blue-400'
                }`} />
                <span className={`font-medium text-sm ${
                  oracleRecommendation.shouldAdvance ? 'text-green-400' : 'text-blue-400'
                }`}>
                  Oracle Assessment ({Math.round(oracleRecommendation.confidence * 100)}% confidence)
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{oracleRecommendation.reasoning}</p>
              {oracleRecommendation.shouldAdvance && (
                <div className="text-sm font-medium text-green-400">
                  ✨ Recommended: Advance to {stages[currentStageIndex + 1]?.title}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={getOracleStageRecommendation}
              disabled={isGettingRecommendation}
              variant="outline"
              className="text-sm py-3"
            >
              {isGettingRecommendation ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get Oracle Assessment
                </>
              )}
            </Button>
            
            {canAdvanceStage() && currentStageIndex < stages.length - 1 && (
              <Button
                onClick={handleAdvanceStage}
                disabled={isUpdating}
                className="ufo-gradient text-sm py-3 cosmic-sparkle-hover"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Advancing...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Advance to {stages[currentStageIndex + 1]?.title}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline View - Enhanced */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            5-Stage Development Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stages.map((stage, index) => {
              const status = getStageStatus(stage.key);
              const isActive = stage.key === team.stage;
              const progress = stageProgress[stage.key] || 0;
              
              return (
                <div key={stage.key} className="relative">
                  <div className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 ${
                    isActive 
                      ? `${colorMap[stage.color].bg} ${colorMap[stage.color].border} shadow-lg transform scale-[1.02]`
                      : status === 'completed' 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : 'bg-background/30 border-muted hover:border-primary/20'
                  }`}>
                    
                    {/* Stage Icon */}
                    <div className={`p-3 rounded-lg border-2 ${
                      isActive 
                        ? `${colorMap[stage.color].border} ${colorMap[stage.color].bg}`
                        : status === 'completed'
                          ? 'border-green-500/30 bg-green-500/20'
                          : 'border-muted bg-background/50'
                    }`}>
                      {status === 'completed' ? (
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      ) : (
                        <stage.icon className={`h-6 w-6 ${
                          isActive ? colorMap[stage.color].text : 'text-muted-foreground'
                        }`} />
                      )}
                    </div>

                    {/* Stage Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-bold text-lg ${isActive ? 'cosmic-text' : ''}`}>
                          {stage.title}
                        </h4>
                        {isActive && (
                          <Badge variant="outline" className={colorMap[stage.color].badge}>
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {stage.description}
                      </p>
                      
                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium">Progress</span>
                          <span className="text-xs">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </div>

                    {/* Stage Number */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isActive 
                        ? `${colorMap[stage.color].bg} ${colorMap[stage.color].text} border-2 ${colorMap[stage.color].border}`
                        : status === 'completed'
                          ? 'bg-green-500/20 text-green-400 border-2 border-green-500/30'
                          : 'bg-background text-muted-foreground border-2 border-muted'
                    }`}>
                      {index + 1}
                    </div>
                  </div>

                  {/* Connecting Line */}
                  {index < stages.length - 1 && (
                    <div className="ml-8 h-6 w-0.5 bg-gradient-to-b from-primary/50 to-muted"></div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Oracle Insights */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Oracle Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm">
                <span className="font-medium text-blue-400">🛸 Oracle Analysis:</span> 
                {' '}Team {team.name} is progressing well through the {currentStage.title} stage. 
                Recent activity shows {updates.slice(0, 5).length} updates in the development pipeline.
              </p>
            </div>
            
            {currentStageIndex < stages.length - 1 && (
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
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