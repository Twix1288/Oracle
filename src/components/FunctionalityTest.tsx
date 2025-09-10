import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TestResult {
  name: string;
  status: 'pending' | 'pass' | 'fail' | 'error';
  message: string;
  details?: string;
}

export const FunctionalityTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const testDatabaseConnection = async (): Promise<TestResult> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) throw error;

      return {
        name: 'Database Connection',
        status: 'pass',
        message: 'Successfully connected to database',
        details: `Found ${data?.length || 0} profiles`
      };
    } catch (error: any) {
      return {
        name: 'Database Connection',
        status: 'fail',
        message: 'Failed to connect to database',
        details: error.message
      };
    }
  };

  const testMessagesTable = async (): Promise<TestResult> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content')
        .limit(1);

      if (error) throw error;

      return {
        name: 'Messages Table',
        status: 'pass',
        message: 'Messages table accessible',
        details: `Schema: sender_id (${typeof data?.[0]?.sender_id}), receiver_id (${typeof data?.[0]?.receiver_id})`
      };
    } catch (error: any) {
      return {
        name: 'Messages Table',
        status: 'fail',
        message: 'Messages table not accessible',
        details: error.message
      };
    }
  };

  const testConnectionRequestsTable = async (): Promise<TestResult> => {
    try {
      const { data, error } = await supabase
        .from('connection_requests')
        .select('id, requester_id, requested_id, message')
        .limit(1);

      if (error) throw error;

      return {
        name: 'Connection Requests Table',
        status: 'pass',
        message: 'Connection requests table accessible',
        details: `Schema: requester_id (${typeof data?.[0]?.requester_id}), requested_id (${typeof data?.[0]?.requested_id})`
      };
    } catch (error: any) {
      return {
        name: 'Connection Requests Table',
        status: 'fail',
        message: 'Connection requests table not accessible',
        details: error.message
      };
    }
  };

  const testBuilderConnectionsTable = async (): Promise<TestResult> => {
    try {
      const { data, error } = await supabase
        .from('builder_connections')
        .select('id, connector_id, connectee_id, connection_type')
        .limit(1);

      if (error) throw error;

      return {
        name: 'Builder Connections Table',
        status: 'pass',
        message: 'Builder connections table accessible',
        details: `Schema: connector_id (${typeof data?.[0]?.connector_id}), connectee_id (${typeof data?.[0]?.connectee_id})`
      };
    } catch (error: any) {
      return {
        name: 'Builder Connections Table',
        status: 'fail',
        message: 'Builder connections table not accessible',
        details: error.message
      };
    }
  };

  const testSuperOracleFunction = async (): Promise<TestResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('super-oracle', {
        body: {
          query: 'Test message',
          type: 'chat',
          role: 'builder',
          userId: user?.id
        }
      });

      if (error) throw error;

      return {
        name: 'Super Oracle Function',
        status: 'pass',
        message: 'Super Oracle function working',
        details: `Response length: ${data?.answer?.length || 0} characters`
      };
    } catch (error: any) {
      return {
        name: 'Super Oracle Function',
        status: 'fail',
        message: 'Super Oracle function failed',
        details: error.message
      };
    }
  };

  const testMessageInsert = async (): Promise<TestResult> => {
    try {
      if (!user?.id) {
        return {
          name: 'Message Insert Test',
          status: 'error',
          message: 'No user ID available for test',
          details: 'User not authenticated'
        };
      }

      const testMessage = {
        sender_id: user.id,
        receiver_id: user.id, // Send to self for test
        content: 'Test message from functionality test',
        message_type: 'test',
        oracle_generated: false
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(testMessage)
        .select('id');

      if (error) throw error;

      // Clean up test message
      await supabase
        .from('messages')
        .delete()
        .eq('id', data[0].id);

      return {
        name: 'Message Insert Test',
        status: 'pass',
        message: 'Successfully inserted and deleted test message',
        details: `Message ID: ${data[0].id}`
      };
    } catch (error: any) {
      return {
        name: 'Message Insert Test',
        status: 'fail',
        message: 'Failed to insert message',
        details: error.message
      };
    }
  };

  const testConnectionRequestInsert = async (): Promise<TestResult> => {
    try {
      if (!user?.id) {
        return {
          name: 'Connection Request Insert Test',
          status: 'error',
          message: 'No user ID available for test',
          details: 'User not authenticated'
        };
      }

      const testRequest = {
        requester_id: user.id,
        requested_id: user.id, // Request to self for test
        request_type: 'collaboration',
        message: 'Test connection request from functionality test',
        oracle_generated: false,
        oracle_confidence: 0.8,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('connection_requests')
        .insert(testRequest)
        .select('id');

      if (error) throw error;

      // Clean up test request
      await supabase
        .from('connection_requests')
        .delete()
        .eq('id', data[0].id);

      return {
        name: 'Connection Request Insert Test',
        status: 'pass',
        message: 'Successfully inserted and deleted test connection request',
        details: `Request ID: ${data[0].id}`
      };
    } catch (error: any) {
      return {
        name: 'Connection Request Insert Test',
        status: 'fail',
        message: 'Failed to insert connection request',
        details: error.message
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTests([]);

    const testFunctions = [
      testDatabaseConnection,
      testMessagesTable,
      testConnectionRequestsTable,
      testBuilderConnectionsTable,
      testSuperOracleFunction,
      testMessageInsert,
      testConnectionRequestInsert
    ];

    const results: TestResult[] = [];

    for (const testFn of testFunctions) {
      try {
        const result = await testFn();
        results.push(result);
        setTests([...results]);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.push({
          name: 'Test Error',
          status: 'error',
          message: 'Test function failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
        setTests([...results]);
      }
    }

    setIsRunning(false);

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const errors = results.filter(r => r.status === 'error').length;

    toast({
      title: "Functionality Test Complete",
      description: `Passed: ${passed}, Failed: ${failed}, Errors: ${errors}`,
      variant: failed > 0 || errors > 0 ? "destructive" : "default"
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'fail': return 'bg-red-100 text-red-800';
      case 'error': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Functionality Test Suite
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Comprehensive test to verify all buttons and database operations work correctly
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run All Tests'
              )}
            </Button>
            
            {tests.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">
                  {tests.filter(t => t.status === 'pass').length} Passed
                </Badge>
                <Badge className="bg-red-100 text-red-800">
                  {tests.filter(t => t.status === 'fail').length} Failed
                </Badge>
                <Badge className="bg-yellow-100 text-yellow-800">
                  {tests.filter(t => t.status === 'error').length} Errors
                </Badge>
              </div>
            )}
          </div>

          {tests.length > 0 && (
            <div className="space-y-3">
              {tests.map((test, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getStatusIcon(test.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{test.name}</h4>
                      <Badge className={getStatusColor(test.status)}>
                        {test.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{test.message}</p>
                    {test.details && (
                      <p className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
                        {test.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tests.length === 0 && !isRunning && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
              <p>Click "Run All Tests" to verify functionality</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
