import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { 
  Plus, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Target,
  TrendingUp,
  AlertCircle,
  Trophy,
  Calendar,
  Sparkles
} from "lucide-react";
import type { Team } from "@/types/oracle";

interface ProgressEntry {
  id: string;
  team_id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: 'milestone' | 'daily' | 'weekly' | 'blocker' | 'achievement';
  status: 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  ai_feedback: string | null;
  ai_suggestions: any | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ProgressEntryManagerProps {
  team: Team;
  userId: string;
}

const categoryIcons = {
  milestone: Target,
  daily: Clock,
  weekly: Calendar,
  blocker: AlertCircle,
  achievement: Trophy
};

const statusColors = {
  in_progress: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  completed: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  blocked: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  cancelled: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' }
};

export function ProgressEntryManager({ team, userId }: ProgressEntryManagerProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'daily' as const,
    due_date: ''
  });

  useEffect(() => {
    loadEntries();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`progress-entries-${team.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'progress_entries',
        filter: `team_id=eq.${team.id}`
      }, () => {
        loadEntries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [team.id]);

  const loadEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('progress_entries')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data as ProgressEntry[]);
    } catch (error) {
      console.error('Failed to load progress entries:', error);
      toast({ title: 'Error', description: 'Failed to load progress entries', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const createEntry = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        team_id: team.id,
        user_id: userId,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        due_date: formData.due_date || null,
        status: 'in_progress' as const
      };

      const { error } = await supabase
        .from('progress_entries')
        .insert([payload]);

      if (error) throw error;

      // Reset form
      setFormData({ title: '', description: '', category: 'daily', due_date: '' });
      setShowAddForm(false);
      
      toast({ title: 'Success', description: 'Progress entry created!' });
    } catch (error) {
      console.error('Failed to create entry:', error);
      toast({ title: 'Error', description: 'Failed to create progress entry', variant: 'destructive' });
    }
  };

  const updateEntryStatus = async (entryId: string, newStatus: ProgressEntry['status']) => {
    try {
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('progress_entries')
        .update(updateData)
        .eq('id', entryId);

      if (error) throw error;

      toast({ 
        title: 'Updated', 
        description: `Progress entry marked as ${newStatus.replace('_', ' ')}` 
      });
    } catch (error) {
      console.error('Failed to update entry:', error);
      toast({ title: 'Error', description: 'Failed to update progress entry', variant: 'destructive' });
    }
  };

  const getAiFeedback = async (entryId: string) => {
    try {
      const entry = entries.find(e => e.id === entryId);
      if (!entry) return;

      const { data, error } = await supabase.functions.invoke('super-oracle', {
        body: { 
          type: 'progress_feedback',
          entry: entry,
          team: team,
          role: 'builder'
        }
      });

      if (error) throw error;

      // Update the entry with AI feedback
      await supabase
        .from('progress_entries')
        .update({ 
          ai_feedback: data.feedback,
          ai_suggestions: data.suggestions 
        })
        .eq('id', entryId);

      toast({ title: 'AI Analysis Complete', description: 'Got intelligent feedback on your progress!' });
    } catch (error) {
      console.error('Failed to get AI feedback:', error);
      toast({ title: 'Error', description: 'Failed to get AI feedback', variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-4">Loading progress entries...</div>;

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <Card className="glow-border bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Progress Tracking
            </CardTitle>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="ufo-gradient"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </CardHeader>

        {showAddForm && (
          <CardContent className="border-t">
            <div className="space-y-4">
              <Input
                placeholder="What are you working on?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              
              <Textarea
                placeholder="Describe your progress, challenges, or achievements..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="min-h-[80px]"
              />

              <div className="grid grid-cols-2 gap-4">
                <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily Update</SelectItem>
                    <SelectItem value="weekly">Weekly Summary</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="blocker">Blocker/Issue</SelectItem>
                    <SelectItem value="achievement">Achievement</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={createEntry} className="ufo-gradient">
                  Create Entry
                </Button>
                <Button 
                  onClick={() => setShowAddForm(false)} 
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Progress Entries */}
      <div className="space-y-4">
        {entries.length === 0 ? (
          <Card className="glow-border bg-card/50 backdrop-blur">
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                No progress entries yet. Start tracking your journey!
              </div>
            </CardContent>
          </Card>
        ) : (
          entries.map((entry) => {
            const Icon = categoryIcons[entry.category];
            const statusColor = statusColors[entry.status];
            
            return (
              <Card key={entry.id} className={`glow-border bg-card/50 backdrop-blur border-l-4 ${statusColor.border}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`h-4 w-4 ${statusColor.text}`} />
                        <h3 className="font-semibold text-lg">{entry.title}</h3>
                        <Badge variant="outline" className={`${statusColor.bg} ${statusColor.text}`}>
                          {entry.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {entry.category}
                        </Badge>
                      </div>

                      {entry.description && (
                        <p className="text-muted-foreground mb-3 whitespace-pre-wrap">
                          {entry.description}
                        </p>
                      )}

                      {entry.ai_feedback && (
                        <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-blue-400" />
                            <span className="text-sm font-medium text-blue-400">AI Insights</span>
                          </div>
                          <p className="text-sm">{entry.ai_feedback}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>Created: {new Date(entry.created_at).toLocaleDateString()}</span>
                        {entry.due_date && (
                          <span>Due: {new Date(entry.due_date).toLocaleDateString()}</span>
                        )}
                        {entry.completed_at && (
                          <span>Completed: {new Date(entry.completed_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      {entry.status === 'in_progress' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateEntryStatus(entry.id, 'completed')}
                            className="text-green-400 border-green-500/20 hover:bg-green-500/10"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateEntryStatus(entry.id, 'blocked')}
                            className="text-red-400 border-red-500/20 hover:bg-red-500/10"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      {!entry.ai_feedback && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => getAiFeedback(entry.id)}
                          className="text-blue-400 border-blue-500/20 hover:bg-blue-500/10"
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}