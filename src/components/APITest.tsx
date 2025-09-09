import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const APITest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const { toast } = useToast();

  const testOracleAPI = async () => {
    setIsLoading(true);
    setResult('');
    
    try {
      const { data, error } = await supabase.functions.invoke('super-oracle', {
        body: {
          query: 'Hello, this is a test message. Please respond with a simple greeting.',
          type: 'chat',
          role: 'builder',
          userId: 'test-user'
        }
      });

      if (error) {
        throw error;
      }

      setResult(data?.answer || 'No response received');
      toast({
        title: "API Test Successful!",
        description: "Oracle API is working correctly.",
      });
    } catch (error: any) {
      console.error('API Test Error:', error);
      setResult(`Error: ${error.message}`);
      toast({
        title: "API Test Failed",
        description: error.message || "Failed to connect to Oracle API",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Oracle API Test</CardTitle>
        <CardDescription>
          Test if the OpenAI API key is properly configured in Supabase Edge Functions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testOracleAPI} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testing API...' : 'Test Oracle API'}
        </Button>
        
        {result && (
          <div className="p-4 rounded-lg bg-muted">
            <h3 className="font-semibold mb-2">API Response:</h3>
            <p className="text-sm whitespace-pre-wrap">{result}</p>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          <p><strong>If this test fails:</strong></p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Go to your Supabase Dashboard</li>
            <li>Navigate to Edge Functions → Settings</li>
            <li>Add environment variable: <code>OPENAI_API_KEY</code></li>
            <li>Set the value to your OpenAI API key</li>
            <li>Redeploy the super-oracle function</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
