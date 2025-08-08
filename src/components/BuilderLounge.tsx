import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/oracle";
import { Users, Send, Satellite } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface BuilderLoungeProps {
  userId: string;
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

export function BuilderLounge({ userId }: BuilderLoungeProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState<Record<string, { user: string; role: UserRole; online_at: string }[]>>({});

  const onlineCount = useMemo(() => Object.values(online).reduce((acc, arr) => acc + arr.length, 0), [online]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .is('team_id', null)
        .eq('receiver_role', 'builder')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error) setMessages(data as Message[]);
    };
    load();

    const channel = supabase
      .channel('builder-lounge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'receiver_role=eq.builder' }, (payload) => {
        const m = payload.new as Message;
        if (!m.team_id && m.receiver_role === 'builder') {
          setMessages((prev) => [m, ...prev]);
        }
      })
      .subscribe();

    const presence = supabase
      .channel('presence:builder-lounge', { config: { presence: { key: userId } } })
      .on('presence', { event: 'sync' }, () => setOnline(presence.presenceState()))
      .on('presence', { event: 'join' }, () => setOnline(presence.presenceState()))
      .on('presence', { event: 'leave' }, () => setOnline(presence.presenceState()))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presence.track({ user: userId, role: 'builder' as UserRole, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presence);
    };
  }, [userId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const payload = {
        sender_id: userId,
        sender_role: 'builder' as UserRole,
        receiver_id: null,
        receiver_role: 'builder' as UserRole,
        content: text.trim(),
        team_id: null,
      };
      const { error } = await supabase.from('messages').insert([payload]);
      if (error) throw error;
      setText("");
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
          <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Builder Lounge</span>
          <Badge variant="outline" className="text-xs"><Satellite className="h-3 w-3 mr-1" /> {onlineCount} online</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
          {messages.length === 0 ? (
            <div className="text-sm text-muted-foreground">No messages yet. Say hello to fellow builders!</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="p-3 rounded-lg bg-background/30 border border-primary/10">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-2xs capitalize">{m.sender_role}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <div className="text-sm whitespace-pre-wrap">{m.content}</div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="Share knowledge, wins, or questions with all builders..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[96px] bg-background/50 border-primary/20 focus:border-primary/40"
          />
          <div className="flex justify-end">
            <Button onClick={send} disabled={sending || !text.trim()} className="ufo-gradient hover:opacity-90">
              <Send className="h-4 w-4 mr-2" /> Send to Builders
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
