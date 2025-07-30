import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Users, Target } from "lucide-react";
import { format } from "date-fns";
import type { Update, Team, UserRole, UpdateType } from "@/types/oracle";

interface ProgressTrackerProps {
  updates: Update[];
  teams: Team[];
  onSubmitUpdate: (teamId: string, content: string, type: UpdateType, createdBy?: string) => void;
  selectedRole: UserRole;
}

const updateTypeColors = {
  daily: "bg-blue-500/10 text-blue-700 border-blue-200",
  milestone: "bg-green-500/10 text-green-700 border-green-200",
  mentor_meeting: "bg-purple-500/10 text-purple-700 border-purple-200"
};

const stageColors = {
  ideation: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  development: "bg-blue-500/10 text-blue-700 border-blue-200",
  testing: "bg-orange-500/10 text-orange-700 border-orange-200",
  launch: "bg-green-500/10 text-green-700 border-green-200",
  growth: "bg-purple-500/10 text-purple-700 border-purple-200"
};

export const ProgressTracker = ({ updates, teams, onSubmitUpdate, selectedRole }: ProgressTrackerProps) => {
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [newUpdate, setNewUpdate] = useState({ content: "", type: "daily" as UpdateType, teamId: "", createdBy: "" });

  const handleSubmit = () => {
    if (newUpdate.content && newUpdate.teamId) {
      onSubmitUpdate(newUpdate.teamId, newUpdate.content, newUpdate.type, newUpdate.createdBy || undefined);
      setNewUpdate({ content: "", type: "daily", teamId: "", createdBy: "" });
      setShowUpdateForm(false);
    }
  };

  const canSubmitUpdates = selectedRole === 'builder' || selectedRole === 'mentor' || selectedRole === 'lead';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Target className="h-6 w-6" />
          Progress Tracker
        </h2>
        {canSubmitUpdates && (
          <Button onClick={() => setShowUpdateForm(!showUpdateForm)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Update
          </Button>
        )}
      </div>

      {showUpdateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Submit New Update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={newUpdate.teamId} onValueChange={(value) => setNewUpdate(prev => ({ ...prev, teamId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={newUpdate.type} onValueChange={(value: UpdateType) => setNewUpdate(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Update</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="mentor_meeting">Mentor Meeting</SelectItem>
                </SelectContent>
              </Select>

              <input
                type="text"
                placeholder="Your name (optional)"
                value={newUpdate.createdBy}
                onChange={(e) => setNewUpdate(prev => ({ ...prev, createdBy: e.target.value }))}
                className="px-3 py-2 border rounded-md text-sm"
              />
            </div>

            <Textarea
              placeholder="Describe your progress, blockers, or achievements..."
              value={newUpdate.content}
              onChange={(e) => setNewUpdate(prev => ({ ...prev, content: e.target.value }))}
              rows={3}
            />

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={!newUpdate.content || !newUpdate.teamId}>
                Submit Update
              </Button>
              <Button variant="outline" onClick={() => setShowUpdateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Updates */}
      <div className="grid gap-4">
        {updates?.map(update => (
          <Card key={update.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {update.teams?.name || 'Unknown Team'}
                    </Badge>
                    <Badge className={updateTypeColors[update.type]} variant="outline">
                      {update.type.replace('_', ' ')}
                    </Badge>
                    {update.teams?.stage && (
                      <Badge className={stageColors[update.teams.stage]} variant="outline">
                        {update.teams.stage}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm leading-relaxed">{update.content}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(update.created_at), 'MMM d, yyyy at h:mm a')}
                    </span>
                    {update.created_by && (
                      <span>by {update.created_by}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {updates?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No progress updates yet. {canSubmitUpdates ? 'Be the first to add one!' : 'Check back later for updates.'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};