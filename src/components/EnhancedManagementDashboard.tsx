import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Code, Terminal, TrendingUp, Settings, MessageSquare } from "lucide-react";
import { UserManagement } from "./UserManagement";
import { StageTracker } from "./StageTracker";
import { CommandCenter } from "./CommandCenter";
import { MessagingCenter } from "./MessagingCenter";

export const EnhancedManagementDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Enhanced Management</h2>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="stages" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Stage Tracking
          </TabsTrigger>
          <TabsTrigger value="commands" className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Command Center
          </TabsTrigger>
          <TabsTrigger value="messaging" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="stages">
          <StageTracker />
        </TabsContent>

        <TabsContent value="commands">
          <CommandCenter />
        </TabsContent>

        <TabsContent value="messaging">
          <Card className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader>
              <CardTitle>Enhanced Messaging & Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <MessagingCenter />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};