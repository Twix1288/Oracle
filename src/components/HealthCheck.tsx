import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HealthStatus {
  service: string;
  status: 'healthy' | 'warning' | 'error' | 'checking';
  message: string;
  timestamp: string;
}

export const HealthCheck = () => {
  const [healthChecks, setHealthChecks] = useState<HealthStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const performHealthCheck = async () => {
    setIsChecking(true);
    const checks: HealthStatus[] = [];
    
    // Check Supabase connection
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      checks.push({
        service: 'Supabase Database',
        status: error ? 'error' : 'healthy',
        message: error ? `Error: ${error.message}` : 'Connected successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      checks.push({
        service: 'Supabase Database',
        status: 'error',
        message: `Connection failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    // Check Super Oracle function
    try {
      const { data, error } = await supabase.functions.invoke('super-oracle', {
        body: {
          query: 'health check',
          role: 'guest'
        }
      });
      
      checks.push({
        service: 'Super Oracle Function',
        status: error ? 'error' : 'healthy',
        message: error ? `Error: ${error.message}` : 'Function responsive',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      checks.push({
        service: 'Super Oracle Function',
        status: 'error',
        message: `Function error: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    // Check Discord bot
    try {
      const discordBotUrl = 'https://dijskfbokusyxkcfwkrc.supabase.co/functions/v1/discord-bot';
      const response = await fetch(discordBotUrl, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      checks.push({
        service: 'Discord Bot',
        status: response.ok ? 'healthy' : 'warning',
        message: response.ok ? 'Bot endpoint responsive' : `HTTP ${response.status}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      checks.push({
        service: 'Discord Bot',
        status: 'error',
        message: `Endpoint unreachable: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    // Check authentication
    try {
      const { data: { user } } = await supabase.auth.getUser();
      checks.push({
        service: 'Authentication',
        status: user ? 'healthy' : 'warning',
        message: user ? 'User authenticated' : 'No active session',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      checks.push({
        service: 'Authentication',
        status: 'error',
        message: `Auth error: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }

    setHealthChecks(checks);
    setIsChecking(false);
  };

  useEffect(() => {
    performHealthCheck();
  }, []);

  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
  };

  const getStatusColor = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'checking':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  const overallStatus = healthChecks.length > 0 ? (
    healthChecks.every(c => c.status === 'healthy') ? 'healthy' :
    healthChecks.some(c => c.status === 'error') ? 'error' : 'warning'
  ) : 'checking';

  return (
    <Card className="glow-border bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(overallStatus)}
            System Health Check
          </CardTitle>
          <Button
            onClick={performHealthCheck}
            disabled={isChecking}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {healthChecks.map((check, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background/30">
              <div className="flex items-center gap-3">
                {getStatusIcon(check.status)}
                <div>
                  <p className="font-medium">{check.service}</p>
                  <p className="text-sm text-muted-foreground">{check.message}</p>
                </div>
              </div>
              <Badge className={getStatusColor(check.status)}>
                {check.status}
              </Badge>
            </div>
          ))}
        </div>

        {healthChecks.length === 0 && (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Running health checks...
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Last checked: {healthChecks.length > 0 ? new Date(healthChecks[0].timestamp).toLocaleString() : 'Never'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};