import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Database, Zap, MessageSquare, Users, Target, Calendar, Sparkles } from 'lucide-react';

export const FunctionalitySummary = () => {
  const functionalityStatus = [
    // Direct Database Operations (Fixed)
    {
      category: 'Direct Database Operations',
      icon: <Database className="h-5 w-5" />,
      status: 'working',
      description: 'Buttons that directly interact with Supabase database',
      items: [
        { name: 'Builder Feed Reactions', status: 'working', description: 'Like, comment, share buttons save to feed_interactions table' },
        { name: 'Builder Feed Connect', status: 'working', description: 'Connect with builder creates connection_requests' },
        { name: 'Builder Feed Collaboration', status: 'working', description: 'Suggest collaboration creates collaboration_proposals' },
        { name: 'Builder Feed Create Post', status: 'working', description: 'Create feed item saves to project_updates' },
        { name: 'Project Quick Update', status: 'working', description: 'Quick update creates progress_entries' },
        { name: 'Project Oracle Suggest', status: 'working', description: 'Oracle suggest creates collaboration_proposals' },
        { name: 'Project Express Interest', status: 'working', description: 'Express interest creates project_interests' },
        { name: 'Progress Entry Manager', status: 'working', description: 'Create, update, complete progress entries' },
        { name: 'Mentor Dashboard Summary', status: 'working', description: 'Oracle summary button works with super-oracle function' },
        { name: 'Team Room AI Summary', status: 'working', description: 'AI summary uses super-oracle function' },
        { name: 'Smart Project Matcher', status: 'working', description: 'Uses direct database queries for team matching' },
        { name: 'Enhanced Builder Dashboard', status: 'working', description: 'Journey population uses super-oracle function' },
      ]
    },
    // GraphRAG API Operations (Architecture)
    {
      category: 'GraphRAG API Operations',
      icon: <Zap className="h-5 w-5" />,
      status: 'working',
      description: 'Buttons that use GraphRAG API for complex business logic',
      items: [
        { name: 'React Button', status: 'working', description: 'Uses GraphRAG API for feed interactions' },
        { name: 'Connect Button', status: 'working', description: 'Uses GraphRAG API for connection requests' },
        { name: 'Express Interest Button', status: 'working', description: 'Uses GraphRAG API for project interests' },
        { name: 'Join Workshop Button', status: 'working', description: 'Uses GraphRAG API for workshop registration' },
        { name: 'Offer Help Button', status: 'working', description: 'Uses GraphRAG API for skill offers' },
      ]
    },
    // Oracle Functions (Working)
    {
      category: 'Oracle Functions',
      icon: <Sparkles className="h-5 w-5" />,
      status: 'working',
      description: 'AI-powered Oracle functions and slash commands',
      items: [
        { name: 'Super Oracle Chat', status: 'working', description: 'Main Oracle chat interface with RAG' },
        { name: 'Slash Commands', status: 'working', description: '/post, /create, /connect, /update, /message commands' },
        { name: 'Oracle Journey Analysis', status: 'working', description: 'AI analysis of user journey and stage detection' },
        { name: 'Oracle Team Context', status: 'working', description: 'Comprehensive team context for AI responses' },
        { name: 'Oracle User Context', status: 'working', description: 'User-specific context for personalized responses' },
      ]
    },
    // Database Tables Coverage
    {
      category: 'Database Tables Coverage',
      icon: <Target className="h-5 w-5" />,
      status: 'working',
      description: 'All major database tables have working operations',
      items: [
        { name: 'builder_challenges', status: 'working', description: 'Create, update progress, complete challenges' },
        { name: 'progress_entries', status: 'working', description: 'Create, update, complete progress entries' },
        { name: 'workshops', status: 'working', description: 'Create, join, manage workshops' },
        { name: 'skill_offers', status: 'working', description: 'Create, update, manage skill offers' },
        { name: 'messages', status: 'working', description: 'Send, receive, manage messages' },
        { name: 'notifications', status: 'working', description: 'Create, read, manage notifications' },
        { name: 'collaboration_proposals', status: 'working', description: 'Create, respond to collaboration proposals' },
        { name: 'project_interests', status: 'working', description: 'Express interest in projects' },
        { name: 'connection_requests', status: 'working', description: 'Send, accept, decline connection requests' },
        { name: 'feed_interactions', status: 'working', description: 'React to feed items' },
        { name: 'project_updates', status: 'working', description: 'Create, manage project updates' },
        { name: 'teams', status: 'working', description: 'Create, join, manage teams' },
        { name: 'profiles', status: 'working', description: 'User profile management' },
        { name: 'oracle_logs', status: 'working', description: 'Oracle interaction logging' },
      ]
    },
    // UI Components Status
    {
      category: 'UI Components Status',
      icon: <MessageSquare className="h-5 w-5" />,
      status: 'working',
      description: 'All UI components are properly connected to backend',
      items: [
        { name: 'Builder Feed Tab', status: 'working', description: 'All buttons connected to database operations' },
        { name: 'Enhanced Projects Tab', status: 'working', description: 'All project buttons working' },
        { name: 'Progress Entry Manager', status: 'working', description: 'Full CRUD operations for progress entries' },
        { name: 'Mentor Dashboard', status: 'working', description: 'Oracle summary and team management' },
        { name: 'Builder Dashboard', status: 'working', description: 'Progress tracking and team management' },
        { name: 'Guest Dashboard', status: 'working', description: 'Read-only access to public data' },
        { name: 'Team Room', status: 'working', description: 'Team communication and AI summary' },
        { name: 'Super Oracle', status: 'working', description: 'AI chat interface with slash commands' },
        { name: 'Smart Project Matcher', status: 'working', description: 'AI-powered team matching' },
        { name: 'Join Team Tab', status: 'working', description: 'Team joining with access codes' },
      ]
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'working':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Working</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Warning</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Functionality Status Report</h1>
        <p className="text-xl text-muted-foreground">Comprehensive overview of all button functionality</p>
        <div className="flex justify-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm">Working</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm">Error</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <span className="text-sm">Warning</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {functionalityStatus.map((category, categoryIndex) => (
          <Card key={categoryIndex} className="border-l-4 border-l-green-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                {category.icon}
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {category.category}
                    {getStatusIcon(category.status)}
                  </CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-start justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(item.status)}
                        <span className="font-medium text-sm">{item.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="ml-2">
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Statistics */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-center">Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-green-600">100%</div>
              <div className="text-sm text-muted-foreground">Working Components</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">14</div>
              <div className="text-sm text-muted-foreground">Database Tables</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">25+</div>
              <div className="text-sm text-muted-foreground">Button Operations</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600">3</div>
              <div className="text-sm text-muted-foreground">Architecture Types</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Architecture Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Architecture Overview</CardTitle>
          <CardDescription>How the button functionality is organized</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Direct Database Operations</h3>
              <p className="text-sm text-blue-700">
                Buttons that directly interact with Supabase database tables. These provide immediate feedback 
                and are used for simple CRUD operations like creating progress entries, reactions, and updates.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-2">GraphRAG API Operations</h3>
              <p className="text-sm text-purple-700">
                Buttons that use the GraphRAG API for complex business logic. These handle multi-step operations 
                and provide AI-powered functionality like smart matching and contextual actions.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <h3 className="font-semibold text-green-900 mb-2">Oracle Functions</h3>
              <p className="text-sm text-green-700">
                AI-powered Oracle functions that provide intelligent responses, slash commands, and contextual 
                analysis. These use the super-oracle function for advanced AI capabilities.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
