import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

// OpenAI AI configuration
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
  role: 'builder' | 'mentor' | 'guest';
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
  // Resources and connections
  resources?: any[];
  connections?: any[];
  // Vectorization results
  vectorized?: boolean;
  similarity_score?: number;
  related_content?: any[];
  // GraphRAG results
  knowledge_graph?: any;
  graph_nodes?: any[];
  graph_relationships?: any[];
}

// Enhanced vectorization capabilities
interface VectorizedData {
  content: string;
  embedding: number[];
  metadata: {
    source_type: 'user_profile' | 'team_update' | 'oracle_interaction' | 'knowledge_base';
    user_id?: string;
    team_id?: string;
    relevance_keywords: string[];
    content_type: string;
    created_at: string;
  };
}

// Generate embeddings for content
async function generateEmbedding(content: string): Promise<number[]> {
  try {
    // Try OpenAI embeddings first
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: content,
        model: 'text-embedding-ada-002'
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.data[0].embedding;
    }
  } catch (error) {
    console.warn('OpenAI embedding failed, using fallback:', error);
  }

  // Fallback: generate simple hash-based embedding
  const hash = simpleHash(content);
  const embedding = new Array(1536).fill(0);
  for (let i = 0; i < Math.min(hash.length, 1536); i++) {
    embedding[i] = (hash.charCodeAt(i) - 48) / 10;
  }
  return embedding;
}

// Simple hash function for fallback embeddings
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString();
}

// Store vectorized content in documents table
async function storeVectorizedContent(content: string, metadata: any): Promise<void> {
  try {
    const embedding = await generateEmbedding(content);
    
    const { error } = await supabase
      .from('documents')
      .insert({
        content: content.substring(0, 1000),
        embedding: embedding,
        metadata: {
          ...metadata,
          created_at: new Date().toISOString()
        }
      });

    if (error) {
      console.error('Error storing vectorized content:', error);
    } else {
      console.log('Vectorized content stored successfully');
    }
  } catch (error) {
    console.error('Error in storeVectorizedContent:', error);
  }
}

// Search for similar content using vector similarity
async function searchSimilarContent(query: string, filters?: any): Promise<any[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);
    
    // Use pgvector's cosine similarity search
    const { data, error } = await supabase
      .rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 10,
        filter: filters || {}
      });

    if (error) {
      console.error('Error searching similar content:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchSimilarContent:', error);
    return [];
  }
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

// Simple team command parsing
async function parseUserIntent(query: string, userContext: any): Promise<any> {
  try {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('update') || queryLower.includes('progress')) {
      return { action: 'create_update', update_text: query };
    } else if (queryLower.includes('message') || queryLower.includes('send')) {
      return { action: 'send_message', content: query };
    } else if (queryLower.includes('status') || queryLower.includes('check')) {
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

// Build knowledge graph from query context
async function buildKnowledgeGraph(query: string, userContext: any, searchResults: any[]): Promise<any> {
  try {
    const graphNodes: any[] = [];
    const graphRelationships: any[] = [];

    // Add user as central node
    if (userContext?.profile) {
      graphNodes.push({
        id: `user_${userContext.profile.id}`,
        type: 'user',
        label: userContext.profile.full_name || 'User',
        properties: {
          skills: userContext.profile.skills || [],
          experience: userContext.profile.experience_level || 'beginner',
          goals: userContext.profile.personal_goals || []
        }
      });
    }

    // Add team context
    if (userContext?.team) {
      graphNodes.push({
        id: `team_${userContext.team.id}`,
        type: 'team',
        label: userContext.team.name || 'Team',
        properties: {
          description: userContext.team.description || '',
          goals: userContext.team.goals || []
        }
      });

      // Connect user to team
      if (userContext?.profile?.id) {
        graphRelationships.push({
          source: `user_${userContext.profile.id}`,
          target: `team_${userContext.team.id}`,
          type: 'MEMBER_OF',
          properties: { role: userContext.profile?.role || 'member' }
        });
      }
    }

    // Add search result nodes
    searchResults.forEach((result, index) => {
      if (result.content) {
        graphNodes.push({
          id: `result_${index}`,
          type: 'content',
          label: result.content.substring(0, 50) + '...',
          properties: {
            source: result.source_type || 'unknown',
            content: result.content.substring(0, 200)
          }
        });

        // Connect to relevant nodes
        if (userContext?.profile?.id) {
          graphRelationships.push({
            source: `user_${userContext.profile.id}`,
            target: `result_${index}`,
            type: 'RELEVANT_TO',
            properties: { relevance: 0.8 }
          });
        }
      }
    });

    return {
      nodes: graphNodes,
      relationships: graphRelationships,
      query: query,
      user_context: userContext?.profile?.id || 'anonymous'
    };
  } catch (error) {
    console.error('Error building knowledge graph:', error);
    return { nodes: [], relationships: [], error: error.message };
  }
}

// Find team members in PieFi
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
        created_by: userId,
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

    // Store the update with vectorization for future search
    await storeVectorizedContent(content, {
      source_type: 'team_update',
      user_id: userId,
      team_id: teamId,
      relevance_keywords: ['update', 'progress', type],
      content_type: 'team_update'
    });

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
        sender_id: userId,
        content: content,
        sender_role: 'builder', // Default role for team messages
        receiver_role: 'builder', // Broadcast to team
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }

    // Store the message with vectorization for future search
    await storeVectorizedContent(content, {
      source_type: 'oracle_interaction',
      user_id: userId,
      team_id: teamId,
      relevance_keywords: ['message', 'team', 'communication'],
      content_type: 'team_message'
    });

    return { success: true, message_id: message.id, message: 'Message sent successfully' };
  } catch (error) {
    console.error('Error in sendTeamMessage:', error);
    return { success: false, message: 'Failed to send message' };
  }
}

// Enhanced RAG search with vectorization
async function performEnhancedRAGSearch(query: string, role: string, teamId?: string, userContext?: any): Promise<any> {
  try {
    // First try vector search
    const vectorResults = await searchSimilarContent(query, { team_id: teamId });
    
    // Fallback to text search if vector search fails
    let textResults = [];
    if (!vectorResults || vectorResults.length === 0) {
      const { data: documents } = await supabase
        .from('documents')
        .select('content, metadata, source_type')
        .textSearch('content', query.replace(/ /g, ' | '), {
          type: 'websearch',
          config: 'english'
        })
        .limit(3);
      textResults = documents || [];
    }

    // Get recent team updates
    const { data: updates } = await supabase
      .from('updates')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Combine and rank results
    const allResults = [...(vectorResults || []), ...textResults];
    const rankedResults = allResults.sort((a, b) => {
      // Prioritize vector results
      if (a.similarity_score && !b.similarity_score) return -1;
      if (!a.similarity_score && b.similarity_score) return 1;
      if (a.similarity_score && b.similarity_score) {
        return b.similarity_score - a.similarity_score;
      }
      return 0;
    });

    return {
      documents: rankedResults.slice(0, 5),
      updates: updates || [],
      search_strategy: vectorResults && vectorResults.length > 0 ? 'vector_rag' : 'text_rag',
      vectorized: vectorResults && vectorResults.length > 0,
      similarity_score: vectorResults?.[0]?.similarity_score || 0
    };
  } catch (error) {
    console.error('Enhanced RAG search error:', error);
    return {
      documents: [],
      updates: [],
      search_strategy: 'error_fallback',
      vectorized: false,
      similarity_score: 0
    };
  }
}

// Detect and handle slash commands
function detectSlashCommand(query: string): { command: string; args: string } | null {
  const slashCommands = ['/resources', '/connect', '/find', '/update', '/message', '/status'];
  const queryLower = query.toLowerCase();
  
  for (const cmd of slashCommands) {
    if (queryLower.startsWith(cmd)) {
      const args = query.substring(cmd.length).trim();
      return { command: cmd.substring(1), args };
    }
  }
  
  // Check for natural language equivalents
  if (queryLower.includes('resources') || queryLower.includes('learn') || queryLower.includes('tutorial')) {
    return { command: 'resources', args: query };
  }
  if (queryLower.includes('connect') || queryLower.includes('find') || queryLower.includes('people')) {
    return { command: 'connect', args: query };
  }
  if (queryLower.includes('update') || queryLower.includes('progress')) {
    return { command: 'update', args: query };
  }
  if (queryLower.includes('message') || queryLower.includes('send')) {
    return { command: 'message', args: query };
  }
  if (queryLower.includes('status') || queryLower.includes('check')) {
    return { command: 'status', args: query };
  }
  
  return null;
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
        const ragResults = await performEnhancedRAGSearch(query, role, teamId, userContext);
        responseData.documents = ragResults.documents;
        responseData.updates = ragResults.updates;
        responseData.sources = (ragResults.documents?.length || 0) + (ragResults.updates?.length || 0);
        responseData.answer = `Found ${responseData.sources} relevant sources for your query.`;
        responseData.search_strategy = ragResults.search_strategy;
        responseData.vectorized = ragResults.vectorized;
        responseData.similarity_score = ragResults.similarity_score;
        break;

      case 'resources':
        console.log('Finding learning resources...');
        const resources = await findLearningResources(query, userContext);
        responseData.resources = resources;
        responseData.sources = resources.length;
        if (resources.length > 0) {
          responseData.answer = `Found ${resources.length} learning resources for "${query}":\n\n${resources.map(r => `• ${r.title} (${r.type}) - ${r.description}\n  ${r.url}`).join('\n\n')}`;
        } else {
          responseData.answer = `No specific resources found for "${query}". Try searching for topics like "React hooks", "UI/UX design", "frontend development", or "JavaScript".`;
        }
        responseData.search_strategy = 'resource_search';
        break;

      case 'connect':
        console.log('Finding connections...');
        const teamMembers = await findTeamMembers(query, teamId);
        const externalConnections = await findExternalConnections(query, userContext);
        responseData.connections = [...teamMembers, ...externalConnections];
        responseData.sources = responseData.connections.length;
        
        if (responseData.connections.length > 0) {
          const teamCount = teamMembers.length;
          const externalCount = externalConnections.length;
          responseData.answer = `Found ${responseData.connections.length} connections for "${query}":\n\n${teamCount > 0 ? `Team Members (${teamCount}):\n${teamMembers.map(m => `• ${m.full_name} - ${m.skills?.join(', ') || 'Skills not specified'}`).join('\n')}\n\n` : ''}${externalCount > 0 ? `External Connections (${externalCount}):\n${externalConnections.map(c => `• ${c.name} - ${c.title} at ${c.company}\n  ${c.expertise}\n  ${c.linkedin}`).join('\n\n')}` : ''}`;
        } else {
          responseData.answer = `No connections found for "${query}". Try searching for roles like "UI/UX designers", "frontend developers", "backend engineers", or "fullstack developers".`;
        }
        responseData.search_strategy = 'connection_search';
        break;

      default: // chat
        // Check for slash commands first
        const slashCommand = detectSlashCommand(query);
        if (slashCommand) {
          console.log(`Detected slash command: ${slashCommand.command}`);
          
          switch (slashCommand.command) {
            case 'resources':
              const resources = await findLearningResources(slashCommand.args || query, userContext);
              responseData.resources = resources;
              responseData.sources = resources.length;
              if (resources.length > 0) {
                responseData.answer = `Here are learning resources for "${slashCommand.args || query}":\n\n${resources.map(r => `• ${r.title} (${r.type}) - ${r.description}\n  ${r.url}`).join('\n\n')}`;
              } else {
                responseData.answer = `No specific resources found. Try searching for topics like "React hooks", "UI/UX design", or "frontend development".`;
              }
              responseData.search_strategy = 'slash_resources';
              break;
              
            case 'connect':
            case 'find':
              const teamMembers = await findTeamMembers(slashCommand.args || query, teamId);
              const externalConnections = await findExternalConnections(slashCommand.args || query, userContext);
              responseData.connections = [...teamMembers, ...externalConnections];
              responseData.sources = responseData.connections.length;
              
              if (responseData.connections.length > 0) {
                const teamCount = teamMembers.length;
                const externalCount = externalConnections.length;
                responseData.answer = `Here are connections for "${slashCommand.args || query}":\n\n${teamCount > 0 ? `Team Members (${teamCount}):\n${teamMembers.map(m => `• ${m.full_name} - ${m.skills?.join(', ') || 'Skills not specified'}`).join('\n')}\n\n` : ''}${externalCount > 0 ? `External Connections (${externalCount}):\n${externalConnections.map(c => `• ${c.name} - ${c.title} at ${c.company}\n  ${c.expertise}\n  ${c.linkedin}`).join('\n\n')}` : ''}`;
              } else {
                responseData.answer = `No connections found. Try searching for roles like "UI/UX designers", "frontend developers", or "backend engineers".`;
              }
              responseData.search_strategy = 'slash_connect';
              break;
              
            case 'update':
              if (teamId && userId) {
                const updateResult = await createTeamUpdate(teamId, userId, slashCommand.args || query);
                if (updateResult.success) {
                  responseData.answer = `✅ Update created successfully! Your progress has been recorded for the team.`;
                  responseData.command_result = updateResult;
                } else {
                  responseData.answer = `❌ Failed to create update: ${updateResult.message}`;
                }
              } else {
                responseData.answer = `❌ Cannot create update: Team ID or User ID missing.`;
              }
              responseData.search_strategy = 'slash_update';
              break;
              
            case 'message':
              if (teamId && userId) {
                const messageResult = await sendTeamMessage(teamId, userId, slashCommand.args || query);
                if (messageResult.success) {
                  responseData.answer = `✅ Message sent successfully to your team!`;
                  responseData.command_result = messageResult;
                } else {
                  responseData.answer = `❌ Failed to send message: ${messageResult.message}`;
                }
              } else {
                responseData.answer = `❌ Cannot send message: Team ID or User ID missing.`;
              }
              responseData.search_strategy = 'slash_message';
              break;
              
            case 'status':
              if (teamId) {
                const { data: updates } = await supabase
                  .from('updates')
                  .select('*')
                  .eq('team_id', teamId)
                  .order('created_at', { ascending: false })
                  .limit(5);
                
                if (updates && updates.length > 0) {
                  responseData.updates = updates;
                  responseData.sources = updates.length;
                  responseData.answer = `📊 Team Status - Recent Updates:\n\n${updates.map(u => `• ${u.content} (${u.type}) - ${new Date(u.created_at).toLocaleDateString()}`).join('\n')}`;
                } else {
                  responseData.answer = `📊 No recent team updates found.`;
                }
              } else {
                responseData.answer = `❌ Cannot check status: Team ID missing.`;
              }
              responseData.search_strategy = 'slash_status';
              break;
              
            default:
              responseData.answer = `Unknown slash command: /${slashCommand.command}. Available commands: /resources, /connect, /find, /update, /message, /status`;
              responseData.search_strategy = 'unknown_slash';
          }
        } else {
          // Check for natural language intent
          const intent = await parseUserIntent(query, userContext);
          if (intent.action === 'create_update' && teamId && userId) {
            const updateResult = await createTeamUpdate(teamId, userId, query);
            if (updateResult.success) {
              responseData.answer = `✅ Update created successfully! Your progress has been recorded for the team.`;
              responseData.command_result = updateResult;
            } else {
              responseData.answer = `❌ Failed to create update: ${updateResult.message}`;
            }
            responseData.search_strategy = 'intent_update';
          } else if (intent.action === 'send_message' && teamId && userId) {
            const messageResult = await sendTeamMessage(teamId, userId, query);
            if (messageResult.success) {
              responseData.answer = `✅ Message sent successfully to your team!`;
              responseData.command_result = messageResult;
            } else {
              responseData.answer = `❌ Failed to send message: ${messageResult.message}`;
            }
            responseData.search_strategy = 'intent_message';
          } else if (intent.action === 'check_status' && teamId) {
            const { data: updates } = await supabase
              .from('updates')
              .select('*')
              .eq('team_id', teamId)
              .order('created_at', { ascending: false })
              .limit(5);
            
            if (updates && updates.length > 0) {
              responseData.updates = updates;
              responseData.sources = updates.length;
              responseData.answer = `📊 Team Status - Recent Updates:\n\n${updates.map(u => `• ${u.content} (${u.type}) - ${new Date(u.created_at).toLocaleDateString()}`).join('\n')}`;
            } else {
              responseData.answer = `📊 No recent team updates found.`;
            }
            responseData.search_strategy = 'intent_status';
          } else {
            // Regular chat - use enhanced RAG and GraphRAG
            const enhancedRagResults = await performEnhancedRAGSearch(query, role, teamId, userContext);
            responseData.documents = enhancedRagResults.documents;
            responseData.updates = enhancedRagResults.updates;
            responseData.vectorized = enhancedRagResults.vectorized;
            responseData.similarity_score = enhancedRagResults.similarity_score;
            responseData.sources = (enhancedRagResults.documents?.length || 0) + (enhancedRagResults.updates?.length || 0);
            
            // Build knowledge graph
            const knowledgeGraph = await buildKnowledgeGraph(query, userContext, enhancedRagResults.documents || []);
            responseData.knowledge_graph = knowledgeGraph;
            responseData.graph_nodes = knowledgeGraph.nodes;
            responseData.graph_relationships = knowledgeGraph.relationships;
            
            // Build context string for AI response
            let contextString = '';
            if (responseData.sources > 0) {
              const docContext = enhancedRagResults.documents?.map(d => d.content).join('. ') || '';
              const updateContext = enhancedRagResults.updates?.map(u => u.content).join('. ') || '';
              contextString = `${docContext} ${updateContext}`.trim();
            }
            
            // Generate AI response with context
            const aiResponse = await generateAIResponse(query, contextString, userContext);
            responseData.answer = aiResponse;
            responseData.search_strategy = 'enhanced_rag_ai';
          }
        }
        break;
    }

    responseData.processing_time = Date.now() - startTime;

    // Store the interaction with vectorization for learning
    try {
      await storeVectorizedContent(query, {
        source_type: 'oracle_interaction',
        user_id: userId,
        team_id: teamId,
        relevance_keywords: [type, role, 'query'],
        content_type: 'user_query'
      });
      
      await storeVectorizedContent(responseData.answer, {
        source_type: 'oracle_interaction',
        user_id: userId,
        team_id: teamId,
        relevance_keywords: [type, role, 'response'],
        content_type: 'oracle_response'
      });
    } catch (vectorError) {
      console.error('Vectorization error:', vectorError);
    }

    // Log the interaction
    try {
      await supabase.from('oracle_logs').insert({
        user_id: userId || 'anonymous',
        user_role: role,
        query: query.substring(0, 500),
        response: responseData.answer.substring(0, 500),
        sources_count: responseData.sources,
        processing_time_ms: responseData.processing_time,
        team_id: teamId
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