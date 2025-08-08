import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/oracle";
import { AlertTriangle, Eye, CheckCircle2 } from "lucide-react";

interface MentorRequestsProps {
  mentorId?: string;
  assignedTeamIds: string[];
}

interface Message {
  id: string;
  sender_id: string;
  sender_role: UserRole;
  receiver_id?: string | null;
  receiver_role: UserRole;
  team_id?: string | null;
  content: string;
  read_at?: string | null;
  created_at: string;
}

export function MentorRequests({ mentorId, assignedTeamIds }: MentorRequestsProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('receiver_role', 'mentor')
        .in('team_id', assignedTeamIds.length ? assignedTeamIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error) setMessages((data || []).filter((m) => m.content?.startsWith('[REQUEST]')) as Message[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('mentor-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'receiver_role=eq.mentor' }, (payload) => {
        const m = payload.new as Message;
        if (m.team_id && assignedTeamIds.includes(m.team_id) && m.content?.startsWith('[REQUEST]')) {
          setMessages((prev) => [m, ...prev]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [assignedTeamIds.join('|')]);

  const markRead = async (id: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read_at: new Date().toISOString() } : m)));
    await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', id);
  };

  return (
    <Card className="glow-border bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" /> Mentor Requests
          <Badge variant="outline" className="ml-2 text-xs">{messages.filter((m) => !m.read_at).length} unread</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">No requests yet.</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="p-3 rounded-lg bg-background/30 border border-primary/10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-2xs capitalize">{m.sender_role}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                </div>
                {m.read_at ? (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-2xs flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/>Handled</Badge>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => markRead(m.id)} className="text-xs">
                    <Eye className="h-3 w-3 mr-1"/> Mark read
                  </Button>
                )}
              </div>
              <div className="text-sm whitespace-pre-wrap">{m.content}</div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
