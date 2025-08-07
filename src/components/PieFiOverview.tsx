import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, RefreshCcw, User, LogOut, LineChart, Target, ClipboardList } from "lucide-react";
import type { Team, Update } from "@/types/oracle";

interface PieFiOverviewProps {
  team: Team;
  builderName: string;
  updates: Update[];
  onPopulateJourney?: () => void;
  isPopulating?: boolean;
}

export function PieFiOverview({ team, builderName, updates, onPopulateJourney, isPopulating }: PieFiOverviewProps) {
  const recentUpdates = updates.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-glow flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Welcome back, {builderName}!
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/20 text-primary border-primary/30 capitalize">{team.stage} Stage</Badge>
            <Badge variant="outline">{updates.length} updates</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="glass-button"><RefreshCcw className="h-4 w-4 mr-2"/>Refresh Dashboard</Button>
          <Button className="ufo-gradient" onClick={onPopulateJourney} disabled={isPopulating}>
            <ClipboardList className="h-4 w-4 mr-2"/>{isPopulating ? "Populating..." : "Populate Journey"}
          </Button>
          <Button variant="outline" className="glass-button"><User className="h-4 w-4 mr-2"/>Profile</Button>
          <Button variant="destructive"><LogOut className="h-4 w-4 mr-2"/>Sign Out</Button>
        </div>
      </div>

      {/* Overview + Dev Journey */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glow-border bg-card/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5"/>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border">
                <p className="text-sm readable-muted">Stage Progress</p>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={100} className="w-32"/>
                  <span className="text-lg font-semibold">100%</span>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border">
                <p className="text-sm readable-muted">Confidence</p>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={100} className="w-32"/>
                  <span className="text-lg font-semibold">100%</span>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border">
                <p className="text-sm readable-muted">Track</p>
                <div className="mt-2 font-medium capitalize">builder</div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold">AI Coach</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Build exactly for PieFi’s operators and teams—focus on validated, painful problems.</li>
                <li>Tie each feature to a concrete accelerator workflow and evidence.</li>
                <li>Prefer user-tested flows over assumptions. Ship, test, iterate.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-border bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5"/>Dev Journey</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">Stage 2 — First Build</span>
              <Badge variant="outline">Current Focus</Badge>
            </div>
            <div>
              <p className="font-medium">Recommended Next Actions</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Complete user_testing and prototype_validation</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Milestone Achievements</p>
              <ul className="list-disc pl-5">
                <li>MVP Designed — Approved (~1h ago)</li>
                <li>Technical Challenges — Approved (~1h ago)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Updates */}
      <Card className="glow-border bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5"/>Recent Updates</CardTitle>
        </CardHeader>
        <CardContent>
          {recentUpdates.length === 0 ? (
            <p className="text-muted-foreground">No updates yet. Share your progress to get AI coaching.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentUpdates.map(upd => (
                <div key={upd.id} className="p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="capitalize">{upd.type}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(upd.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm">{upd.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
