import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LinkIcon, UnlinkIcon, CheckIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Profile {
  discord_id?: string;
  full_name?: string;
}

interface LinkResponse {
  success: boolean;
  message?: string;
  discord_username?: string;
  error?: string;
}

export const DiscordLinkManager = () => {
  const [linkCode, setLinkCode] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('discord_id, full_name')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    }
  });

  const linkMutation = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('link_discord_account', {
        p_link_code: code
      });
      
      if (error) throw error;
      return data as unknown as LinkResponse;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast({
          title: "Discord Account Linked!",
          description: `Successfully linked Discord account: ${data.discord_username}`,
        });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        setLinkCode("");
      } else {
        toast({
          variant: "destructive",
          title: "Link Failed",
          description: data?.error || "Unknown error occurred",
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to link Discord account. Please try again.",
      });
      console.error('Link error:', error);
    }
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ discord_id: null })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Discord Account Unlinked",
        description: "Your Discord account has been unlinked from your profile.",
      });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unlink Discord account. Please try again.",
      });
      console.error('Unlink error:', error);
    }
  });

  const handleLink = () => {
    if (!linkCode.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Code",
        description: "Please enter a linking code from Discord.",
      });
      return;
    }
    linkMutation.mutate(linkCode.trim().toUpperCase());
  };

  if (isLoading) {
    return <div>Loading Discord link status...</div>;
  }

  const isLinked = !!profile?.discord_id;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Discord Integration
        </CardTitle>
        <CardDescription>
          Link your Discord account to access bot features and sync your profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLinked ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckIcon className="h-4 w-4 text-green-500" />
              <Badge variant="secondary" className="text-green-700 bg-green-100">
                Discord Linked
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Your Discord account is connected! You can now use all bot commands and features.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => unlinkMutation.mutate()}
              disabled={unlinkMutation.isPending}
              className="w-full"
            >
              <UnlinkIcon className="h-4 w-4 mr-2" />
              {unlinkMutation.isPending ? "Unlinking..." : "Unlink Discord"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Badge variant="outline" className="text-orange-700 bg-orange-50">
                Not Linked
              </Badge>
              <p className="text-sm text-muted-foreground">
                To link your Discord account:
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>1. Join our Discord server</li>
                <li>2. Use <code className="bg-muted px-1 rounded">/link</code> command</li>
                <li>3. Enter the code provided below</li>
              </ol>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="linkCode" className="text-sm font-medium">
                Link Code from Discord
              </label>
              <div className="flex gap-2">
                <Input
                  id="linkCode"
                  placeholder="Enter 6-character code"
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="uppercase"
                />
                <Button
                  onClick={handleLink}
                  disabled={linkMutation.isPending || !linkCode.trim()}
                >
                  {linkMutation.isPending ? "Linking..." : "Link"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};