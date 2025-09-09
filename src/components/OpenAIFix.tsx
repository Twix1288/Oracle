import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';

export const OpenAIFix = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();

  const testOpenAI = async () => {
    setIsTesting(true);
    setTestResult('idle');
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('super-oracle', {
        body: {
          query: 'Test message - please respond with "API is working!"',
          type: 'chat',
          role: 'builder',
          userId: 'test-user'
        }
      });

      if (error) {
        throw error;
      }

      setTestResult('success');
      toast({
        title: "✅ OpenAI API Working!",
        description: "Your API key is properly configured.",
      });
    } catch (error: any) {
      console.error('OpenAI Test Error:', error);
      setTestResult('error');
      setErrorMessage(error.message || 'Unknown error');
      toast({
        title: "❌ OpenAI API Error",
        description: "API key needs to be configured in Supabase.",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">OpenAI API Key Fix</h1>
        <p className="text-muted-foreground">
          Fix the "Incorrect API key provided" error by configuring your OpenAI API key in Supabase
        </p>
      </div>

      {/* Test Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Test Current Status
          </CardTitle>
          <CardDescription>
            Click the button below to test if your OpenAI API key is working
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testOpenAI} 
            disabled={isTesting}
            className="w-full"
            size="lg"
          >
            {isTesting ? 'Testing API...' : 'Test OpenAI API'}
          </Button>

          {testResult === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Success!</strong> Your OpenAI API key is working correctly. The Oracle should now respond properly.
              </AlertDescription>
            </Alert>
          )}

          {testResult === 'error' && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Error:</strong> {errorMessage}
                <br />
                <br />
                Follow the steps below to fix this issue.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Fix Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Fix the OpenAI API Key Error</CardTitle>
          <CardDescription>
            Follow these steps to configure your OpenAI API key in Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
              Get Your OpenAI API Key
            </h3>
            <div className="pl-8 space-y-2">
              <p>Go to the OpenAI platform to get your API key:</p>
              <Button asChild variant="outline" className="w-fit">
                <a 
                  href="https://platform.openai.com/account/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open OpenAI API Keys Page
                </a>
              </Button>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Sign in to your OpenAI account</li>
                <li>Click "Create new secret key"</li>
                <li>Copy the key (it starts with <code>sk-proj-</code>)</li>
                <li>Keep it secure - you won't see it again</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
              Configure in Supabase Dashboard
            </h3>
            <div className="pl-8 space-y-2">
              <p>Add the API key to your Supabase project:</p>
              <Button asChild variant="outline" className="w-fit">
                <a 
                  href="https://supabase.com/dashboard/project/dijskfbokusyxkcfwkrc/settings/functions" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Supabase Functions Settings
                </a>
              </Button>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Go to "Edge Functions" in the left sidebar</li>
                <li>Click on "Settings" or "Environment Variables"</li>
                <li>Click "Add new secret"</li>
                <li>Set <strong>Name</strong> to: <code>OPENAI_API_KEY</code></li>
                <li>Set <strong>Value</strong> to: your OpenAI API key</li>
                <li>Click "Save"</li>
              </ol>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
              Redeploy Edge Functions
            </h3>
            <div className="pl-8 space-y-2">
              <p>After adding the environment variable, redeploy the functions:</p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Go to "Edge Functions" in your Supabase dashboard</li>
                <li>Find the <code>super-oracle</code> function</li>
                <li>Click the "Redeploy" button</li>
                <li>Wait for the deployment to complete</li>
              </ol>
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
              Test Again
            </h3>
            <div className="pl-8 space-y-2">
              <p>Once you've completed the steps above:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Click the "Test OpenAI API" button above</li>
                <li>You should see a success message</li>
                <li>The Oracle should now work properly in your app</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Still Having Issues?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Common Issues:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><strong>Wrong API Key:</strong> Make sure you're using the correct OpenAI API key</li>
              <li><strong>Key Not Saved:</strong> Ensure you clicked "Save" after adding the environment variable</li>
              <li><strong>Function Not Redeployed:</strong> You must redeploy the super-oracle function after adding the key</li>
              <li><strong>Wrong Environment:</strong> Make sure you're setting the variable in the correct Supabase project</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">Need Help?</h4>
            <p className="text-sm text-muted-foreground">
              If you're still having trouble, check the Supabase logs in your dashboard under "Edge Functions" → "Logs" to see detailed error messages.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
