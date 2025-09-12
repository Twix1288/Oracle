import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

// OpenAI AI configuration
const AI_MODELS = {
  openai: {
    apiKey: Deno.env.get('OPENAI_API_KEY'),
    model: 'gpt-4o' // Using legacy model that supports temperature and max_tokens
  }
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl!, supabaseKey!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuperOracleRequest {
  query: string;
  type: 'chat' | 'resources' | 'connect' | 'journey' | 'team' | 'rag_search' | 'project_creation' | 'content_creation';
  role: 'builder' | 'mentor' | 'guest' | 'unassigned';
  teamId?: string;
  userId?: string;
  context?: any;
}

interface SuperOracleResponse {
  answer: string;
  sources: number;
  context_used: boolean;
  model_used: string;
  confidence: number;
  processing_time: number;
  search_strategy: string;
  resources?: any[];
  connections?: any[];
  oracle_log_id?: string;
}

// Get comprehensive user context from database (inspired by ai_bot.py)
async function getUserContext(userId?: string, teamId?: string): Promise<{ context: string; userData: any }> {
  try {
    console.log('🔍 Getting comprehensive user context...');
    
    if (!userId) {
      console.log('No userId provided, returning empty context');
      return { context: '', userData: {} };
    }
    
    let context = '';
    let userData: any = {};
    
    // Get user profile with comprehensive data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.warn('Profile query error:', profileError);
    }
    
    if (profile) {
      userData.profile = profile;
      context += `\n## User Profile
- Name: ${profile.full_name || profile.display_name || 'Unknown'}
- Bio: ${profile.bio || 'No bio available'}
- Skills: ${(profile.skills || []).join(', ')}
- Builder Level: ${profile.builder_level || 'novice'}
- Learning Goals: ${(profile.learning_goals || []).join(', ')}
- Project Goals: ${profile.project_goals || 'No specific goals'}
- Availability: ${profile.availability_hours || 0} hours/week
- Current Week: ${profile.current_week || 'Unknown'}
- Onboarding Completed: ${profile.onboarding_completed || false}
`;
    }
    
    // Get comprehensive user data from ALL available tables
    const contextData: any = {};
    
    // Get user's teams (both created and joined)
    try {
      const { data: createdTeams } = await supabase
        .from('teams')
        .select('id, name, description, status, created_at')
        .eq('team_creator_id', userId);
      
      const { data: memberTeams } = await supabase
        .from('team_members')
        .select(`
          teams!inner(id, name, description, status, created_at),
          role
        `)
        .eq('user_id', userId);
      
      const allTeams = [
        ...(createdTeams || []).map(team => ({ ...team, role: 'creator' })),
        ...(memberTeams || []).map(m => ({ ...m.teams, role: m.role }))
      ];
      
      contextData.teams = allTeams;
      if (allTeams && allTeams.length > 0) {
        context += `\n## User's Projects/Teams (${allTeams.length} entries)
${allTeams.map(team => `- ${team.name}: ${team.description || 'No description'} (${team.status}) - Role: ${team.role}`).join('\n')}
`;
      }
    } catch (error) {
      console.warn('Teams query error:', error);
      contextData.teams = [];
    }
    
    // Get recent progress entries
    try {
      const { data: progress } = await supabase
        .from('progress_entries')
        .select('title, description, category, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      contextData.progress = progress || [];
      if (progress && progress.length > 0) {
        context += `\n## Recent Progress (${progress.length} entries)
${progress.map(p => `- ${p.title}: ${p.description} (${p.status})`).join('\n')}
`;
      }
    } catch (error) {
      console.warn('Progress query error:', error);
      contextData.progress = [];
    }
    
    // Get recent project updates
    try {
      const { data: updates } = await supabase
        .from('project_updates')
        .select('title, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      contextData.updates = updates || [];
      if (updates && updates.length > 0) {
        context += `\n## Recent Project Updates (${updates.length} entries)
${updates.map(u => `- ${u.title}: ${u.content.substring(0, 100)}...`).join('\n')}
`;
      }
    } catch (error) {
      console.warn('Updates query error:', error);
      contextData.updates = [];
    }
    
    // Get connection requests
    try {
      const { data: connections } = await supabase
        .from('connection_requests')
        .select('request_type, message, status, created_at')
        .or(`requester_id.eq.${userId},requested_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(5);
      
      contextData.connections = connections || [];
      if (connections && connections.length > 0) {
        context += `\n## Recent Connections (${connections.length} entries)
${connections.map(c => `- ${c.request_type}: ${c.message.substring(0, 50)}... (${c.status})`).join('\n')}
`;
      }
    } catch (error) {
      console.warn('Connections query error:', error);
      contextData.connections = [];
    }
    
    // Get ALL users data for intelligent matching and recommendations
    try {
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('*')
        .limit(50);
      
      contextData.allUsers = allUsers || [];
      console.log(`📊 Retrieved ${contextData.allUsers.length} total users for matching`);
      
      if (contextData.allUsers && contextData.allUsers.length > 0) {
        console.log('👥 Available users:');
        contextData.allUsers.slice(0, 5).forEach((user: any) => {
          console.log(`   - ${user.full_name || user.display_name || 'Unknown'} (ID: ${user.id})`);
        });
      }
    } catch (error) {
      console.warn('All users query error:', error);
      contextData.allUsers = [];
    }
    
    // Get all community updates for better context (using updates table)
    try {
      const { data: allUpdates } = await supabase
        .from('updates')
        .select(`
          *,
          profiles!inner(full_name, display_name, bio)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      
      contextData.allCommunityActivity = allUpdates || [];
      console.log(`📊 Retrieved ${contextData.allCommunityActivity.length} community updates for context`);
    } catch (error) {
      console.warn('Community updates query error:', error);
      contextData.allCommunityActivity = [];
    }
    
    // Get all projects for skill and interest matching
    try {
      const { data: allProjects } = await supabase
        .from('teams')
        .select(`
          *,
          profiles!inner(full_name, display_name, bio)
        `)
        .limit(50);
      
      contextData.allProjects = allProjects || [];
      console.log(`📊 Retrieved ${contextData.allProjects.length} projects for matching`);
    } catch (error) {
      console.warn('All projects query error:', error);
      contextData.allProjects = [];
    }
    
    // Get user's skill offers
    try {
      const { data: skillOffers } = await supabase
        .from('skill_offers')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      contextData.skillOffers = skillOffers || [];
      if (skillOffers && skillOffers.length > 0) {
        context += `\n## User's Skill Offers (${skillOffers.length} offers)
${skillOffers.map(skill => `- ${skill.skill}: ${skill.description || 'No description'} (${skill.availability || 'No availability info'})`).join('\n')}
`;
      }
    } catch (error) {
      console.warn('Skill offers query error:', error);
      contextData.skillOffers = [];
    }
    
    // Get user's collaboration proposals
    try {
      const { data: proposals } = await supabase
        .from('collaboration_proposals')
        .select('*')
        .or(`proposer_id.eq.${userId},target_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      contextData.collaborationProposals = proposals || [];
      if (proposals && proposals.length > 0) {
        context += `\n## User's Collaboration Proposals (${proposals.length} proposals)
${proposals.map(prop => `- ${prop.proposal_type}: ${prop.message ? prop.message.substring(0, 50) + '...' : 'No message'} (${prop.status})`).join('\n')}
`;
      }
    } catch (error) {
      console.warn('Collaboration proposals query error:', error);
      contextData.collaborationProposals = [];
    }
    
    // Get user's project interests
    try {
      const { data: projectInterests } = await supabase
        .from('project_interests')
        .select(`
          *,
          teams!inner(name, description)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      contextData.projectInterests = projectInterests || [];
      if (projectInterests && projectInterests.length > 0) {
        context += `\n## User's Project Interests (${projectInterests.length} interests)
${projectInterests.map(interest => `- ${interest.teams?.name || 'Unknown Project'}: ${interest.message ? interest.message.substring(0, 50) + '...' : 'No message'} (${interest.status})`).join('\n')}
`;
      }
    } catch (error) {
      console.warn('Project interests query error:', error);
      contextData.projectInterests = [];
    }
    
    // Get user's builder challenges
    try {
      const { data: challenges } = await supabase
        .from('builder_challenges')
        .select('*')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      contextData.builderChallenges = challenges || [];
      if (challenges && challenges.length > 0) {
        context += `\n## User's Builder Challenges (${challenges.length} challenges)
${challenges.map(challenge => `- ${challenge.title}: ${challenge.description ? challenge.description.substring(0, 50) + '...' : 'No description'} (${challenge.difficulty})`).join('\n')}
`;
      }
    } catch (error) {
      console.warn('Builder challenges query error:', error);
      contextData.builderChallenges = [];
    }
    
    // Get user's workshops
    try {
      const { data: workshops } = await supabase
        .from('workshops')
        .select('*')
        .eq('host_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      contextData.workshops = workshops || [];
      if (workshops && workshops.length > 0) {
        context += `\n## User's Workshops (${workshops.length} workshops)
${workshops.map(workshop => `- ${workshop.title}: ${workshop.description ? workshop.description.substring(0, 50) + '...' : 'No description'} (${workshop.max_attendees || 'No limit'} max attendees)`).join('\n')}
`;
      }
    } catch (error) {
      console.warn('Workshops query error:', error);
      contextData.workshops = [];
    }
    
    // Get user's messages
    try {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      contextData.messages = messages || [];
      if (messages && messages.length > 0) {
        context += `\n## User's Recent Messages (${messages.length} messages)
${messages.slice(0, 5).map(msg => `- ${msg.content ? msg.content.substring(0, 60) + '...' : 'No content'}`).join('\n')}
`;
      }
    } catch (error) {
      console.warn('Messages query error:', error);
      contextData.messages = [];
    }
    
    // Get user's notifications
    try {
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      contextData.notifications = notifications || [];
      if (notifications && notifications.length > 0) {
        context += `\n## User's Recent Notifications (${notifications.length} notifications)
${notifications.slice(0, 5).map(notif => `- ${notif.title}: ${notif.message ? notif.message.substring(0, 50) + '...' : 'No message'} (${notif.type})`).join('\n')}
`;
      }
    } catch (error) {
      console.warn('Notifications query error:', error);
      contextData.notifications = [];
    }
    
    // Store all context data
    userData.contextData = contextData;
    
    console.log('📊 Comprehensive user data gathered:');
    Object.keys(contextData).forEach(key => {
      const value = contextData[key];
      if (Array.isArray(value)) {
        console.log(`   ${key}: ${value.length} items`);
      } else {
        console.log(`   ${key}: ${typeof value}`);
      }
    });
    
    console.log('✅ User context retrieved successfully');
    console.log('📊 Context length:', context.length);
    return { context, userData };
  } catch (error) {
    console.error('❌ Error getting user context:', error);
    return { context: `Error retrieving user context: ${error.message}`, userData: {} };
  }
}

// Get real-time platform data (inspired by ai_bot.py)
async function getRealtimePlatformData(): Promise<any> {
  try {
    console.log('🌐 Getting real-time platform data...');
    
    const platformData: any = {};
    
    // Get leaderboard data
    try {
      const { data: leaderboard } = await supabase
        .from('teams')
        .select(`
          *,
          profiles!inner(full_name, display_name, bio, current_week)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      platformData.leaderboard = leaderboard || [];
      console.log(`Retrieved ${platformData.leaderboard.length} leaderboard entries`);
    } catch (error) {
      console.warn('Leaderboard query error:', error);
      platformData.leaderboard = [];
    }
    
    // Get recent community updates
    try {
      const { data: updates } = await supabase
        .from('updates')
        .select(`
          *,
          profiles!inner(full_name, display_name, bio)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      platformData.recentUpdates = updates || [];
    } catch (error) {
      console.warn('Recent updates query error:', error);
      platformData.recentUpdates = [];
    }
    
    // Get active users
    try {
      const { data: activeUsers } = await supabase
        .from('profiles')
        .select('full_name, display_name, bio, role, location')
        .limit(20);
      
      platformData.activeUsers = activeUsers || [];
    } catch (error) {
      console.warn('Active users query error:', error);
      platformData.activeUsers = [];
    }
    
    // Get recent skill offers
    try {
      const { data: skillOffers } = await supabase
        .from('skill_offers')
        .select(`
          *,
          profiles!inner(full_name, display_name, bio)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      platformData.skillOffers = skillOffers || [];
    } catch (error) {
      console.warn('Skill offers query error:', error);
      platformData.skillOffers = [];
    }
    
    // Get recent workshops
    try {
      const { data: workshops } = await supabase
        .from('workshops')
        .select(`
          *,
          profiles!inner(full_name, display_name, bio)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      platformData.workshops = workshops || [];
    } catch (error) {
      console.warn('Workshops query error:', error);
      platformData.workshops = [];
    }
    
    // Get recent builder challenges
    try {
      const { data: challenges } = await supabase
        .from('builder_challenges')
        .select(`
          *,
          profiles!inner(full_name, display_name, bio)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      platformData.builderChallenges = challenges || [];
    } catch (error) {
      console.warn('Builder challenges query error:', error);
      platformData.builderChallenges = [];
    }
    
    console.log('✅ Platform data retrieved successfully');
    return platformData;
  } catch (error) {
    console.error('❌ Error getting platform data:', error);
    return {};
  }
}

// Search documents for relevant context
async function searchDocuments(query: string, userId?: string): Promise<string> {
  try {
    console.log('🔍 Searching documents for context...');
    
    let documentQuery = supabase
      .from('documents')
      .select('content, content_type, metadata');
    
    // If user provided, get their team-related documents
    if (userId) {
      documentQuery = documentQuery.or(`source_id.eq.${userId},content_type.eq.public`);
    }
    
    const { data: documents, error } = await documentQuery
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('❌ Document search error:', error);
      return '';
    }
    
    if (!documents || documents.length === 0) {
      return '';
    }
    
    // Simple text matching for relevant documents
    const queryLower = query.toLowerCase();
    const relevantDocs = documents.filter(doc => 
      doc.content.toLowerCase().includes(queryLower) ||
      queryLower.split(' ').some(word => 
        word.length > 3 && doc.content.toLowerCase().includes(word)
      )
    ).slice(0, 5);
    
    if (relevantDocs.length === 0) {
      return '';
    }
    
    const contextText = relevantDocs
      .map(doc => `[${doc.content_type}] ${doc.content.substring(0, 300)}`)
      .join('\n\n');
    
    console.log(`✅ Found ${relevantDocs.length} relevant documents`);
    return contextText;
  } catch (error) {
    console.error('❌ Document search error:', error);
    return '';
  }
}

// Enhanced AI response generation (inspired by ai_bot.py)
async function generateAIResponse(query: string, context: string, userContext: any, userId?: string, teamId?: string): Promise<string> {
  try {
    console.log('🤖 Generating AI response for query:', query.substring(0, 100));
    
    if (!AI_MODELS.openai.apiKey) {
      console.error('❌ OpenAI API key not found');
      return 'I apologize, but the AI service is not properly configured. Please contact support.';
    }

    // Get comprehensive user context and platform data
    const { context: userContextData, userData } = await getUserContext(userId, teamId);
    const platformData = await getRealtimePlatformData();
    
    // Search for relevant documents
    const documentContext = await searchDocuments(query, userId);
    const hasDocumentContext = documentContext.length > 0;
    
    // Build comprehensive context string with ALL user data
    let contextStr = '';
    
    // User profile information
    if (userData.profile) {
      contextStr += `👤 Current User: ${userData.profile.full_name || userData.profile.display_name || 'Unknown'}\n`;
      contextStr += `   Bio: ${userData.profile.bio || 'No bio available'}\n`;
      contextStr += `   Current Week: ${userData.profile.current_week || 'Unknown'}\n`;
      contextStr += `   Onboarding Completed: ${userData.profile.onboarding_completed || false}\n`;
    }
    
    // User's comprehensive data from contextData
    if (userData.contextData) {
      const userDataContext = userData.contextData;
      
      // User's projects and teams
      if (userDataContext.teams && userDataContext.teams.length > 0) {
        contextStr += `\n🚀 User's Projects/Teams (${userDataContext.teams.length} entries):\n`;
        userDataContext.teams.slice(0, 3).forEach((team: any) => {
          contextStr += `   - ${team.name}: ${team.description || team.project_description || 'No description'}...\n`;
          contextStr += `     Status: ${team.status}, Role: ${team.role}\n`;
        });
      }
      
      // User's community activity
      if (userDataContext.allCommunityActivity && userDataContext.allCommunityActivity.length > 0) {
        contextStr += `\n💬 User's Community Activity (${userDataContext.allCommunityActivity.length} posts/comments):\n`;
        userDataContext.allCommunityActivity.slice(0, 5).forEach((update: any) => {
          const content = update.content ? update.content.substring(0, 80) : 'No content';
          const created = update.created_at ? update.created_at.substring(0, 10) : 'Unknown date';
          contextStr += `   - [${created}] ${content}...\n`;
        });
      }
      
      // User's recent progress
      if (userDataContext.progress && userDataContext.progress.length > 0) {
        contextStr += `\n✅ User's Recent Progress (${userDataContext.progress.length} entries):\n`;
        userDataContext.progress.slice(0, 3).forEach((progress: any) => {
          const desc = progress.description ? progress.description.substring(0, 60) : 'No description';
          contextStr += `   - ${progress.title}: ${desc}...\n`;
        });
      }
      
      // User's project updates
      if (userDataContext.updates && userDataContext.updates.length > 0) {
        contextStr += `\n📝 User's Recent Project Updates (${userDataContext.updates.length} entries):\n`;
        userDataContext.updates.slice(0, 3).forEach((update: any) => {
          const content = update.content ? update.content.substring(0, 60) : 'No content';
          contextStr += `   - ${update.title}: ${content}...\n`;
        });
      }
      
      // User's connections
      if (userDataContext.connections && userDataContext.connections.length > 0) {
        contextStr += `\n🤝 User's Recent Connections (${userDataContext.connections.length} entries):\n`;
        userDataContext.connections.slice(0, 3).forEach((conn: any) => {
          const message = conn.message ? conn.message.substring(0, 50) : 'No message';
          contextStr += `   - ${conn.request_type}: ${message}... (${conn.status})\n`;
        });
      }
      
      // User's skill offers
      if (userDataContext.skillOffers && userDataContext.skillOffers.length > 0) {
        contextStr += `\n🎯 User's Skill Offers (${userDataContext.skillOffers.length} offers):\n`;
        userDataContext.skillOffers.slice(0, 3).forEach((skill: any) => {
          const desc = skill.description ? skill.description.substring(0, 60) : 'No description';
          contextStr += `   - ${skill.skill}: ${desc}... (${skill.availability || 'No availability'})\n`;
        });
      }
      
      // User's collaboration proposals
      if (userDataContext.collaborationProposals && userDataContext.collaborationProposals.length > 0) {
        contextStr += `\n🤝 User's Collaboration Proposals (${userDataContext.collaborationProposals.length} proposals):\n`;
        userDataContext.collaborationProposals.slice(0, 3).forEach((prop: any) => {
          const message = prop.message ? prop.message.substring(0, 50) : 'No message';
          contextStr += `   - ${prop.proposal_type}: ${message}... (${prop.status})\n`;
        });
      }
      
      // User's project interests
      if (userDataContext.projectInterests && userDataContext.projectInterests.length > 0) {
        contextStr += `\n💡 User's Project Interests (${userDataContext.projectInterests.length} interests):\n`;
        userDataContext.projectInterests.slice(0, 3).forEach((interest: any) => {
          const projectName = interest.teams?.name || 'Unknown Project';
          const message = interest.message ? interest.message.substring(0, 50) : 'No message';
          contextStr += `   - ${projectName}: ${message}... (${interest.status})\n`;
        });
      }
      
      // User's builder challenges
      if (userDataContext.builderChallenges && userDataContext.builderChallenges.length > 0) {
        contextStr += `\n🏆 User's Builder Challenges (${userDataContext.builderChallenges.length} challenges):\n`;
        userDataContext.builderChallenges.slice(0, 3).forEach((challenge: any) => {
          const desc = challenge.description ? challenge.description.substring(0, 60) : 'No description';
          contextStr += `   - ${challenge.title}: ${desc}... (${challenge.difficulty})\n`;
        });
      }
      
      // User's workshops
      if (userDataContext.workshops && userDataContext.workshops.length > 0) {
        contextStr += `\n🎓 User's Workshops (${userDataContext.workshops.length} workshops):\n`;
        userDataContext.workshops.slice(0, 3).forEach((workshop: any) => {
          const desc = workshop.description ? workshop.description.substring(0, 60) : 'No description';
          contextStr += `   - ${workshop.title}: ${desc}... (${workshop.max_attendees || 'No limit'} max)\n`;
        });
      }
      
      // User's messages
      if (userDataContext.messages && userDataContext.messages.length > 0) {
        contextStr += `\n💬 User's Recent Messages (${userDataContext.messages.length} messages):\n`;
        userDataContext.messages.slice(0, 3).forEach((msg: any) => {
          const content = msg.content ? msg.content.substring(0, 60) : 'No content';
          contextStr += `   - ${content}...\n`;
        });
      }
      
      // User's notifications
      if (userDataContext.notifications && userDataContext.notifications.length > 0) {
        contextStr += `\n🔔 User's Recent Notifications (${userDataContext.notifications.length} notifications):\n`;
        userDataContext.notifications.slice(0, 3).forEach((notif: any) => {
          const message = notif.message ? notif.message.substring(0, 50) : 'No message';
          contextStr += `   - ${notif.title}: ${message}... (${notif.type})\n`;
        });
      }
      
      // Intelligent user matching and recommendations
      if (userDataContext.allUsers && userDataContext.allUsers.length > 0) {
        const currentUserId = userData.profile?.id;
        const otherUsers = userDataContext.allUsers.filter((user: any) => user.id !== currentUserId);
        
        // Get 5 random users for recommendations
        const recommendedUsers = otherUsers.slice(0, 5);
        
        if (recommendedUsers.length > 0) {
          contextStr += `\n👥 RECOMMENDED USERS TO WORK WITH (${recommendedUsers.length} users):\n`;
          recommendedUsers.forEach((user: any, index: number) => {
            const userName = user.full_name || user.display_name || 'Unknown';
            const bio = user.bio || 'No bio available';
            const currentWeek = user.current_week || 'Unknown';
            contextStr += `   ${index + 1}. ${userName} (ID: ${user.id}): ${bio.substring(0, 100)}... (Week ${currentWeek})\n`;
          });
        }
      }
    }
    
    // Platform-wide data
    if (platformData.leaderboard && platformData.leaderboard.length > 0) {
      contextStr += `\n🏆 Current Platform Leaderboard:\n`;
      platformData.leaderboard.slice(0, 5).forEach((entry: any, index: number) => {
        const name = entry.profiles?.full_name || entry.profiles?.display_name || 'Unknown User';
        const description = entry.description || entry.project_description || 'No description available';
        contextStr += `${index + 1}. ${name}: ${description.substring(0, 100)}...\n`;
      });
    }
    
    // Recent community updates
    if (platformData.recentUpdates && platformData.recentUpdates.length > 0) {
      contextStr += `\n📢 Recent Community Updates:\n`;
      platformData.recentUpdates.slice(0, 3).forEach((update: any) => {
        const author = update.profiles?.full_name || update.profiles?.display_name || 'Unknown';
        const content = update.content ? update.content.substring(0, 100) : 'No content';
        contextStr += `- ${author}: ${content}...\n`;
      });
    }
    
    // Active users
    if (platformData.activeUsers && platformData.activeUsers.length > 0) {
      contextStr += `\n👥 Active Community Members: ${platformData.activeUsers.length} users online\n`;
    }
    
    // Recent skill offers
    if (platformData.skillOffers && platformData.skillOffers.length > 0) {
      contextStr += `\n🎯 Recent Skill Offers:\n`;
      platformData.skillOffers.slice(0, 3).forEach((skill: any) => {
        const author = skill.profiles?.full_name || skill.profiles?.display_name || 'Unknown';
        const desc = skill.description ? skill.description.substring(0, 80) : 'No description';
        contextStr += `- ${author}: ${skill.skill} - ${desc}...\n`;
      });
    }
    
    // Recent workshops
    if (platformData.workshops && platformData.workshops.length > 0) {
      contextStr += `\n🎓 Recent Workshops:\n`;
      platformData.workshops.slice(0, 3).forEach((workshop: any) => {
        const host = workshop.profiles?.full_name || workshop.profiles?.display_name || 'Unknown';
        const desc = workshop.description ? workshop.description.substring(0, 80) : 'No description';
        contextStr += `- ${host}: ${workshop.title} - ${desc}...\n`;
      });
    }
    
    // Recent builder challenges
    if (platformData.builderChallenges && platformData.builderChallenges.length > 0) {
      contextStr += `\n🏆 Recent Builder Challenges:\n`;
      platformData.builderChallenges.slice(0, 3).forEach((challenge: any) => {
        const creator = challenge.profiles?.full_name || challenge.profiles?.display_name || 'Unknown';
        const desc = challenge.description ? challenge.description.substring(0, 80) : 'No description';
        contextStr += `- ${creator}: ${challenge.title} - ${desc}... (${challenge.difficulty})\n`;
      });
    }
    
    // Create the enhanced prompt
    const systemPrompt = `You are PieFi AI, an intelligent community assistant with comprehensive access to ALL user data and advanced matching capabilities. You help builders, entrepreneurs, and creators with:

1. **Intelligent User Matching**: Find users with similar projects, skills, or complementary expertise
2. **Personalized Resource Recommendations**: Suggest resources based on their specific skills and interests
3. **Project-Specific Advice**: Provide feedback tailored to their exact projects and progress
4. **Strategic Networking**: Connect users with the most relevant community members
5. **Skill-Based Mentorship**: Match users with mentors or mentees based on expertise
6. **Contextual Problem-Solving**: Use their complete history to solve current challenges

You have INTELLIGENT ACCESS to:
- Complete user profiles, projects, and activity history
- Similar users based on project descriptions and interests
- Complementary users with different but related skills
- All community activity and user interactions
- Project rankings and difficulty levels
- User skills extracted from posts and projects

INTELLIGENT MATCHING CAPABILITIES:
- **Similar Users**: Find users working on similar projects or with matching interests
- **Complementary Skills**: Identify users with skills that complement the user's expertise
- **Resource Matching**: Suggest resources based on their specific skill set and project needs
- **Mentorship Matching**: Connect users for knowledge sharing and collaboration
- **Project Collaboration**: Find potential collaborators for specific projects

IMPORTANT INSTRUCTIONS:
- When asked about "good people to work with", you MUST use the EXACT user names provided in the "RECOMMENDED USERS TO WORK WITH" section
- NEVER make up or invent user names like "User A", "User B", "Unknown User" - only use the exact names from the database
- Use the exact display names provided (e.g., "John", "Sarah", "Mike", etc.)
- For resource recommendations, match resources to their specific skills and current projects
- Always provide specific user names (from the database) and suggest why they might be helpful
- Reference their actual projects, bio, and current week in recommendations
- Be encouraging about connecting with these community members
- Suggest specific ways they could collaborate or help each other
- If no users are available, say "I don't see any other users in the database right now" instead of making up names`;

    const userPrompt = `Comprehensive User Context and Platform Data:
${contextStr}

User Query: ${query}

Please provide a highly personalized response that:
1. Addresses the user by name and references their specific projects, posts, or activities
2. Uses their complete history to provide relevant advice
3. References their specific achievements, progress, and community activity
4. Connects their current question to their past work and future goals
5. Provides actionable recommendations based on their data
6. Be encouraging about their progress and specific about next steps

Make the response personal, specific, and highly relevant to their unique situation and history on the platform.`;

    console.log('🔄 Making OpenAI API request...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_MODELS.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODELS.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API request failed:', response.status, errorText);
      throw new Error(`OpenAI API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiAnswer = data.choices?.[0]?.message?.content;
    
    if (!aiAnswer) {
      console.error('❌ No AI response content received:', data);
      return 'I apologize, but I could not generate a response. Please try rephrasing your question.';
    }

    console.log('✅ AI response generated successfully');
    return aiAnswer;
  } catch (error) {
    console.error('❌ AI response generation error:', error);
    return `I apologize, but I encountered an error while processing your request: ${error.message}. Please try again.`;
  }
}

// Fetch real web resources for resource queries
async function fetchRealWebResources(query: string) {
  try {
    console.log('🌐 Fetching real web resources for:', query);
    
    // Resource extraction based on query
    const keywords = query.toLowerCase();
    let resourceType = 'general';
    let specificTopic = query;
    
    // Detect specific resource types
    if (keywords.includes('react') || keywords.includes('javascript') || keywords.includes('js')) {
      resourceType = 'react';
      specificTopic = 'React and JavaScript';
    } else if (keywords.includes('python')) {
      resourceType = 'python';
      specificTopic = 'Python development';
    } else if (keywords.includes('ai') || keywords.includes('machine learning') || keywords.includes('ml')) {
      resourceType = 'ai';
      specificTopic = 'AI and Machine Learning';
    }
    
    console.log('✅ Using curated resources for:', specificTopic);
    
    // Return curated resources based on topic
    const curatedResources = getCuratedResources(resourceType, specificTopic);
    
    const answer = `# 🎯 ${specificTopic} Resources

I've found some excellent resources for ${specificTopic.toLowerCase()}:

${curatedResources.map((resource, idx) => 
  `## ${idx + 1}. ${resource.title}
- **Type**: ${resource.type}
- **Level**: ${resource.level}
- **Description**: ${resource.description}
- **URL**: ${resource.url}
`).join('\n')}

## 💡 Next Steps
1. Start with the beginner-friendly resources if you're new
2. Try the hands-on tutorials for practical experience
3. Join communities and forums for ongoing support
4. Build projects to apply what you learn

**Oracle Tip**: The best way to learn is by doing! Pick a small project and start building while following these tutorials.`;

    return {
      answer,
      resources: curatedResources,
      search_strategy: 'curated_resources'
    };
  } catch (error) {
    console.error('Error fetching web resources:', error);
    return {
      answer: 'I apologize, but I encountered an error while fetching resources. Please try your search again.',
      resources: [],
      search_strategy: 'error_fallback'
    };
  }
}

function getCuratedResources(type: string, topic: string) {
  const resourceSets: Record<string, any[]> = {
    react: [
      {
        title: "React Official Documentation",
        url: "https://react.dev/",
        type: "Documentation",
        level: "All levels",
        description: "The complete guide to React with interactive examples and best practices"
      },
      {
        title: "React Tutorial by Codecademy",
        url: "https://www.codecademy.com/learn/react-101",
        type: "Interactive Course",
        level: "Beginner",
        description: "Hands-on React course with coding exercises"
      },
      {
        title: "React Hooks Tutorial",
        url: "https://www.youtube.com/watch?v=O6P86uwfdR0",
        type: "Video Tutorial",
        level: "Intermediate",
        description: "Complete guide to React Hooks with practical examples"
      }
    ],
    python: [
      {
        title: "Python.org Official Tutorial",
        url: "https://docs.python.org/3/tutorial/",
        type: "Documentation",
        level: "Beginner",
        description: "The official Python tutorial covering all basics"
      },
      {
        title: "Python for Everybody (Coursera)",
        url: "https://www.coursera.org/specializations/python",
        type: "Online Course",
        level: "Beginner",
        description: "Comprehensive Python specialization by University of Michigan"
      },
      {
        title: "Real Python",
        url: "https://realpython.com/",
        type: "Articles & Tutorials",
        level: "All levels",
        description: "In-depth Python tutorials and articles"
      }
    ],
    ai: [
      {
        title: "Machine Learning Course by Andrew Ng",
        url: "https://www.coursera.org/learn/machine-learning",
        type: "Online Course",
        level: "Beginner",
        description: "Famous ML course covering fundamentals and practical applications"
      },
      {
        title: "Fast.ai Practical Deep Learning",
        url: "https://www.fast.ai/",
        type: "Course",
        level: "Intermediate",
        description: "Practical approach to deep learning for coders"
      },
      {
        title: "Hugging Face Transformers",
        url: "https://huggingface.co/transformers/",
        type: "Library & Tutorials",
        level: "Intermediate",
        description: "State-of-the-art NLP library with extensive documentation"
      }
    ]
  };

  return resourceSets[type] || [
    {
      title: `${topic} Learning Path`,
      url: "https://developer.mozilla.org/",
      type: "Documentation",
      level: "All levels",
      description: `Comprehensive resources for ${topic.toLowerCase()}`
    },
    {
      title: `${topic} Community`,
      url: "https://stackoverflow.com/",
      type: "Community",
      level: "All levels",
      description: `Community support and Q&A for ${topic.toLowerCase()}`
    }
  ];
}

// Main Super Oracle function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody: SuperOracleRequest = await req.json();
    console.log('🔍 Super Oracle request:', requestBody);

    // Validate request
    if (!requestBody.query?.trim()) {
      throw new Error('Query is required');
    }

    const startTime = Date.now();
    let response: SuperOracleResponse = {
      answer: '',
      sources: 0,
      context_used: false,
      model_used: AI_MODELS.openai.model,
      confidence: 0.8,
      processing_time: 0,
      search_strategy: 'standard'
    };

    // Handle different request types
    switch (requestBody.type) {
      case 'resources':
        console.log('📚 Handling resources request');
        const resourceResults = await fetchRealWebResources(requestBody.query);
        response.answer = resourceResults.answer;
        response.resources = resourceResults.resources;
        response.sources = resourceResults.resources?.length || 0;
        response.search_strategy = resourceResults.search_strategy;
        break;

      case 'project_creation':
        console.log('🚀 Handling project creation');
        response.answer = `# Project Creation Guide 🚀

I'll help you create an amazing project! Let's break this down:

## 1. Project Basics
- **Name**: What should we call your project?
- **Description**: What problem does it solve?
- **Goals**: What do you want to achieve?

## 2. Technical Planning
- **Tech Stack**: What technologies will you use?
- **Timeline**: How long do you expect this to take?
- **Team Size**: How many people do you need?

## 3. Collaboration Needs
- **Skills Needed**: What expertise are you looking for?
- **Roles**: Frontend, backend, design, product management?
- **Time Commitment**: How many hours per week?

## 4. Next Steps
1. Use the "Create Team" button in the Gateway
2. Fill out the project details
3. Set collaboration preferences
4. Oracle will help suggest team members!

**Pro Tip**: Be specific about your needs and goals to attract the right collaborators!`;
        response.sources = 1;
        response.confidence = 0.95;
        response.search_strategy = 'project_creation_guide';
        break;

      case 'content_creation':
        console.log('📱 Handling content creation');
        response.answer = `# Creating Engaging Feed Content 📱

Great content helps you connect with other builders and showcase your progress!

## Content Ideas
### Project Updates
- **Milestones**: "Just shipped our MVP! 🚀"
- **Challenges**: "Tackled a complex algorithm today..."
- **Learnings**: "Finally understood React hooks!"

### Collaboration Posts
- **Seeking Help**: "Looking for a UI designer for my fintech app"
- **Offering Skills**: "Happy to help with React questions"
- **Pair Programming**: "Anyone want to tackle LeetCode together?"

## Engagement Tips
1. **Use emojis** to make posts visually appealing
2. **Tag relevant skills** and technologies
3. **Ask questions** to encourage responses
4. **Share specific details** rather than generic updates

**Ready to post?** Share your updates and connect with other builders!`;
        response.sources = 1;
        response.confidence = 0.92;
        response.search_strategy = 'content_creation_guide';
        break;

      case 'connect':
        console.log('🤝 Handling connection request');
        response.answer = `# Collaboration Opportunities 🤝

I'm here to help you find great collaborators!

## How to Connect
1. **Be Specific**: What skills or help do you need?
2. **Offer Value**: What can you provide in return?
3. **Use the Gateway**: Check the Community tab for active builders
4. **Join Teams**: Use access codes to join existing projects

## Best Practices
- Start with small collaborations to build trust
- Be clear about time commitments
- Communicate your project goals clearly
- Use the Builder Feed to showcase your work

**Oracle Tip**: The best collaborations happen when both parties benefit. Be clear about what you're offering and what you need!`;
        response.sources = 1;
        response.confidence = 0.88;
        response.search_strategy = 'collaboration_matching';
        break;

      case 'chat':
      default:
        console.log('💬 Handling chat query');
        const aiResponse = await generateAIResponse(requestBody.query, '', requestBody.context, requestBody.userId, requestBody.teamId);
        response.answer = aiResponse;
        response.sources = 1; // We now have comprehensive user data as a source
        response.context_used = true;
        response.confidence = 0.9; // Higher confidence with comprehensive context
        response.search_strategy = 'ai_chat_with_comprehensive_user_context';
        break;
    }

    response.processing_time = Date.now() - startTime;

    // Log interaction if user provided
    let oracleLogId = null;
    if (requestBody.userId) {
      try {
        const { data: logData, error: logError } = await supabase.from('oracle_logs').insert({
          user_id: requestBody.userId,
          team_id: requestBody.teamId,
          query: requestBody.query.substring(0, 500),
          response: JSON.stringify({
            answer: response.answer.substring(0, 500),
            sources: response.sources,
            context_used: response.context_used,
            model_used: response.model_used,
            confidence: response.confidence,
            processing_time: response.processing_time,
            search_strategy: response.search_strategy
          }),
          query_type: requestBody.type,
          model_used: response.model_used,
          confidence: response.confidence,
          sources: response.sources,
          context_used: response.context_used
        }).select('id').single();
        
        if (logError) throw logError;
        oracleLogId = logData?.id;
      } catch (logError) {
        console.warn('Failed to log Oracle interaction:', logError);
      }
    }

    // Add oracle_log_id to response
    response.oracle_log_id = oracleLogId || undefined;

    console.log('✅ Oracle response completed in', response.processing_time, 'ms');
    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('❌ Super Oracle error:', error);
    
    const errorResponse: SuperOracleResponse = {
      answer: `I apologize, but I encountered an error: ${error.message}. Please try rephrasing your question.`,
      sources: 0,
      context_used: false,
      model_used: 'error_handler',
      confidence: 0.1,
      processing_time: 0,
      search_strategy: 'error_fallback'
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});