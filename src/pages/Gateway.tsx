import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Radar, FolderOpen, Handshake, Activity, GraduationCap } from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';
import { BuilderRadarTab } from '@/components/gateway/BuilderRadarTab';
import { EnhancedProjectsTab } from '@/components/gateway/EnhancedProjectsTab';
import { CollaborationHubTab } from '@/components/gateway/CollaborationHubTab';
import { BuilderFeedTab } from '@/components/gateway/BuilderFeedTab';
import { KnowledgeExchangeTab } from '@/components/gateway/KnowledgeExchangeTab';

export default function Gateway() {
  const [activeTab, setActiveTab] = useState('builder-radar');

  return (
    <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-cosmic-pattern opacity-20"></div>
      
      <Card className="w-full max-w-4xl relative z-10 bg-background/95 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Oracle Hub
            </span>
          </div>
          <CardTitle className="text-xl font-semibold text-muted-foreground">
            Builder Mission Control - Your AI-Powered Networking Hub
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-8">
              <TabsTrigger value="builder-radar" className="flex items-center gap-2">
                <Radar className="h-4 w-4" />
                <span className="hidden sm:inline">Builder Radar</span>
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Projects</span>
              </TabsTrigger>
              <TabsTrigger value="collaboration" className="flex items-center gap-2">
                <Handshake className="h-4 w-4" />
                <span className="hidden sm:inline">Collaboration</span>
              </TabsTrigger>
              <TabsTrigger value="builder-feed" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Builder Feed</span>
              </TabsTrigger>
              <TabsTrigger value="knowledge-exchange" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                <span className="hidden sm:inline">Knowledge</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="builder-radar" className="mt-0">
              <BuilderRadarTab />
            </TabsContent>
            
            <TabsContent value="projects" className="mt-0">
              <EnhancedProjectsTab />
            </TabsContent>
            
            <TabsContent value="collaboration" className="mt-0">
              <CollaborationHubTab />
            </TabsContent>
            
            <TabsContent value="builder-feed" className="mt-0">
              <BuilderFeedTab />
            </TabsContent>
            
            <TabsContent value="knowledge-exchange" className="mt-0">
              <KnowledgeExchangeTab />
            </TabsContent>
          </Tabs>

          <div className="mt-8 pt-6 border-t border-border flex justify-center">
            <LogoutButton 
              variant="ghost" 
              className="w-full max-w-xs"
              showText={true}
              showIcon={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}