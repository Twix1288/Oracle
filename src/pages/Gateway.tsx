import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Users, Plus, GraduationCap, Globe } from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';
import { JoinTeamTab } from '@/components/gateway/JoinTeamTab';
import { CreateTeamTab } from '@/components/gateway/CreateTeamTab';
import { MentorTab } from '@/components/gateway/MentorTab';
import { CommunityTab } from '@/components/gateway/CommunityTab';

export default function Gateway() {
  const [activeTab, setActiveTab] = useState('join-team');

  return (
    <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-cosmic-pattern opacity-20"></div>
      
      <Card className="w-full max-w-4xl relative z-10 bg-background/95 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Builder Gateway
            </span>
          </div>
          <CardTitle className="text-xl font-semibold text-muted-foreground">
            Your Gateway to Innovation - Join, Create, Learn, Connect
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="join-team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Join Team</span>
              </TabsTrigger>
              <TabsTrigger value="create-team" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Team</span>
              </TabsTrigger>
              <TabsTrigger value="mentor" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                <span className="hidden sm:inline">Mentor</span>
              </TabsTrigger>
              <TabsTrigger value="community" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Community</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="join-team" className="mt-0">
              <JoinTeamTab />
            </TabsContent>
            
            <TabsContent value="create-team" className="mt-0">
              <CreateTeamTab />
            </TabsContent>
            
            <TabsContent value="mentor" className="mt-0">
              <MentorTab />
            </TabsContent>
            
            <TabsContent value="community" className="mt-0">
              <CommunityTab />
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