import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, Users, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/types/oracle";

interface MessagingCenterProps {
  role: UserRole;
  userId?: string;
  teamId?: string;
}

interface Message {
  id: string;
  sender_role: UserRole;
  receiver_role: UserRole;
  sender_id?: string;
  receiver_id?: string;
  team_id?: string;
  content: string;
  read_at?: string;
  created_at: string;
}

export const MessagingCenter = ({ role, userId, teamId }: MessagingCenterProps) => {
  const [newMessage, setNewMessage] = useState({
    receiver_role: 'mentor' as UserRole,
    receiver_id: '',
    content: ''
  });
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', role, userId, teamId],
    queryFn: async () => {
      let query = supabase.from('messages').select('*').order('created_at', { ascending: false });
      
      // Filter based on role and access
      if (role === 'builder' && teamId) {
        query = query.eq('team_id', teamId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Message[];
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          sender_role: role,
          sender_id: userId,
          team_id: teamId,
          ...messageData
        }]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setNewMessage({ receiver_role: 'mentor', receiver_id: '', content: '' });
    },
  });

  const handleSendMessage = () => {
    if (newMessage.content.trim()) {
      sendMessageMutation.mutate(newMessage);
    }
  };

  const getRoleColor = (userRole: UserRole) => {
    switch (userRole) {
      case 'lead': return 'bg-purple-500/20 text-purple-300';
      case 'mentor': return 'bg-green-500/20 text-green-300';
      case 'builder': return 'bg-blue-500/20 text-blue-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const canSendTo = (receiverRole: UserRole) => {
    if (role === 'lead') return true;
    if (role === 'mentor') return ['builder', 'lead'].includes(receiverRole);
    if (role === 'builder') return ['mentor', 'lead'].includes(receiverRole);
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/20">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Communication Center</h2>
          <p className="text-muted-foreground">Connect with your team and mentors</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Message */}
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">To:</label>
              <Select 
                value={newMessage.receiver_role} 
                onValueChange={(value: UserRole) => setNewMessage(prev => ({ ...prev, receiver_role: value }))}
              >
                <SelectTrigger className="bg-background/50 border-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {role !== 'lead' && canSendTo('lead') && (
                    <SelectItem value="lead">Lead</SelectItem>
                  )}
                  {role !== 'mentor' && canSendTo('mentor') && (
                    <SelectItem value="mentor">Mentor</SelectItem>
                  )}
                  {role !== 'builder' && canSendTo('builder') && (
                    <SelectItem value="builder">Builder</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message:</label>
              <Textarea
                value={newMessage.content}
                onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Type your message..."
                className="bg-background/50 border-primary/20 min-h-[100px]"
              />
            </div>

            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.content.trim() || sendMessageMutation.isPending}
              className="w-full ufo-gradient"
            >
              {sendMessageMutation.isPending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card className="glow-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Recent Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-muted-foreground">No messages yet</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {messages.slice(0, 10).map((message) => (
                  <div 
                    key={message.id} 
                    className="p-3 rounded-lg bg-background/30 border border-primary/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleColor(message.sender_role)} variant="outline">
                          {message.sender_role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">→</span>
                        <Badge className={getRoleColor(message.receiver_role)} variant="outline">
                          {message.receiver_role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(message.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};