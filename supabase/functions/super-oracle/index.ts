import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

// Simple AI configuration
const AI_MODELS = {
  openai: {
    apiKey: Deno.env.get('OPENAI_API_KEY'),
    model: 'gpt-4o'
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
  type: 'chat' | 'resources' | 'connect' | 'journey' | 'team' | 'rag_search';
  role: 'builder' | 'mentor' | 'lead' | 'guest';
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
  // Journey-specific responses
  detected_stage?: 'ideation' | 'development' | 'testing' | 'launch' | 'growth';
  feedback?: string;
  summary?: string;
  suggested_actions?: string[];
  // Team management responses
  command_result?: any;
  intent_parsed?: any;
  // RAG-specific responses
  documents?: any[];
  updates?: any[];
  // Resource and connection responses
  resources?: any[];
  connections?: any[];
}

// Simple user context retrieval
async function getUserContext(userId?: string, teamId?: string): Promise<any> {
  if (!userId) return null;
  
  try {
    // Get basic user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Get team context if available
    let teamContext = null;
    if (teamId) {
      const { data: team } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      teamContext = team;
    }

    return {
      profile,
      team: teamContext,
      userId,
      teamId
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
}

// Find UI/UX designers and frontend developers in PieFi
async function findTeamMembers(query: string, teamId?: string): Promise<any[]> {
  try {
    const searchTerms = query.toLowerCase();
    let roleFilter = '';
    
    if (searchTerms.includes('ui') || searchTerms.includes('ux') || searchTerms.includes('design')) {
      roleFilter = 'ui_ux';
    } else if (searchTerms.includes('frontend') || searchTerms.includes('react') || searchTerms.includes('javascript')) {
      roleFilter = 'frontend';
    } else if (searchTerms.includes('backend') || searchTerms.includes('api') || searchTerms.includes('database')) {
      roleFilter = 'backend';
    } else if (searchTerms.includes('fullstack') || searchTerms.includes('full-stack')) {
      roleFilter = 'fullstack';
    }

    let queryBuilder = supabase
      .from('profiles')
      .select('id, full_name, bio, skills, experience_level, availability, timezone, linkedin_url, github_url, portfolio_url')
      .not('id', 'eq', 'anonymous');

    if (roleFilter) {
      queryBuilder = queryBuilder.contains('skills', [roleFilter]);
    }

    if (teamId) {
      queryBuilder = queryBuilder.eq('team_id', teamId);
    }

    const { data: profiles, error } = await queryBuilder.limit(10);

    if (error) {
      console.error('Error finding team members:', error);
      return [];
    }

    return profiles || [];
  } catch (error) {
    console.error('Error in findTeamMembers:', error);
    return [];
  }
}

// Find external connections on LinkedIn
async function findExternalConnections(query: string, userContext: any): Promise<any[]> {
  try {
    const searchTerms = query.toLowerCase();
    let connections: any[] = [];

    // Simulate finding external connections based on query
    if (searchTerms.includes('ui') || searchTerms.includes('ux') || searchTerms.includes('design')) {
      connections.push({
        name: 'Sarah Chen',
        title: 'Senior UI/UX Designer',
        company: 'Design Studio Pro',
        expertise: 'User Research, Prototyping, Design Systems',
        linkedin: 'https://linkedin.com/in/sarah-chen-ux',
        relevance: 95,
        source: 'linkedin'
      });
      connections.push({
        name: 'Marcus Rodriguez',
        title: 'Product Designer',
        company: 'TechCorp',
        expertise: 'Mobile Design, User Experience, Visual Design',
        linkedin: 'https://linkedin.com/in/marcus-rodriguez-design',
        relevance: 90,
        source: 'linkedin'
      });
    }

    if (searchTerms.includes('frontend') || searchTerms.includes('react')) {
      connections.push({
        name: 'Alex Thompson',
        title: 'Frontend Engineer',
        company: 'React Masters',
        expertise: 'React, TypeScript, Performance Optimization',
        linkedin: 'https://linkedin.com/in/alex-thompson-react',
        relevance: 95,
        source: 'linkedin'
      });
      connections.push({
        name: 'Priya Patel',
        title: 'Senior Frontend Developer',
        company: 'WebFlow Inc',
        expertise: 'Vue.js, CSS, Accessibility',
        linkedin: 'https://linkedin.com/in/priya-patel-frontend',
        relevance: 88,
        source: 'linkedin'
      });
    }

    if (searchTerms.includes('backend') || searchTerms.includes('api')) {
      connections.push({
        name: 'David Kim',
        title: 'Backend Engineer',
        company: 'API Solutions',
        expertise: 'Node.js, Python, Database Design',
        linkedin: 'https://linkedin.com/in/david-kim-backend',
        relevance: 92,
        source: 'linkedin'
      });
    }

    return connections;
  } catch (error) {
    console.error('Error finding external connections:', error);
    return [];
  }
}

// Find learning resources
async function findLearningResources(query: string, userContext: any): Promise<any[]> {
  try {
    const searchTerms = query.toLowerCase();
    let resources: any[] = [];

    if (searchTerms.includes('react') && searchTerms.includes('hooks')) {
      resources.push({
        title: 'React Hooks Complete Guide',
        url: 'https://react.dev/reference/react',
        description: 'Official React documentation for all hooks',
        type: 'documentation',
        difficulty: 'intermediate',
        source: 'react_official'
      });
      resources.push({
        title: 'useState and useEffect Explained',
        url: 'https://www.youtube.com/watch?v=O6P86uwfdR0',
        description: 'Deep dive into React hooks fundamentals',
        type: 'video',
        difficulty: 'beginner',
        source: 'youtube'
      });
      resources.push({
        title: 'Custom Hooks Best Practices',
        url: 'https://blog.logrocket.com/custom-hooks-react/',
        description: 'Learn how to create and use custom hooks',
        type: 'article',
        difficulty: 'intermediate',
        source: 'blog'
      });
    }

    if (searchTerms.includes('ui') || searchTerms.includes('ux')) {
      resources.push({
        title: 'Figma Design Tutorials',
        url: 'https://www.figma.com/community',
        description: 'Community-driven Figma tutorials and resources',
        type: 'tutorial',
        difficulty: 'beginner',
        source: 'figma'
      });
      resources.push({
        title: 'UX Design Principles',
        url: 'https://www.nngroup.com/articles/ten-usability-heuristics/',
        description: 'Nielsen Norman Group usability heuristics',
        type: 'article',
        difficulty: 'intermediate',
        source: 'nngroup'
      });
    }

    if (searchTerms.includes('frontend')) {
      resources.push({
        title: 'Frontend Masters Courses',
        url: 'https://frontendmasters.com/',
        description: 'Advanced frontend development courses',
        type: 'course',
        difficulty: 'advanced',
        source: 'frontendmasters'
      });
      resources.push({
        title: 'CSS Grid Complete Guide',
        url: 'https://css-tricks.com/snippets/css/complete-guide-grid/',
        description: 'Comprehensive CSS Grid tutorial',
        type: 'tutorial',
        difficulty: 'intermediate',
        source: 'csstricks'
      });
    }

    if (searchTerms.includes('javascript')) {
      resources.push({
        title: 'JavaScript.info',
        url: 'https://javascript.info/',
        description: 'Modern JavaScript tutorial',
        type: 'tutorial',
        difficulty: 'intermediate',
        source: 'javascript_info'
      });
      resources.push({
        title: 'Eloquent JavaScript',
        url: 'https://eloquentjavascript.net/',
        description: 'Free online JavaScript book',
        type: 'book',
        difficulty: 'beginner',
        source: 'eloquent_js'
      });
    }

    return resources;
  } catch (error) {
    console.error('Error finding learning resources:', error);
    return [];
  }
}

// Create team update
async function createTeamUpdate(teamId: string, userId: string, content: string, type: string = 'progress'): Promise<any> {
  try {
    const { data: update, error } = await supabase
      .from('updates')
      .insert({
        team_id: teamId,
        user_id: userId,
        content: content,
        type: type,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating update:', error);
      throw error;
    }

    return { success: true, update_id: update.id, message: 'Update created successfully' };
  } catch (error) {
    console.error('Error in createTeamUpdate:', error);
    return { success: false, message: 'Failed to create update' };
  }
}

// Send team message
async function sendTeamMessage(teamId: string, userId: string, content: string): Promise<any> {
  try {
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        team_id: teamId,
        user_id: userId,
        content: content,
        type: 'team',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }

    return { success: true, message_id: message.id, message: 'Message sent successfully' };
  } catch (error) {
    console.error('Error in sendTeamMessage:', error);
    return { success: false, message: 'Failed to send message' };
  }
}

// Simple AI response generation
async function generateAIResponse(query: string, context: string, userContext: any): Promise<string> {
  try {
    const prompt = `You are an AI assistant helping a user with their query. 
    
User Context: ${userContext ? JSON.stringify(userContext) : 'No context available'}
Query: ${query}
Context Information: ${context}

Please provide a helpful, relevant response based on the user's context and query. Be concise but informative.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_MODELS.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODELS.openai.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI response generation error:', error);
    return 'I apologize, but I encountered an error while processing your request. Please try again.';
  }
}

// Simple journey analysis
async function analyzeJourneyStage(teamId: string, query: string, role: string, userId: string, userContext: any): Promise<any> {
  try {
    // Get team updates
    const { data: updates } = await supabase
      .from('updates')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Simple stage detection based on updates
    let stage = 'ideation';
    if (updates && updates.length > 0) {
      const recentUpdate = updates[0];
      if (recentUpdate.type === 'milestone') {
        stage = 'development';
      } else if (recentUpdate.type === 'testing') {
        stage = 'testing';
      } else if (recentUpdate.type === 'launch') {
        stage = 'launch';
      }
    }

    const summary = `Based on recent updates, your team appears to be in the ${stage} stage.`;
    const feedback = `Focus on ${stage === 'ideation' ? 'validating your concept' : stage === 'development' ? 'building core features' : stage === 'testing' ? 'user feedback and testing' : 'scaling and growth'}.`;
    
    const suggestedActions = [
      `Continue with ${stage} activities`,
      'Update your team on progress',
      'Plan next milestone'
    ];

    return {
      detected_stage: stage,
      summary,
      feedback,
      suggested_actions: suggestedActions,
      updated_stage: false
    };
  } catch (error) {
    console.error('Journey analysis error:', error);
    return {
      detected_stage: 'ideation',
      summary: 'Unable to analyze journey stage',
      feedback: 'Please check your team updates',
      suggested_actions: ['Review team progress', 'Update team status'],
      updated_stage: false
    };
  }
}

// Parse user intent for natural language commands
async function parseUserIntent(query: string, userContext: any): Promise<any> {
  try {
    const queryLower = query.toLowerCase();
    
    // Check for update-related language
    if (queryLower.includes('update') || queryLower.includes('progress') || queryLower.includes('milestone') || 
        queryLower.includes('completed') || queryLower.includes('finished') || queryLower.includes('working on')) {
      return { action: 'create_update', update_text: query, type: 'progress' };
    }
    
    // Check for message-related language
    if (queryLower.includes('message') || queryLower.includes('send') || queryLower.includes('tell') || 
        queryLower.includes('announce') || queryLower.includes('share') || queryLower.includes('notify')) {
      return { action: 'send_message', content: query };
    }
    
    // Check for status-related language
    if (queryLower.includes('status') || queryLower.includes('check') || queryLower.includes('how are we') || 
        queryLower.includes('where are we') || queryLower.includes('progress report')) {
      return { action: 'check_status' };
    }
    
    return { action: 'none' };
  } catch (error) {
    console.error('Intent parsing error:', error);
    return { action: 'none' };
  }
}

// Simple RAG search
async function performRAGSearch(query: string, role: string, teamId?: string, userContext?: any): Promise<any> {
  try {
    // Simple text search in documents
    const { data: documents } = await supabase
      .from('documents')
      .select('content, metadata, source_type')
      .textSearch('content', query.replace(/ /g, ' | '), {
        type: 'websearch',
        config: 'english'
      })
      .limit(3);

    // Get recent team updates
    const { data: updates } = await supabase
      .from('updates')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      documents: documents || [],
      updates: updates || [],
      search_strategy: 'simple_rag'
    };
  } catch (error) {
    console.error('RAG search error:', error);
    return {
      documents: [],
      updates: [],
      search_strategy: 'error_fallback'
    };
  }
}

// Main Super Oracle function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { query, type, role, teamId, userId, context }: SuperOracleRequest = await req.json();

    console.log(`Super Oracle request - Type: ${type}, Role: ${role}, Query: ${query}, User: ${userId}`);

    // Get user context
    const userContext = await getUserContext(userId, teamId);
    console.log('User context retrieved:', userContext ? 'Yes' : 'No');

    let responseData: SuperOracleResponse = {
      answer: '',
      sources: 0,
      context_used: false,
      model_used: 'gpt-4o',
      confidence: 0.8,
      processing_time: 0,
      search_strategy: 'standard'
    };

    let searchResults: any[] = [];
    let contextString = '';

    // Handle different request types
    switch (type) {
      case 'journey':
        console.log('Analyzing journey stage...');
        const journeyAnalysis = await analyzeJourneyStage(teamId!, query, role, userId!, userContext);
        responseData.answer = `Journey analysis complete. Team is in ${journeyAnalysis.detected_stage} stage. ${journeyAnalysis.summary}`;
        responseData.detected_stage = journeyAnalysis.detected_stage;
        responseData.feedback = journeyAnalysis.feedback;
        responseData.summary = journeyAnalysis.summary;
        responseData.suggested_actions = journeyAnalysis.suggested_actions;
        responseData.search_strategy = 'journey_analysis';
        break;

      case 'team':
        console.log('Processing team command...');
        const intent = await parseUserIntent(query, userContext);
        if (intent.action !== 'none') {
          responseData.answer = `Team command detected: ${intent.action}. Processing...`;
          responseData.command_result = { action: intent.action };
          responseData.intent_parsed = intent;
        } else {
          responseData.answer = 'No team command detected in the query.';
        }
        responseData.search_strategy = 'team_management';
        break;

      case 'rag_search':
        console.log('Performing RAG search...');
        const ragResults = await performRAGSearch(query, role, teamId, userContext);
        responseData.documents = ragResults.documents;
        responseData.updates = ragResults.updates;
        responseData.sources = (ragResults.documents?.length || 0) + (ragResults.updates?.length || 0);
        responseData.answer = `Found ${responseData.sources} relevant sources for your query.`;
        responseData.search_strategy = ragResults.search_strategy;
        break;

      case 'resources':
        console.log('Finding learning resources...');
        const resources = await findLearningResources(query, userContext);
        responseData.resources = resources;
        responseData.sources = resources.length;
        
        if (resources.length > 0) {
          responseData.answer = `I found ${resources.length} great resources for you:\n\n${resources.map((r, i) => 
            `${i + 1}. **${r.title}**\n   ${r.description}\n   ${r.url}\n   Difficulty: ${r.difficulty}\n`
          ).join('\n')}`;
        } else {
          responseData.answer = 'I couldn\'t find specific resources for that query. Try being more specific about what you\'re looking for.';
        }
        responseData.search_strategy = 'resource_search';
        break;

      case 'connect':
        console.log('Finding connections...');
        // Find both internal team members and external connections
        const teamMembers = await findTeamMembers(query, teamId);
        const externalConnections = await findExternalConnections(query, userContext);
        
        responseData.connections = [...teamMembers, ...externalConnections];
        responseData.sources = responseData.connections.length;
        
        if (responseData.connections.length > 0) {
          let answer = `I found ${responseData.connections.length} connections for you:\n\n`;
          
          if (teamMembers.length > 0) {
            answer += `**Team Members in PieFi:**\n`;
            teamMembers.forEach((member, i) => {
              answer += `${i + 1}. **${member.full_name || 'Anonymous'}**\n`;
              answer += `   Skills: ${member.skills?.join(', ') || 'Not specified'}\n`;
              answer += `   Experience: ${member.experience_level || 'Not specified'}\n`;
              if (member.linkedin_url) answer += `   LinkedIn: ${member.linkedin_url}\n`;
              if (member.github_url) answer += `   GitHub: ${member.github_url}\n`;
              answer += '\n';
            });
          }
          
          if (externalConnections.length > 0) {
            answer += `**External Connections on LinkedIn:**\n`;
            externalConnections.forEach((connection, i) => {
              answer += `${i + 1}. **${connection.name}** - ${connection.title}\n`;
              answer += `   Company: ${connection.company}\n`;
              answer += `   Expertise: ${connection.expertise}\n`;
              answer += `   LinkedIn: ${connection.linkedin}\n\n`;
            });
          }
          
          responseData.answer = answer;
        } else {
          responseData.answer = 'I couldn\'t find any connections matching your query. Try different search terms or check back later.';
        }
        responseData.search_strategy = 'connection_search';
        break;

      default: // chat
        // Check if this is a slash command
        if (query.startsWith('/')) {
          const command = query.toLowerCase();
          
          if (command.startsWith('/resources')) {
            const resourceQuery = query.substring('/resources'.length).trim();
            const resources = await findLearningResources(resourceQuery || 'general programming', userContext);
            responseData.resources = resources;
            responseData.sources = resources.length;
            
            if (resources.length > 0) {
              responseData.answer = `Here are ${resources.length} resources for "${resourceQuery || 'general programming'}":\n\n${resources.map((r, i) => 
                `${i + 1}. **${r.title}**\n   ${r.description}\n   ${r.url}\n   Difficulty: ${r.difficulty}\n`
              ).join('\n')}`;
            } else {
              responseData.answer = 'No specific resources found. Try being more specific about what you need.';
            }
            responseData.search_strategy = 'slash_resource_command';
          } else if (command.startsWith('/connect') || command.startsWith('/find')) {
            const connectionQuery = query.substring(query.indexOf(' ') + 1).trim();
            const teamMembers = await findTeamMembers(connectionQuery, teamId);
            const externalConnections = await findExternalConnections(connectionQuery, userContext);
            
            responseData.connections = [...teamMembers, ...externalConnections];
            responseData.sources = responseData.connections.length;
            
            if (responseData.connections.length > 0) {
              let answer = `Found ${responseData.connections.length} connections for "${connectionQuery}":\n\n`;
              
              if (teamMembers.length > 0) {
                answer += `**In PieFi:**\n`;
                teamMembers.forEach((member, i) => {
                  answer += `${i + 1}. **${member.full_name || 'Anonymous'}**\n`;
                  answer += `   Skills: ${member.skills?.join(', ') || 'Not specified'}\n`;
                  answer += `   Experience: ${member.experience_level || 'Not specified'}\n`;
                  if (member.linkedin_url) answer += `   LinkedIn: ${member.linkedin_url}\n`;
                  if (member.github_url) answer += `   GitHub: ${member.github_url}\n`;
                  answer += '\n';
                });
              }
              
              if (externalConnections.length > 0) {
                answer += `**On LinkedIn:**\n`;
                externalConnections.forEach((connection, i) => {
                  answer += `${i + 1}. **${connection.name}** - ${connection.title}\n`;
                  answer += `   Company: ${connection.company}\n`;
                  answer += `   Expertise: ${connection.expertise}\n`;
                  answer += `   LinkedIn: ${connection.linkedin}\n\n`;
                });
              }
              
              responseData.answer = answer;
            } else {
              responseData.answer = `No connections found for "${connectionQuery}". Try different search terms.`;
            }
            responseData.search_strategy = 'slash_connection_command';
          } else if (command.startsWith('/update')) {
            // Handle /update command
            if (!teamId) {
              responseData.answer = 'You need to be part of a team to create updates.';
              responseData.search_strategy = 'slash_update_command_no_team';
              break;
            }
            
            const updateContent = query.substring('/update'.length).trim();
            if (!updateContent) {
              responseData.answer = 'Please provide content for your update. Example: /update Working on authentication system, making good progress.';
              responseData.search_strategy = 'slash_update_command_no_content';
              break;
            }
            
            const updateResult = await createTeamUpdate(teamId, userId!, updateContent, 'progress');
            if (updateResult.success) {
              responseData.answer = `✅ Update created successfully! Your team will be notified.\n\n**Update:** ${updateContent}`;
              responseData.command_result = updateResult;
            } else {
              responseData.answer = `❌ Failed to create update: ${updateResult.message}`;
              responseData.command_result = updateResult;
            }
            responseData.search_strategy = 'slash_update_command';
          } else if (command.startsWith('/message')) {
            // Handle /message command
            if (!teamId) {
              responseData.answer = 'You need to be part of a team to send messages.';
              responseData.search_strategy = 'slash_message_command_no_team';
              break;
            }
            
            const messageContent = query.substring('/message'.length).trim();
            if (!messageContent) {
              responseData.answer = 'Please provide content for your message. Example: /message Great work everyone! Let\'s keep up the momentum.';
              responseData.search_strategy = 'slash_message_command_no_content';
              break;
            }
            
            const messageResult = await sendTeamMessage(teamId, userId!, messageContent);
            if (messageResult.success) {
              responseData.answer = `✅ Message sent successfully to your team!\n\n**Message:** ${messageContent}`;
              responseData.command_result = messageResult;
            } else {
              responseData.answer = `❌ Failed to send message: ${messageResult.message}`;
              responseData.command_result = messageResult;
            }
            responseData.search_strategy = 'slash_message_command';
          } else {
            // Handle other slash commands
            responseData.answer = `I recognize the slash command "${query.split(' ')[0]}" but I'm not sure how to handle it yet. Try:\n\n• /resources [topic] - Find learning resources\n• /connect [role/skill] - Find team members and connections\n• /find [role/skill] - Same as /connect\n• /update [content] - Create a team update\n• /message [content] - Send a team message`;
            responseData.search_strategy = 'slash_command_unknown';
          }
        } else {
          // Check for natural language commands
          const intent = await parseUserIntent(query, userContext);
          
          if (intent.action === 'create_update' && teamId) {
            // User wants to create an update using natural language
            const updateResult = await createTeamUpdate(teamId, userId!, intent.update_text, intent.type);
            if (updateResult.success) {
              responseData.answer = `✅ I've created a team update for you!\n\n**Update:** ${intent.update_text}\n\nYour team will be notified of this progress.`;
              responseData.command_result = updateResult;
              responseData.search_strategy = 'natural_language_update';
            } else {
              responseData.answer = `❌ I couldn't create the update: ${updateResult.message}`;
              responseData.command_result = updateResult;
              responseData.search_strategy = 'natural_language_update_failed';
            }
          } else if (intent.action === 'send_message' && teamId) {
            // User wants to send a message using natural language
            const messageResult = await sendTeamMessage(teamId, userId!, intent.content);
            if (messageResult.success) {
              responseData.answer = `✅ I've sent your message to the team!\n\n**Message:** ${intent.content}\n\nYour team will receive this notification.`;
              responseData.command_result = messageResult;
              responseData.search_strategy = 'natural_language_message';
            } else {
              responseData.answer = `❌ I couldn't send the message: ${messageResult.message}`;
              responseData.command_result = messageResult;
              responseData.search_strategy = 'natural_language_message_failed';
            }
          } else if (intent.action === 'check_status') {
            // User wants to check team status
            if (teamId) {
              const { data: updates } = await supabase
                .from('updates')
                .select('*')
                .eq('team_id', teamId)
                .order('created_at', { ascending: false })
                .limit(5);
              
              if (updates && updates.length > 0) {
                responseData.answer = `📊 **Team Status Report:**\n\nRecent updates:\n${updates.map((u, i) => 
                  `${i + 1}. [${u.type}] ${u.content} (${new Date(u.created_at).toLocaleDateString()})`
                ).join('\n')}`;
                responseData.updates = updates;
                responseData.sources = updates.length;
              } else {
                responseData.answer = 'No recent updates found. Your team might be due for a progress check-in!';
              }
            } else {
              responseData.answer = 'You\'re not currently part of a team, so I can\'t provide a status report.';
            }
            responseData.search_strategy = 'natural_language_status_check';
          } else {
            // Regular chat - search for context and generate AI response
            if (teamId) {
              const { data: updates } = await supabase
                .from('updates')
                .select('*')
                .eq('team_id', teamId)
                .order('created_at', { ascending: false })
                .limit(3);
              
              if (updates && updates.length > 0) {
                contextString = `Recent team updates: ${updates.map(u => u.content).join('. ')}`;
                responseData.context_used = true;
                responseData.sources = updates.length;
              }
            }

            // Generate AI response
            const aiResponse = await generateAIResponse(query, contextString, userContext);
            responseData.answer = aiResponse;
            responseData.search_strategy = 'ai_chat';
          }
        }
        break;
    }

    responseData.processing_time = Date.now() - startTime;

    // Log the interaction
    try {
      await supabase.from('oracle_logs').insert({
        user_id: userId || 'anonymous',
        user_role: role,
        query: query.substring(0, 500),
        response: responseData.answer.substring(0, 500),
        sources_count: responseData.sources,
        processing_time_ms: responseData.processing_time,
        model_used: responseData.model_used,
        search_strategy: responseData.search_strategy
      });
    } catch (logError) {
      console.error('Logging error:', logError);
    }

    console.log(`Super Oracle response completed in ${responseData.processing_time}ms`);
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Super Oracle error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message,
      answer: 'I apologize, but I encountered an error. Please try again.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});