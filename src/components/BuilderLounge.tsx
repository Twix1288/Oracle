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
  teamId?: string;
}

interface BuilderConversation {
  id: string;
  title: string;
  content: string;
  participants: string[];
  creator_id: string;
  created_at: string;
  embedding_vector?: string;
}

export function BuilderLounge({ userId, teamId }: BuilderLoungeProps) {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<BuilderConversation[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState<Record<string, { user: string; role: UserRole; online_at: string }[]>>({});

  const onlineCount = useMemo(() => Object.values(online).reduce((acc, arr) => acc + arr.length, 0), [online]);

  useEffect(() => {
    const load = async () => {
      let query = supabase
        .from('builder_conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Filter by team if provided, otherwise show global builder lounge
      if (teamId) {
        query = query.eq('team_id', teamId);
      } else {
        query = query.is('team_id', null);
      }

      const { data, error } = await query;
      if (!error) setConversations(data as BuilderConversation[]);
    };
    load();

    const channelName = teamId ? `builder-lounge-${teamId}` : 'builder-lounge-global';
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'builder_conversations',
        filter: teamId ? `team_id=eq.${teamId}` : 'team_id=is.null'
      }, (payload) => {
        const conversation = payload.new as BuilderConversation;
        setConversations((prev) => [conversation, ...prev]);
      })
      .subscribe();

    const presenceChannelName = teamId ? `presence:builder-lounge-${teamId}` : 'presence:builder-lounge-global';
    const presence = supabase
      .channel(presenceChannelName, { config: { presence: { key: userId } } })
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
  }, [userId, teamId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const payload = {
        title: `Message from Builder`,
        content: text.trim(),
        participants: teamId ? [] : [],
        creator_id: userId,
      };
      const { error } = await supabase.from('builder_conversations').insert([payload]);
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
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> 
            {teamId ? 'Team Builder Chat' : 'Global Builder Lounge'}
          </span>
          <Badge variant="outline" className="text-xs">
            <Satellite className="h-3 w-3 mr-1" /> {onlineCount} online
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
          {conversations.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No messages yet. Say hello to fellow builders!
            </div>
          ) : (
            conversations.map((conversation) => (
              <div key={conversation.id} className="p-3 rounded-lg bg-background/30 border border-primary/10">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-2xs">Builder</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(conversation.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap">{conversation.content}</div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder={teamId ? "Share updates with your team..." : "Share knowledge, wins, or questions with all builders..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[96px] bg-background/50 border-primary/20 focus:border-primary/40"
          />
          <div className="flex justify-end">
            <Button onClick={send} disabled={sending || !text.trim()} className="ufo-gradient hover:opacity-90">
              <Send className="h-4 w-4 mr-2" /> 
              {teamId ? 'Send to Team' : 'Send to All Builders'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
