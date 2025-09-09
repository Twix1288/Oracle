import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ButtonTest = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const testDatabaseConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .limit(1);
      
      if (error) throw error;
      
      toast({
        title: "Database Connected!",
        description: `Found ${data?.length || 0} profiles in database.`,
      });
    } catch (error) {
      console.error('Database test error:', error);
      toast({
        title: "Database Error",
        description: "Failed to connect to database.",
        variant: "destructive"
      });
    }
  };

  const testCreateChallenge = async () => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in first.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('builder_challenges')
        .insert([{
          title: 'Test Challenge',
          description: 'This is a test challenge created by the button test.',
          challenge_type: 'test',
          target_metric: 1,
          current_progress: 0,
          reward_points: 10,
          user_id: user.id,
          week_assigned: new Date().toISOString().split('T')[0],
          oracle_generated: false,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Challenge Created!",
        description: `Challenge "${data.title}" created successfully.`,
      });
    } catch (error) {
      console.error('Challenge creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create challenge.",
        variant: "destructive"
      });
    }
  };

  const testCreateProgressEntry = async () => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in first.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('progress_entries')
        .insert([{
          title: 'Test Progress Entry',
          description: 'This is a test progress entry created by the button test.',
          category: 'test',
          status: 'in_progress',
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Progress Entry Created!",
        description: `Progress entry "${data.title}" created successfully.`,
      });
    } catch (error) {
      console.error('Progress entry creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create progress entry.",
        variant: "destructive"
      });
    }
  };

  const testCreateWorkshop = async () => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in first.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('workshops')
        .insert([{
          title: 'Test Workshop',
          description: 'This is a test workshop created by the button test.',
          host_id: user.id,
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          duration_minutes: 60,
          max_attendees: 10,
          status: 'scheduled',
          attendees: [],
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Workshop Created!",
        description: `Workshop "${data.title}" created successfully.`,
      });
    } catch (error) {
      console.error('Workshop creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create workshop.",
        variant: "destructive"
      });
    }
  };

  const testCreateSkillOffer = async () => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in first.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('skill_offers')
        .insert([{
          skill: 'Test Skill',
          description: 'This is a test skill offer created by the button test.',
          availability: 'Test availability',
          owner_id: user.id,
          status: 'active',
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Skill Offer Created!",
        description: `Skill offer "${data.skill}" created successfully.`,
      });
    } catch (error) {
      console.error('Skill offer creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create skill offer.",
        variant: "destructive"
      });
    }
  };

  const testCreateMessage = async () => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in first.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          sender_id: user.id,
          receiver_id: user.id, // Send to self for test
          content: 'This is a test message created by the button test.',
          sender_role: 'builder',
          receiver_role: 'builder',
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Message Created!",
        description: `Message sent successfully.`,
      });
    } catch (error) {
      console.error('Message creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create message.",
        variant: "destructive"
      });
    }
  };

  const testCreateNotification = async () => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "Please log in first.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'test',
          title: 'Test Notification',
          message: 'This is a test notification created by the button test.',
          data: { source: 'button_test' },
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Notification Created!",
        description: `Notification "${data.title}" created successfully.`,
      });
    } catch (error) {
      console.error('Notification creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create notification.",
        variant: "destructive"
      });
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Please log in to test the buttons.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Button Functionality Test</h1>
      <p className="text-muted-foreground">Test all the database operations to ensure they work correctly.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Database Connection</CardTitle>
            <CardDescription>Test basic database connectivity</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testDatabaseConnection} className="w-full">
              Test Connection
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Challenge</CardTitle>
            <CardDescription>Test builder_challenges table</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testCreateChallenge} className="w-full">
              Create Test Challenge
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Progress Entry</CardTitle>
            <CardDescription>Test progress_entries table</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testCreateProgressEntry} className="w-full">
              Create Test Progress
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Workshop</CardTitle>
            <CardDescription>Test workshops table</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testCreateWorkshop} className="w-full">
              Create Test Workshop
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Skill Offer</CardTitle>
            <CardDescription>Test skill_offers table</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testCreateSkillOffer} className="w-full">
              Create Test Skill
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Message</CardTitle>
            <CardDescription>Test messages table</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testCreateMessage} className="w-full">
              Create Test Message
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Notification</CardTitle>
            <CardDescription>Test notifications table</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testCreateNotification} className="w-full">
              Create Test Notification
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
