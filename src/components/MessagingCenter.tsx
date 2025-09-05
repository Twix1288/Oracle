import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Send, 
  Users, 
  Radio,
  Eye,
  Clock,
  User,
  Sparkles
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/oracle";

interface Message {
  id: string;
  sender_id: string;
  sender_role: UserRole;
  receiver_id?: string;
  receiver_role: UserRole;
  team_id?: string;
  content: string;
  read_at?: string;
  created_at: string;
}

interface MessagingCenterProps {
  userRole: UserRole;
  accessCode: string; // Using access code as user ID for clarity
  teamId?: string;
}

const roleColors = {
  builder: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  mentor: 'bg-green-500/10 text-green-400 border-green-500/20',
  lead: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  guest: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
};

export const MessagingCenter = ({ userRole, accessCode, teamId }: MessagingCenterProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("inbox");
  const { toast } = useToast();

  // New message form
  const [newMessage, setNewMessage] = useState({
    receiverId: "",
    receiverRole: "mentor" as UserRole,
    content: "",
    isBroadcast: false
  });

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to real-time message updates
    const channel = supabase
      .channel('message-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (shouldReceiveMessage(newMsg)) {
            setMessages(prev => [newMsg, ...prev]);
            
            // Show toast for new messages
            if (newMsg.sender_id !== accessCode) {
              toast({
                title: "New Message",
                description: `From ${newMsg.sender_role}: ${newMsg.content.slice(0, 50)}...`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accessCode, userRole, teamId]);

  const shouldReceiveMessage = (message: Message) => {
    // Check if this user should receive the message based on role and team
    return (
      message.receiver_id === accessCode ||
      message.receiver_role === userRole ||
      (message.team_id === teamId && !message.receiver_id) // Team broadcasts
    );
  };

  const fetchMessages = async () => {
    try {
      // Fetch messages where user is sender or receiver
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${accessCode},receiver_id.eq.${accessCode},and(receiver_id.is.null,receiver_role.eq.${userRole})`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.content.trim()) return;
    
    setIsLoading(true);
    try {
      const messageData = {
        sender_id: accessCode, // Using access code as sender ID
        sender_role: userRole,
        content: newMessage.content,
        receiver_role: newMessage.receiverRole,
        ...(newMessage.isBroadcast ? {} : { receiver_id: newMessage.receiverId }),
        ...(teamId && { team_id: teamId })
      };

      const { error } = await supabase
        .from('messages')
        .insert([messageData]);

      if (error) throw error;

      toast({
        title: "Message Sent",
        description: newMessage.isBroadcast 
          ? `Broadcast sent to all ${newMessage.receiverRole}s`
          : `Message sent to ${newMessage.receiverRole}`,
      });

      setNewMessage({
        receiverId: "",
        receiverRole: "mentor",
        content: "",
        isBroadcast: false
      });

      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Send Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, read_at: new Date().toISOString() }
            : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const canSendMessages = () => {
    return userRole === 'mentor' || userRole === 'builder';
  };

  const canBroadcast = () => {
    return userRole === 'mentor';
  };

  const receivedMessages = messages.filter(msg => 
    msg.receiver_id === accessCode || 
    msg.receiver_role === userRole ||
    (msg.team_id === teamId && !msg.receiver_id)
  );

  const sentMessages = messages.filter(msg => msg.sender_id === accessCode);

  const renderMessage = (message: Message) => (
    <Card key={message.id} className={`glow-border ${
      !message.read_at && message.sender_id !== accessCode 
        ? 'bg-primary/5 border-primary/30' 
        : 'bg-card/50'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              {message.sender_id === accessCode ? <Send className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {message.sender_id === accessCode ? 'You' : `${message.sender_id}`}
                </span>
                <Badge className={roleColors[message.sender_role]}>
                  {message.sender_role}
                </Badge>
                {message.receiver_id ? (
                  <span className="text-xs text-muted-foreground">
                    → {message.receiver_role}
                  </span>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <Radio className="h-3 w-3 mr-1" />
                    Broadcast
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(message.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          
          {!message.read_at && message.sender_id !== accessCode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAsRead(message.id)}
              className="text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Mark Read
            </Button>
          )}
        </div>

        <p className="text-sm leading-relaxed">{message.content}</p>

        {message.read_at && message.sender_id === accessCode && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            Read {new Date(message.read_at).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/20 ufo-pulse">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-glow">Team Communication</h2>
          <p className="text-muted-foreground">Connect with mentors, leads, and team members</p>
        </div>
        <Badge className="bg-primary/20 text-primary border-primary/30">
          {userRole} Access
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur border-primary/20">
          <TabsTrigger value="inbox" className="data-[state=active]:bg-primary/20">
            <MessageSquare className="h-4 w-4 mr-2" />
            Inbox ({receivedMessages.filter(m => !m.read_at).length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="data-[state=active]:bg-primary/20">
            <Send className="h-4 w-4 mr-2" />
            Sent
          </TabsTrigger>
          {canSendMessages() && (
            <TabsTrigger value="compose" className="data-[state=active]:bg-primary/20">
              <Sparkles className="h-4 w-4 mr-2" />
              Compose
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          {receivedMessages.length === 0 ? (
            <Card className="glow-border bg-card/50">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                <p className="text-muted-foreground">Your inbox is empty. Messages from mentors and team members will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {receivedMessages.map(renderMessage)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sentMessages.length === 0 ? (
            <Card className="glow-border bg-card/50">
              <CardContent className="p-8 text-center">
                <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sent messages</h3>
                <p className="text-muted-foreground">Messages you send will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sentMessages.map(renderMessage)}
            </div>
          )}
        </TabsContent>

        {canSendMessages() && (
          <TabsContent value="compose">
            <Card className="glow-border bg-card/50">
              <CardHeader>
                <CardTitle>Send Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Send To</label>
                    <select
                      value={newMessage.receiverRole}
                      onChange={(e) => setNewMessage({ ...newMessage, receiverRole: e.target.value as UserRole })}
                      className="w-full p-3 rounded-lg bg-background border border-border focus:border-primary/50"
                    >
                      <option value="builder">All Builders</option>
                      <option value="mentor">All Mentors</option>
                      <option value="lead">All Leads</option>
                      <option value="guest">All Guests</option>
                    </select>
                  </div>

                  {!newMessage.isBroadcast && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Specific Person (Optional)</label>
                      <Input
                        placeholder="Leave blank for all, or enter name/code"
                        value={newMessage.receiverId}
                        onChange={(e) => setNewMessage({ ...newMessage, receiverId: e.target.value })}
                        className="bg-background/50 border-border focus:border-primary/50"
                      />
                    </div>
                  )}
                </div>

                {canBroadcast() && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="broadcast"
                      checked={newMessage.isBroadcast}
                      onChange={(e) => setNewMessage({ ...newMessage, isBroadcast: e.target.checked })}
                      className="rounded border-border"
                    />
                    <label htmlFor="broadcast" className="text-sm font-medium">
                      Send as broadcast to all {newMessage.receiverRole}s
                    </label>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage.content}
                    onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                    className="min-h-[120px] bg-background/50 border-border focus:border-primary/50"
                  />
                </div>

                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !newMessage.content.trim()}
                  className="w-full ufo-gradient hover:opacity-90"
                >
                  {isLoading ? (
                    <Clock className="h-4 w-4 mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {newMessage.isBroadcast ? 'Send Broadcast' : 'Send Message'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};