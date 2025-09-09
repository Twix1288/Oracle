import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2, Database, Users, MessageSquare, Target, Calendar, Sparkles } from 'lucide-react';

interface TestResult {
  operation: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  timestamp: string;
}

export const ComprehensiveTest = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Add a test result
  const addTestResult = (operation: string, status: 'pending' | 'success' | 'error', message: string) => {
    const result: TestResult = {
      operation,
      status,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [result, ...prev]);
  };

  // Test database connection
  const testConnection = async () => {
    addTestResult('Database Connection', 'pending', 'Testing connection...');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .limit(1);
      
      if (error) throw error;
      addTestResult('Database Connection', 'success', `Connected! Found ${data?.length || 0} profiles.`);
    } catch (error: any) {
      addTestResult('Database Connection', 'error', `Failed: ${error.message}`);
    }
  };

  // Test builder challenges
  const testBuilderChallenges = async () => {
    addTestResult('Builder Challenges', 'pending', 'Creating challenge...');
    try {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('builder_challenges')
        .insert([{
          title: 'Test Challenge - Comprehensive Test',
          description: 'This is a test challenge created during comprehensive testing.',
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
      addTestResult('Builder Challenges', 'success', `Challenge "${data.title}" created successfully.`);
    } catch (error: any) {
      addTestResult('Builder Challenges', 'error', `Failed: ${error.message}`);
    }
  };

  // Test progress entries
  const testProgressEntries = async () => {
    addTestResult('Progress Entries', 'pending', 'Creating progress entry...');
    try {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('progress_entries')
        .insert([{
          title: 'Test Progress Entry - Comprehensive Test',
          description: 'This is a test progress entry created during comprehensive testing.',
          category: 'test',
          status: 'in_progress',
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      addTestResult('Progress Entries', 'success', `Progress entry "${data.title}" created successfully.`);
    } catch (error: any) {
      addTestResult('Progress Entries', 'error', `Failed: ${error.message}`);
    }
  };

  // Test workshops
  const testWorkshops = async () => {
    addTestResult('Workshops', 'pending', 'Creating workshop...');
    try {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('workshops')
        .insert([{
          title: 'Test Workshop - Comprehensive Test',
          description: 'This is a test workshop created during comprehensive testing.',
          host_id: user.id,
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 60,
          max_attendees: 10,
          status: 'scheduled',
          attendees: [],
        }])
        .select()
        .single();

      if (error) throw error;
      addTestResult('Workshops', 'success', `Workshop "${data.title}" created successfully.`);
    } catch (error: any) {
      addTestResult('Workshops', 'error', `Failed: ${error.message}`);
    }
  };

  // Test skill offers
  const testSkillOffers = async () => {
    addTestResult('Skill Offers', 'pending', 'Creating skill offer...');
    try {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('skill_offers')
        .insert([{
          skill: 'Test Skill - Comprehensive Test',
          description: 'This is a test skill offer created during comprehensive testing.',
          availability: 'Test availability',
          owner_id: user.id,
          status: 'active',
        }])
        .select()
        .single();

      if (error) throw error;
      addTestResult('Skill Offers', 'success', `Skill offer "${data.skill}" created successfully.`);
    } catch (error: any) {
      addTestResult('Skill Offers', 'error', `Failed: ${error.message}`);
    }
  };

  // Test messages
  const testMessages = async () => {
    addTestResult('Messages', 'pending', 'Creating message...');
    try {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          sender_id: user.id,
          receiver_id: user.id,
          content: 'This is a test message created during comprehensive testing.',
          sender_role: 'builder',
          receiver_role: 'builder',
        }])
        .select()
        .single();

      if (error) throw error;
      addTestResult('Messages', 'success', `Message created successfully.`);
    } catch (error: any) {
      addTestResult('Messages', 'error', `Failed: ${error.message}`);
    }
  };

  // Test notifications
  const testNotifications = async () => {
    addTestResult('Notifications', 'pending', 'Creating notification...');
    try {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'test',
          title: 'Test Notification - Comprehensive Test',
          message: 'This is a test notification created during comprehensive testing.',
          data: { source: 'comprehensive_test' },
        }])
        .select()
        .single();

      if (error) throw error;
      addTestResult('Notifications', 'success', `Notification "${data.title}" created successfully.`);
    } catch (error: any) {
      addTestResult('Notifications', 'error', `Failed: ${error.message}`);
    }
  };

  // Test collaboration proposals
  const testCollaborationProposals = async () => {
    addTestResult('Collaboration Proposals', 'pending', 'Creating collaboration proposal...');
    try {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('collaboration_proposals')
        .insert([{
          proposer_id: user.id,
          target_id: user.id,
          proposal_type: 'test',
          title: 'Test Collaboration Proposal - Comprehensive Test',
          description: 'This is a test collaboration proposal created during comprehensive testing.',
          timeline: 'Test timeline',
          deliverables: ['Test deliverable 1', 'Test deliverable 2'],
          status: 'pending',
        }])
        .select()
        .single();

      if (error) throw error;
      addTestResult('Collaboration Proposals', 'success', `Collaboration proposal "${data.title}" created successfully.`);
    } catch (error: any) {
      addTestResult('Collaboration Proposals', 'error', `Failed: ${error.message}`);
    }
  };

  // Test project interests
  const testProjectInterests = async () => {
    addTestResult('Project Interests', 'pending', 'Creating project interest...');
    try {
      if (!user?.id) throw new Error('User not authenticated');
      
      // First, get a team to express interest in
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id')
        .limit(1);

      if (teamsError) throw teamsError;
      
      if (!teams || teams.length === 0) {
        addTestResult('Project Interests', 'error', 'No teams found to express interest in.');
        return;
      }

      const { data, error } = await supabase
        .from('project_interests')
        .insert([{
          project_id: teams[0].id,
          user_id: user.id,
          status: 'pending',
          message: 'This is a test project interest created during comprehensive testing.',
        }])
        .select()
        .single();

      if (error) throw error;
      addTestResult('Project Interests', 'success', `Project interest created successfully.`);
    } catch (error: any) {
      addTestResult('Project Interests', 'error', `Failed: ${error.message}`);
    }
  };

  // Test connection requests
  const testConnectionRequests = async () => {
    addTestResult('Connection Requests', 'pending', 'Creating connection request...');
    try {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('connection_requests')
        .insert([{
          requester_id: user.id,
          requested_id: user.id, // Self-request for test
          request_type: 'test',
          message: 'This is a test connection request created during comprehensive testing.',
          oracle_generated: false,
          status: 'pending',
        }])
        .select()
        .single();

      if (error) throw error;
      addTestResult('Connection Requests', 'success', `Connection request created successfully.`);
    } catch (error: any) {
      addTestResult('Connection Requests', 'error', `Failed: ${error.message}`);
    }
  };

  // Test feed interactions
  const testFeedInteractions = async () => {
    addTestResult('Feed Interactions', 'pending', 'Creating feed interaction...');
    try {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('feed_interactions')
        .insert([{
          user_id: user.id,
          feed_item_id: 'test-feed-item',
          feed_item_type: 'test',
          interaction_type: 'test',
          body: 'This is a test feed interaction created during comprehensive testing.',
        }])
        .select()
        .single();

      if (error) throw error;
      addTestResult('Feed Interactions', 'success', `Feed interaction created successfully.`);
    } catch (error: any) {
      addTestResult('Feed Interactions', 'error', `Failed: ${error.message}`);
    }
  };

  // Test project updates
  const testProjectUpdates = async () => {
    addTestResult('Project Updates', 'pending', 'Creating project update...');
    try {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('project_updates')
        .insert([{
          user_id: user.id,
          content: 'This is a test project update created during comprehensive testing.',
          update_type: 'test',
          visibility: 'public',
          oracle_processed: false,
        }])
        .select()
        .single();

      if (error) throw error;
      addTestResult('Project Updates', 'success', `Project update created successfully.`);
    } catch (error: any) {
      addTestResult('Project Updates', 'error', `Failed: ${error.message}`);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to run tests.",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    const tests = [
      testConnection,
      testBuilderChallenges,
      testProgressEntries,
      testWorkshops,
      testSkillOffers,
      testMessages,
      testNotifications,
      testCollaborationProposals,
      testProjectInterests,
      testConnectionRequests,
      testFeedInteractions,
      testProjectUpdates,
    ];

    for (const test of tests) {
      await test();
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
    
    const successCount = testResults.filter(r => r.status === 'success').length;
    const errorCount = testResults.filter(r => r.status === 'error').length;
    
    toast({
      title: "Tests Complete",
      description: `${successCount} passed, ${errorCount} failed out of ${tests.length} tests.`,
    });
  };

  // Clear results
  const clearResults = () => {
    setTestResults([]);
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Please log in to run comprehensive tests.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comprehensive Database Test</h1>
          <p className="text-muted-foreground">Test all database operations to ensure everything works correctly</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="ufo-gradient"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
          <Button onClick={clearResults} variant="outline">
            Clear Results
          </Button>
        </div>
      </div>

      {/* Test Results */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Test Results</h2>
        {testResults.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No tests run yet. Click "Run All Tests" to start.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <Card key={index} className={`border-l-4 ${
                result.status === 'success' ? 'border-l-green-500' : 
                result.status === 'error' ? 'border-l-red-500' : 
                'border-l-yellow-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {result.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {result.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                      {result.status === 'pending' && <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />}
                      <div>
                        <h3 className="font-medium">{result.operation}</h3>
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                      </div>
                    </div>
                    <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                      {result.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {result.timestamp}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {testResults.filter(r => r.status === 'success').length}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {testResults.filter(r => r.status === 'error').length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {testResults.length}
                </div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
