import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/oracle";
import { Users, Send, Radio, Satellite, UserCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface TeamRoomProps {
  teamId: string;
  teamName?: string;
  userRole: UserRole;
  userId: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender_role: UserRole;
  receiver_id?: string | null;
  receiver_role?: UserRole | null;
  team_id?: string | null;
  content: string;
  read_at?: string | null;
  created_at: string;
}

export function TeamRoom({ teamId, teamName, userRole, userId }: TeamRoomProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [requestMentor, setRequestMentor] = useState(false);
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState<Record<string, { user: string; role: UserRole; online_at: string }[]>>({});

  const onlineCount = useMemo(() => {
    return Object.values(online).reduce((acc, arr) => acc + arr.length, 0);
  }, [online]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error) setMessages(data as Message[]);
    };
    load();

    const channel = supabase
      .channel(`team-room-${teamId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `team_id=eq.${teamId}` }, (payload) => {
        setMessages((prev) => [payload.new as Message, ...prev]);
      })
      .subscribe();

    const presence = supabase
      .channel(`presence:team-${teamId}`, { config: { presence: { key: userId } } })
      .on('presence', { event: 'sync' }, () => {
        setOnline(presence.presenceState());
      })
      .on('presence', { event: 'join' }, () => setOnline(presence.presenceState()))
      .on('presence', { event: 'leave' }, () => setOnline(presence.presenceState()))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presence.track({ user: userId, role: userRole, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presence);
    };
  }, [teamId, userId, userRole]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const payload = {
        sender_id: userId,
        sender_role: userRole,
        receiver_id: null,
        receiver_role: (requestMentor ? 'mentor' : 'builder') as UserRole,
        content: requestMentor ? `[REQUEST] ${text.trim()}` : text.trim(),
        team_id: teamId,
      };

      const { error } = await supabase.from('messages').insert([payload]);
      if (error) throw error;
      setText("");
      setRequestMentor(false);
    } catch (e: any) {
      toast({ title: 'Send failed', description: e?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="glow-border bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Team Room {teamName ? `· ${teamName}` : ''}</span>
          <Badge variant="outline" className="text-xs">
            <Satellite className="h-3 w-3 mr-1" /> {onlineCount} online
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
          {messages.length === 0 ? (
            <div className="text-sm text-muted-foreground">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="p-3 rounded-lg bg-background/30 border border-primary/10">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-2xs capitalize">{m.sender_role}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                  {m.content.startsWith('[REQUEST]') && (
                    <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-2xs">Mentor Request</Badge>
                  )}
                </div>
                <div className="text-sm whitespace-pre-wrap">{m.content}</div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="Share an update or ask a question to your team..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[96px] bg-background/50 border-primary/20 focus:border-primary/40"
          />
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={requestMentor}
                onChange={(e) => setRequestMentor(e.target.checked)}
                className="rounded border-border"
              />
              <span className="flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-primary" /> Request mentor feedback
              </span>
            </label>
            <Button onClick={send} disabled={sending || !text.trim()} className="ufo-gradient hover:opacity-90">
              <Send className="h-4 w-4 mr-2" /> Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
