import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

// Multi-model AI configuration
const AI_MODELS = {
  openai: {
    apiKey: Deno.env.get('OPENAI_API_KEY'),
    models: {
      primary: 'gpt-4o',
      fallback: 'gpt-4o-mini',
      backup: 'gpt-3.5-turbo',
      embeddings: 'text-embedding-3-large'
    }
  },
  gemini: {
    apiKey: Deno.env.get('GOOGLE_API_KEY'),
    models: {
      primary: 'gemini-1.5-pro',
      fallback: 'gemini-1.5-flash'
    }
  },
  claude: {
    apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    models: {
      primary: 'claude-3-5-sonnet-20241022',
      fallback: 'claude-3-haiku-20240307'
    }
  }
};

// GraphRAG Configuration
const GRAPHRAG_CONFIG = {
  maxGraphDepth: 3,
  maxRelationships: 10,
  minConfidence: 0.7,
  enableEntityExtraction: true,
  enableRelationshipMining: true,
  enableGraphTraversal: true,
  maxContextNodes: 15,
  enableHybridSearch: true
};

// Enhanced RAG configuration with web search
const RAG_CONFIG = {
  maxContextTokens: 8000,
  minRelevanceThreshold: 0.7,
  maxDocuments: 8,
  enableSemanticReranking: true,
  enableHybridSearch: true,
  enableWebSearch: true,
  maxWebResults: 3,
  webSearchFrequency: 'conservative', // 'conservative', 'moderate', 'aggressive'
  webSearchQueries: [
    'latest', 'current', 'recent', 'trend', 'news', 'update', '2024', '2025',
    'new', 'emerging', 'industry', 'market', 'technology', 'innovation',
    'best practice', 'methodology', 'framework', 'guide', 'tutorial'
  ]
};

// Vector Search Configuration
const VECTOR_CONFIG = {
  dimensions: 1536,
  similarityThreshold: 0.75,
  maxResults: 20,
  enableReranking: true,
  enableHybridSearch: true,
  maxTokens: 8000
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
  type: 'chat' | 'resources' | 'connect' | 'analyze' | 'graph' | 'multi_model';
  role: 'builder' | 'mentor' | 'lead' | 'guest';
  teamId?: string;
  userId?: string;
  context?: any;
  preferredModel?: 'openai' | 'gemini' | 'claude' | 'auto';
  enableGraphRAG?: boolean;
  enableMultiModel?: boolean;
}

interface SuperOracleResponse {
  answer: string;
  sources: number;
  context_used: boolean;
  model_used: string;
  confidence: number;
  processing_time: number;
  graph_data?: any;
  multi_model_insights?: any;
  resources?: any[];
  connections?: any[];
  entities?: any[];
  relationships?: any[];
  search_strategy: string;
  fallback_used: boolean;
}

// Intelligent Model Router - Choose the best AI model for the task
async function selectOptimalModel(query: string, type: string, preferredModel?: string): Promise<{
  model: 'openai' | 'gemini' | 'claude';
  reason: string;
  confidence: number;
}> {
  if (preferredModel && preferredModel !== 'auto') {
    return { model: preferredModel, reason: 'User preference', confidence: 0.9 };
  }

  const queryLower = query.toLowerCase();
  
  // Analyze query characteristics
  const characteristics = {
    technical: ['code', 'programming', 'api', 'database', 'algorithm', 'architecture'],
    creative: ['design', 'story', 'narrative', 'creative', 'artistic', 'branding'],
    analytical: ['analysis', 'data', 'metrics', 'performance', 'optimization', 'strategy'],
    conversational: ['chat', 'help', 'advice', 'guidance', 'mentoring', 'coaching']
  };

  let scores = {
    openai: 0,
    gemini: 0,
    claude: 0
  };

  // Score based on query characteristics
  if (characteristics.technical.some(term => queryLower.includes(term))) {
    scores.openai += 3; // OpenAI excels at technical tasks
    scores.gemini += 2;
    scores.claude += 2;
  }
  
  if (characteristics.creative.some(term => queryLower.includes(term))) {
    scores.gemini += 3; // Gemini is strong on creative tasks
    scores.openai += 2;
    scores.claude += 2;
  }
  
  if (characteristics.analytical.some(term => queryLower.includes(term))) {
    scores.claude += 3; // Claude excels at analysis
    scores.openai += 2;
    scores.gemini += 1;
  }
  
  if (characteristics.conversational.some(term => queryLower.includes(term))) {
    scores.claude += 2; // Claude is great at conversation
    scores.openai += 2;
    scores.gemini += 2;
  }

  // Score based on query type
  switch (type) {
    case 'resources':
      scores.gemini += 2; // Gemini is good at finding resources
      break;
    case 'connect':
      scores.openai += 2; // OpenAI is good at networking
      break;
    case 'analyze':
      scores.claude += 3; // Claude excels at analysis
      break;
    case 'graph':
      scores.openai += 2; // OpenAI is good at structured data
      break;
  }

  // Find the best model
  const bestModel = Object.entries(scores).reduce((a, b) => scores[a[0] as keyof typeof scores] > scores[b[0] as keyof typeof scores] ? a : b)[0] as keyof typeof scores;
  
  return {
    model: bestModel,
    reason: `Best match for ${type} query with ${bestModel} characteristics`,
    confidence: scores[bestModel] / 10
  };
}

// GraphRAG: Build knowledge graph from query context
async function buildKnowledgeGraph(query: string, context: any): Promise<any> {
  try {
    console.log('Building knowledge graph for query:', query);
    
    // Extract entities from the query
    const entities = await extractEntities(query);
    
    // Find related entities in the knowledge base
    const relatedEntities = await findRelatedEntities(entities);
    
    // Build relationship graph
    const relationships = await buildRelationships(entities, relatedEntities);
    
    // Traverse the graph to find relevant context
    const graphContext = await traverseGraph(entities, relationships);
    
    return {
      entities,
      relationships,
      context: graphContext,
      confidence: calculateGraphConfidence(graphContext)
    };
  } catch (error) {
    console.error('Error building knowledge graph:', error);
    return null;
  }
}

// Extract entities from text using AI
async function extractEntities(text: string): Promise<any[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_MODELS.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODELS.openai.models.primary,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: 'Extract key entities from the text. Return as JSON array with objects containing: name, type (person/company/technology/concept), relevance (0-1), description.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 500
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    try {
      return JSON.parse(content);
    } catch {
      return [];
    }
  } catch (error) {
    console.error('Error extracting entities:', error);
    return [];
  }
}

// Find related entities in knowledge base
async function findRelatedEntities(entities: any[]): Promise<any[]> {
  const related: any[] = [];
  
  for (const entity of entities) {
    try {
      // Search for related entities in the database
      const { data: relatedDocs } = await supabase
        .from('documents')
        .select('*')
        .textSearch('content', entity.name)
        .limit(5);
      
      if (relatedDocs) {
        related.push(...relatedDocs.map(doc => ({
          name: doc.metadata?.title || 'Unknown',
          type: 'document',
          relevance: 0.8,
          description: doc.content.substring(0, 200),
          source: doc.id
        })));
      }
    } catch (error) {
      console.error('Error finding related entities:', error);
    }
  }
  
  return related;
}

// Build relationships between entities
async function buildRelationships(entities: any[], relatedEntities: any[]): Promise<any[]> {
  const relationships: any[] = [];
  
  // Build relationships between main entities
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      relationships.push({
        source: entities[i].name,
        target: entities[j].name,
        type: 'related',
        confidence: 0.8,
        description: `${entities[i].name} is related to ${entities[j].name}`
      });
    }
  }
  
  // Build relationships with related entities
  entities.forEach(entity => {
    relatedEntities.forEach(related => {
      relationships.push({
        source: entity.name,
        target: related.name,
        type: 'references',
        confidence: 0.7,
        description: `${entity.name} references ${related.name}`
      });
    });
  });
  
  return relationships;
}

// Traverse the knowledge graph
async function traverseGraph(entities: any[], relationships: any[]): Promise<any[]> {
  const visited = new Set();
  const context: any[] = [];
  
  // Breadth-first traversal
  const queue = [...entities];
  
  while (queue.length > 0 && context.length < GRAPHRAG_CONFIG.maxContextNodes) {
    const current = queue.shift();
    if (!current || visited.has(current.name)) continue;
    
    visited.add(current.name);
    context.push(current);
    
    // Find related entities
    const related = relationships
      .filter(rel => rel.source === current.name || rel.target === current.name)
      .map(rel => rel.source === current.name ? rel.target : rel.source);
    
    queue.push(...related.filter(name => !visited.has(name)));
  }
  
  return context;
}

// Calculate graph confidence
function calculateGraphConfidence(context: any[]): number {
  if (context.length === 0) return 0;
  
  const avgRelevance = context.reduce((sum, entity) => sum + (entity.relevance || 0.5), 0) / context.length;
  const coverage = Math.min(context.length / GRAPHRAG_CONFIG.maxContextNodes, 1);
  
  return (avgRelevance * 0.7) + (coverage * 0.3);
}

// Multi-model AI response generation
async function generateMultiModelResponse(query: string, context: any, graphData?: any): Promise<any> {
  const insights: any = {};
  
  try {
    // Generate responses from all models
    const [openaiResponse, geminiResponse, claudeResponse] = await Promise.allSettled([
      generateOpenAIResponse(query, context, graphData),
      generateGeminiResponse(query, context, graphData),
      generateClaudeResponse(query, context, graphData)
    ]);
    
    // Collect successful responses
    if (openaiResponse.status === 'fulfilled') {
      insights.openai = openaiResponse.value;
    }
    if (geminiResponse.status === 'fulfilled') {
      insights.gemini = geminiResponse.value;
    }
    if (claudeResponse.status === 'fulfilled') {
      insights.claude = claudeResponse.value;
    }
    
    // Synthesize the best response
    const synthesizedResponse = await synthesizeResponses(insights, query);
    
    return {
      answer: synthesizedResponse,
      insights,
      confidence: calculateMultiModelConfidence(insights)
    };
    
  } catch (error) {
    console.error('Error in multi-model response generation:', error);
    return {
      answer: "I'm experiencing difficulties with multi-model processing. Let me use a single model instead.",
      insights: {},
      confidence: 0.5
    };
  }
}

// Generate OpenAI response
async function generateOpenAIResponse(query: string, context: any, graphData?: any): Promise<any> {
  if (!AI_MODELS.openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const systemPrompt = `You are the Super Oracle, an advanced AI assistant with access to knowledge graphs and multiple AI models.

Context: ${JSON.stringify(context)}
${graphData ? `Knowledge Graph: ${JSON.stringify(graphData)}` : ''}

Provide a comprehensive, helpful response that leverages the available context and knowledge graph.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_MODELS.openai.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODELS.openai.models.primary,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      max_tokens: 800
    })
  });

  const data = await response.json();
  return {
    answer: data.choices?.[0]?.message?.content || 'OpenAI response unavailable',
    model: 'gpt-4o',
    confidence: 0.85
  };
}

// Generate Gemini response
async function generateGeminiResponse(query: string, context: any, graphData?: any): Promise<any> {
  if (!AI_MODELS.gemini.apiKey) {
    throw new Error('Gemini API key not configured');
  }
  
  const prompt = `You are the Super Oracle, an advanced AI assistant with access to knowledge graphs and multiple AI models.

Context: ${JSON.stringify(context)}
${graphData ? `Knowledge Graph: ${JSON.stringify(graphData)}` : ''}

Query: ${query}

Provide a comprehensive, helpful response that leverages the available context and knowledge graph.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.gemini.models.primary}:generateContent?key=${AI_MODELS.gemini.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    })
  });

  const data = await response.json();
  return {
    answer: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Gemini response unavailable',
    model: 'gemini-1.5-pro',
    confidence: 0.8
  };
}

// Generate Claude response
async function generateClaudeResponse(query: string, context: any, graphData?: any): Promise<any> {
  if (!AI_MODELS.claude.apiKey) {
    throw new Error('Claude API key not configured');
  }
  
  const systemPrompt = `You are the Super Oracle, an advanced AI assistant with access to knowledge graphs and multiple AI models.

Context: ${JSON.stringify(context)}
${graphData ? `Knowledge Graph: ${JSON.stringify(graphData)}` : ''}

Provide a comprehensive, helpful response that leverages the available context and knowledge graph.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_MODELS.claude.apiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: AI_MODELS.claude.models.primary,
      max_tokens: 800,
      messages: [
        { role: 'user', content: `${systemPrompt}\n\nQuery: ${query}` }
      ]
    })
  });

  const data = await response.json();
  return {
    answer: data.content?.[0]?.text || 'Claude response unavailable',
    model: 'claude-3-5-sonnet',
    confidence: 0.85
  };
}

// Synthesize responses from multiple models
async function synthesizeResponses(insights: any, query: string): Promise<string> {
  const responses = Object.values(insights).map((insight: any) => insight.answer).filter(Boolean);
  
  if (responses.length === 0) {
    return "I'm unable to generate a response at the moment. Please try again.";
  }
  
  if (responses.length === 1) {
    return responses[0];
  }
  
  // Use the most confident model's response as primary
  const bestResponse = Object.values(insights).reduce((best: any, current: any) => 
    current.confidence > best.confidence ? current : best
  );
  
  return bestResponse.answer;
}

// Calculate confidence from multi-model responses
function calculateMultiModelConfidence(insights: any): number {
  const responses = Object.values(insights);
  if (responses.length === 0) return 0;
  
  const avgConfidence = responses.reduce((sum: number, insight: any) => sum + insight.confidence, 0) / responses.length;
  const modelCount = responses.length;
  
  // Boost confidence based on model agreement
  const agreementBonus = modelCount > 1 ? 0.1 : 0;
  
  return Math.min(avgConfidence + agreementBonus, 1.0);
}

// Enhanced vector search with GraphRAG and web search integration
async function enhancedVectorSearch(query: string, context: any, role: string, teamId?: string): Promise<any> {
  try {
    // Generate embeddings for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Perform vector search
    const { data: vectorResults } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: VECTOR_CONFIG.similarityThreshold,
      match_count: VECTOR_CONFIG.maxResults
    });
    
    // Enhance with GraphRAG context
    let enhancedResults = vectorResults || [];
    if (context && context.length > 0) {
      enhancedResults = await enhanceWithGraphContext(enhancedResults, context);
    }
    
    // Integrate web search when needed (only for external queries)
    const webResults = await webSearch(query, role, teamId, enhancedResults);
    if (webResults && webResults.length > 0) {
      // Combine internal and web results, prioritizing internal knowledge
      const combinedResults = [
        ...enhancedResults.slice(0, Math.floor(VECTOR_CONFIG.maxResults / 2)),
        ...webResults.slice(0, Math.floor(VECTOR_CONFIG.maxResults / 2))
      ];
      
      // Sort by relevance and source priority
      return combinedResults.sort((a, b) => {
        // Prioritize internal results over web results
        const aPriority = a.source === 'web_search' ? 0.5 : 1.0;
        const bPriority = b.source === 'web_search' ? 0.5 : 1.0;
        
        return (b.relevance * bPriority) - (a.relevance * aPriority);
      });
    }
    
    return enhancedResults;
  } catch (error) {
    console.error('Error in enhanced vector search:', error);
    return [];
  }
}

// Generate embeddings using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_MODELS.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: AI_MODELS.openai.models.embeddings
      })
    });

    const data = await response.json();
    return data.data?.[0]?.embedding || [];
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
}

// Enhance search results with graph context
async function enhanceWithGraphContext(results: any[], context: any[]): Promise<any[]> {
  const enhanced = results.map(result => {
    const contextRelevance = context.reduce((score, entity) => {
      if (result.content.toLowerCase().includes(entity.name.toLowerCase())) {
        return score + (entity.relevance || 0.5);
      }
      return score;
    }, 0);
    
    return {
      ...result,
      graph_relevance: contextRelevance,
      enhanced_score: (result.similarity || 0.5) + (contextRelevance * 0.3)
    };
  });
  
  // Sort by enhanced score
  return enhanced.sort((a, b) => b.enhanced_score - a.enhanced_score);
}

// Main Super Oracle function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { query, type, role, teamId, userId, context, preferredModel, enableGraphRAG, enableMultiModel }: SuperOracleRequest = await req.json();

    console.log(`Super Oracle request - Type: ${type}, Role: ${role}, Query: ${query}, User: ${userId}`);

    // Get comprehensive user context from database using onboarding data
    const userContext = await getUserContextFromDatabase(userId, teamId);
    console.log('User context retrieved:', userContext ? 'Yes' : 'No');

    // Select optimal AI model with personalization
    const modelSelection = await selectOptimalModel(query, type, preferredModel, userContext);
    console.log(`Selected model: ${modelSelection.model} (${modelSelection.reason})`);

    let responseData: SuperOracleResponse = {
      answer: '',
      sources: 0,
      context_used: false,
      model_used: modelSelection.model,
      confidence: modelSelection.confidence,
      processing_time: 0,
      search_strategy: 'standard',
      fallback_used: false
    };

    // Build knowledge graph if GraphRAG is enabled
    let graphData = null;
    if (enableGraphRAG) {
      console.log('Building knowledge graph...');
      graphData = await buildKnowledgeGraph(query, userContext);
      if (graphData) {
        responseData.graph_data = graphData;
        responseData.context_used = true;
        responseData.search_strategy = 'graphrag_enhanced';
      }
    }

    // Enhanced vector search with personalization
    const searchResults = await enhancedVectorSearch(query, graphData?.context || [], role, teamId, userContext);
    responseData.sources = searchResults.length;

    // Fetch external resources based on query type and user context
    let externalResources: any[] = [];
    if (type === 'resources' || type === 'connect') {
      console.log('Fetching external resources...');
      externalResources = await fetchExternalResources(query, userContext, type);
      console.log(`Found ${externalResources.length} external resources`);
    }

    // Generate personalized response based on type and configuration
    switch (type) {
      case 'multi_model':
        if (enableMultiModel) {
          console.log('Generating multi-model response...');
          const multiModelResponse = await generateMultiModelResponse(query, searchResults, graphData, userContext);
          responseData.answer = multiModelResponse.answer;
          responseData.multi_model_insights = multiModelResponse.insights;
          responseData.confidence = multiModelResponse.confidence;
          responseData.search_strategy = 'multi_model_enhanced';
        } else {
          // Fallback to single model with personalization
          const singleModelResponse = await generateSingleModelResponse(query, searchResults, graphData, modelSelection.model, userContext);
          responseData.answer = singleModelResponse.answer;
          responseData.confidence = singleModelResponse.confidence;
        }
        break;

      case 'graph':
        if (graphData) {
          responseData.answer = `Knowledge graph analysis complete. Found ${graphData.entities.length} entities with ${graphData.relationships.length} relationships. Confidence: ${Math.round(graphData.confidence * 100)}%.`;
        } else {
          responseData.answer = "GraphRAG analysis unavailable. Please try again or use standard search.";
        }
        break;

      case 'resources':
        // Enhanced resource finding with personalization and external resources
        console.log('Enhanced resource search with personalization...');
        const resourceResponse = await generateEnhancedResourceResponse(query, searchResults, graphData, modelSelection.model, userContext, externalResources);
        responseData.answer = resourceResponse.answer;
        responseData.resources = resourceResponse.resources;
        responseData.confidence = resourceResponse.confidence;
        responseData.search_strategy = 'personalized_resource_search';
        break;

      case 'connect':
        // Enhanced connection finding with personalization and external connections
        console.log('Enhanced connection search with personalization...');
        const connectionResponse = await generateEnhancedConnectionResponse(query, searchResults, graphData, modelSelection.model, userContext, externalResources);
        responseData.answer = connectionResponse.answer;
        responseData.connections = connectionResponse.connections;
        responseData.confidence = connectionResponse.confidence;
        responseData.search_strategy = 'personalized_connection_search';
        break;

      default:
        // Enhanced chat response with personalization
        console.log('Generating personalized chat response...');
        const enhancedResponse = await generateEnhancedChatResponse(query, searchResults, graphData, modelSelection.model, userContext);
        responseData.answer = enhancedResponse.answer;
        responseData.confidence = enhancedResponse.confidence;
        responseData.search_strategy = graphData ? 'graphrag_enhanced_chat' : 'personalized_chat';
        break;
    }

    responseData.processing_time = Date.now() - startTime;

    // Log the interaction with personalization data
    try {
      await supabase.from('oracle_logs').insert({
        user_id: userId || 'anonymous',
        user_role: role,
        team_id: teamId,
        query: query.substring(0, 500),
        response: responseData.answer.substring(0, 500),
        sources_count: responseData.sources,
        processing_time_ms: responseData.processing_time,
        model_used: responseData.model_used,
        search_strategy: responseData.search_strategy,
        personalization_data: {
          userContext: userContext ? 'available' : 'unavailable',
          externalResources: externalResources.length
        }
      });
    } catch (logError) {
      console.error('Failed to log Super Oracle interaction:', logError);
    }

    console.log(`Super Oracle response completed in ${responseData.processing_time}ms with personalization`);
    
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Super Oracle error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      answer: "I'm experiencing technical difficulties. Please try again or contact support if the issue persists.",
      sources: 0,
      confidence: 0,
      model_used: 'unknown',
      search_strategy: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Enhanced resource response generation with personalization and external resources
async function generateEnhancedResourceResponse(query: string, searchResults: any[], graphData: any, model: string, userContext: any, externalResources: any[]): Promise<any> {
  try {
    // Combine internal and external resources
    const allResources = [...searchResults, ...externalResources];
    
    // Create personalized prompt based on user context
    const personalizationContext = userContext ? `
User Context:
- Experience Level: ${userContext.userProfile?.experienceLevel || 'intermediate'}
- Skills: ${userContext.userProfile?.skills?.join(', ') || 'general'}
- Learning Goals: ${userContext.userProfile?.learningGoals?.join(', ') || 'skill development'}
- Preferred Technologies: ${userContext.userProfile?.preferredTechnologies?.join(', ') || 'modern tech'}
- Communication Style: ${userContext.userProfile?.communicationStyle || 'collaborative'}
- Work Style: ${userContext.userProfile?.workStyle || 'flexible'}

Team Context: ${userContext.teamContext ? `${userContext.teamContext.name} (${userContext.teamContext.stage} stage)` : 'Individual user'}
` : 'No user context available';

    const systemPrompt = `You are an expert resource curator with access to knowledge graphs and advanced AI models.

Query: ${query}
${graphData ? `Knowledge Graph Context: ${JSON.stringify(graphData)}` : ''}
Available Resources: ${JSON.stringify(allResources)}
${personalizationContext}

Generate a comprehensive response that:
1. Explains what resources were found and why they're relevant to THIS specific user
2. Leverages the knowledge graph to provide deeper context
3. Suggests additional resources based on the user's skills and learning goals
4. Provides actionable next steps tailored to their experience level
5. Uses their preferred communication style (${userContext?.userProfile?.communicationStyle || 'collaborative'})
6. Considers their team context and current challenges

Format your response to be helpful, engaging, and perfectly matched to the user's profile.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_MODELS.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODELS.openai.models.primary,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    
    // Return personalized resources
    return {
      answer: data.choices?.[0]?.message?.content || "I found some great personalized resources for you!",
      resources: allResources,
      confidence: 0.95
    };
  } catch (error) {
    console.error('Error generating enhanced resource response:', error);
    return {
      answer: "I'm having trouble finding resources right now. Please try again.",
      resources: [],
      confidence: 0.5
    };
  }
}

// Enhanced connection response generation with personalization and external connections
async function generateEnhancedConnectionResponse(query: string, searchResults: any[], graphData: any, model: string, userContext: any, externalResources: any[]): Promise<any> {
  try {
    // Combine internal and external connections
    const allConnections = [...searchResults, ...externalResources];
    
    // Create personalized prompt based on user context
    const personalizationContext = userContext ? `
User Context:
- Role: ${userContext.userProfile?.role || 'builder'}
- Experience Level: ${userContext.userProfile?.experienceLevel || 'intermediate'}
- Skills: ${userContext.userProfile?.skills?.join(', ') || 'general'}
- Current Focus: ${userContext.userProfile?.learningGoals?.join(', ') || 'skill development'}
- Communication Style: ${userContext.userProfile?.communicationStyle || 'collaborative'}
- Availability: ${userContext.userProfile?.availability || 'flexible'}

Team Context: ${userContext.teamContext ? `${userContext.teamContext.name} (${userContext.teamContext.stage} stage)` : 'Individual user'}
Mentorship Needs: ${userContext.userProfile?.mentorshipNeeds || 'Not specified'}
` : 'No user context available';

    const systemPrompt = `You are an expert networking assistant with access to knowledge graphs and advanced AI models.

Query: ${query}
${graphData ? `Knowledge Graph Context: ${JSON.stringify(graphData)}` : ''}
Available Connections: ${JSON.stringify(allConnections)}
${personalizationContext}

Generate a comprehensive response that:
1. Explains what connections were found and why they're relevant to THIS specific user
2. Leverages the knowledge graph to suggest related connections
3. Provides networking advice and strategies tailored to their role and experience
4. Suggests next steps for building these relationships
5. Uses their preferred communication style (${userContext?.userProfile?.communicationStyle || 'collaborative'})
6. Considers their mentorship needs and team context
7. Provides personalized introduction messages if appropriate

Format your response to be helpful, actionable, and perfectly matched to the user's profile.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_MODELS.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODELS.openai.models.primary,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    
    // Return personalized connections
    return {
      answer: data.choices?.[0]?.message?.content || "I found some great personalized connections for you!",
      connections: allConnections,
      confidence: 0.95
    };
  } catch (error) {
    console.error('Error generating enhanced connection response:', error);
    return {
      answer: "I'm having trouble finding connections right now. Please try again.",
      connections: [],
      confidence: 0.5
    };
  }
}

// Enhanced chat response generation with personalization
async function generateEnhancedChatResponse(query: string, searchResults: any[], graphData: any, model: string, userContext: any): Promise<any> {
  try {
    // Create personalized prompt based on user context
    const personalizationContext = userContext ? `
User Context:
- Role: ${userContext.userProfile?.role || 'builder'}
- Experience Level: ${userContext.userProfile?.experienceLevel || 'intermediate'}
- Skills: ${userContext.userProfile?.skills?.join(', ') || 'general'}
- Current Focus: ${userContext.userProfile?.learningGoals?.join(', ') || 'skill development'}
- Communication Style: ${userContext.userProfile?.communicationStyle || 'collaborative'}
- Work Style: ${userContext.userProfile?.workStyle || 'flexible'}
- Availability: ${userContext.userProfile?.availability || 'flexible'}
- Timezone: ${userContext.userProfile?.timezone || 'flexible'}

Team Context: ${userContext.teamContext ? `${userContext.teamContext.name} (${userContext.teamContext.stage} stage)` : 'Individual user'}
Recent Updates: ${userContext.recentUpdates?.map(u => u.content).join('; ') || 'None'}
Project Goal: ${userContext.userProfile?.projectGoal || 'Not specified'}
Mentorship Needs: ${userContext.userProfile?.mentorshipNeeds || 'Not specified'}

Preferences:
- Response Detail: ${userContext.preferences?.responseDetail || 'comprehensive'}
- Technical Depth: ${userContext.preferences?.technicalDepth || 'intermediate'}
- Learning Style: ${userContext.preferences?.learningStyle || 'balanced'}
` : 'No user context available';

    const systemPrompt = `You are the Super Oracle, an advanced AI assistant with access to knowledge graphs and multiple AI models.

Query: ${query}
${graphData ? `Knowledge Graph Context: ${JSON.stringify(graphData)}` : ''}
Search Results: ${JSON.stringify(searchResults)}
${personalizationContext}

Generate a comprehensive, helpful response that:
1. Directly addresses the user's query with perfect personalization
2. Leverages the knowledge graph for deeper insights
3. Uses the search results to provide relevant information
4. Considers the user's role, experience level, and team context
5. Provides actionable next steps tailored to their situation
6. Uses their preferred communication style (${userContext?.userProfile?.communicationStyle || 'collaborative'})
7. Matches their technical depth preference (${userContext?.preferences?.technicalDepth || 'intermediate'})
8. References their learning goals and current challenges
9. Considers their team stage and recent progress
10. Provides motivation and encouragement appropriate to their journey

Format your response to be conversational, helpful, and perfectly matched to the user's profile. Every response should feel like it was written specifically for them.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_MODELS.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODELS.openai.models.primary,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    
    return {
      answer: data.choices?.[0]?.message?.content || "I'm here to help! Let me know what you need.",
      confidence: 0.9
    };
  } catch (error) {
    console.error('Error generating enhanced chat response:', error);
    return {
      answer: "I'm experiencing some technical difficulties. Please try again or use slash commands like /help for assistance!",
      confidence: 0.5
    };
  }
}

// Generate enhanced resources from knowledge graph
async function generateResourcesFromGraph(query: string, graphData: any, searchResults: any[]): Promise<any[]> {
  try {
    if (!graphData || !graphData.entities) {
      return searchResults.slice(0, 5);
    }

    // Use GraphRAG to find related resources
    const enhancedResources = [];
    
    // Add search results
    enhancedResources.push(...searchResults.slice(0, 3));
    
    // Generate additional resources based on graph entities
    for (const entity of graphData.entities.slice(0, 3)) {
      if (entity.type === 'technology' || entity.type === 'concept') {
        enhancedResources.push({
          title: `${entity.name} - Related Resources`,
          url: `#graph-entity-${entity.name}`,
          type: 'piefi',
          description: `Resources related to ${entity.name} from our knowledge graph`,
          relevance: entity.relevance || 0.8,
          author: 'PieFi Knowledge Graph',
          source: 'graphrag'
        });
      }
    }
    
    return enhancedResources.slice(0, 5);
  } catch (error) {
    console.error('Error generating resources from graph:', error);
    return searchResults.slice(0, 5);
  }
}

// Generate enhanced connections from knowledge graph
async function generateConnectionsFromGraph(query: string, graphData: any, searchResults: any[]): Promise<any[]> {
  try {
    if (!graphData || !graphData.entities) {
      return searchResults.slice(0, 4);
    }

    // Use GraphRAG to find related connections
    const enhancedConnections = [];
    
    // Add search results
    enhancedConnections.push(...searchResults.slice(0, 2));
    
    // Generate additional connections based on graph entities
    for (const entity of graphData.entities.slice(0, 2)) {
      if (entity.type === 'person' || entity.type === 'company') {
        enhancedConnections.push({
          name: entity.name,
          title: entity.description || 'Expert in this field',
          company: entity.type === 'company' ? entity.name : 'Various Companies',
          expertise: `Specializes in ${entity.name} and related areas`,
          relevance: entity.relevance || 85,
          source: 'graphrag'
        });
      }
    }
    
    return enhancedConnections.slice(0, 4);
  } catch (error) {
    console.error('Error generating connections from graph:', error);
    return searchResults.slice(0, 4);
  }
}

// Web search for real-time information - only when external resources are needed
async function webSearch(query: string, role: string, teamId?: string, internalDocs?: any[]): Promise<any[]> {
  if (!RAG_CONFIG.enableWebSearch) return [];
  
  // First, check if we actually need web search
  if (!shouldUseWebSearch(query)) {
    console.log('Query does not require web search, skipping');
    return [];
  }
  
  // Check if internal knowledge is already sufficient
  if (internalDocs && isInternalKnowledgeSufficient(internalDocs, query)) {
    console.log('Internal knowledge is sufficient, skipping web search');
    return [];
  }
  
  try {
    console.log('Performing enhanced web search with RAG pipeline:', query);
    
    // Enhanced OpenAI web search with RAG context
    const openAIResults = await enhancedOpenAIWebSearch(query, internalDocs);
    if (openAIResults && openAIResults.length > 0) {
      const filteredResults = filterWebResults(openAIResults, role, teamId);
      console.log(`Enhanced OpenAI web search found ${filteredResults.length} relevant external results`);
      return filteredResults;
    }
    
    // Fallback to alternative web search methods with RAG enhancement
    const fallbackResults = await enhancedFallbackWebSearch(query, internalDocs);
    const filteredResults = filterWebResults(fallbackResults, role, teamId);
    console.log(`Enhanced fallback web search found ${filteredResults.length} relevant external results`);
    return filteredResults;
    
  } catch (error) {
    console.warn('Enhanced web search failed, continuing without external results:', error);
    return [];
  }
}

// Determine if web search is actually needed
function shouldUseWebSearch(query: string): boolean {
  const queryLower = query.toLowerCase();
  
  // Check for indicators that external information is needed
  const needsExternalInfo = RAG_CONFIG.webSearchQueries.some(keyword => 
    queryLower.includes(keyword)
  );
  
  // Check for specific external resource requests
  const requestsExternalResource = [
    'external', 'outside', 'internet', 'web', 'online', 'public',
    'industry', 'market', 'competitor', 'trend', 'news', 'latest',
    'new technology', 'emerging', 'recent developments'
  ].some(term => queryLower.includes(term));
  
  // Check for time-sensitive information that might not be in database
  const needsCurrentInfo = [
    'current', 'recent', 'latest', 'now', 'today', 'this year',
    '2024', '2025', 'upcoming', 'future', 'next'
  ].some(term => queryLower.includes(term));
  
  // Check for specific external tools or platforms
  const needsExternalTool = [
    'github', 'stack overflow', 'npm', 'docker hub', 'aws', 'google cloud',
    'openai', 'anthropic', 'hugging face', 'kaggle', 'arxiv'
  ].some(term => queryLower.includes(term));
  
  // Check for queries that explicitly request external information
  const explicitlyRequestsExternal = [
    'find me', 'search for', 'look up', 'what is the latest', 'current trends',
    'industry news', 'market research', 'competitor analysis'
  ].some(term => queryLower.includes(term));
  
  return needsExternalInfo || requestsExternalResource || needsCurrentInfo || needsExternalTool || explicitlyRequestsExternal;
}

// Check if internal knowledge is sufficient for the query
function isInternalKnowledgeSufficient(internalDocs: any[], query: string): boolean {
  if (!internalDocs || internalDocs.length === 0) return false;
  
  const queryLower = query.toLowerCase();
  
  // Adjust thresholds based on web search frequency setting
  const relevanceThreshold = RAG_CONFIG.webSearchFrequency === 'conservative' ? 70 : 
                           RAG_CONFIG.webSearchFrequency === 'moderate' ? 75 : 80;
  
  const coverageThreshold = RAG_CONFIG.webSearchFrequency === 'conservative' ? 0.5 : 
                          RAG_CONFIG.webSearchFrequency === 'moderate' ? 0.6 : 0.7;
  
  // Check if internal docs cover the query well enough
  const relevantDocs = internalDocs.filter(doc => {
    const docLower = doc.content.toLowerCase();
    return docLower.includes(queryLower) || queryLower.split(' ').some(word => docLower.includes(word));
  });
  
  const coverage = relevantDocs.length / internalDocs.length;
  const avgRelevance = relevantDocs.reduce((sum, doc) => sum + (doc.similarity || 0.5), 0) / relevantDocs.length;
  
  return coverage >= coverageThreshold && avgRelevance >= relevanceThreshold;
}

// Enhanced OpenAI web search with RAG context
async function enhancedOpenAIWebSearch(query: string, internalDocs?: any[]): Promise<any[]> {
  try {
    // Build context from internal docs for better web search
    const context = internalDocs ? internalDocs.map(doc => doc.content).join('\n\n') : '';
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_MODELS.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODELS.openai.models.primary,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are an expert web researcher. Use the internal context to enhance your web search for: "${query}".

Internal Context: ${context}

Find the most relevant, current, and authoritative external resources. Return results in this format:
- Title: [Resource Title]
- URL: [Working URL]
- Description: [Why this is relevant]
- Type: [article/video/documentation/tool]
- Relevance: [0.8-0.95]`
          },
          {
            role: 'user',
            content: `Search for: ${query}`
          }
        ],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse the enhanced results
    return parseEnhancedWebResults(content);
    
  } catch (error) {
    console.error('Enhanced OpenAI web search error:', error);
    return [];
  }
}

// Enhanced fallback web search with RAG context
async function enhancedFallbackWebSearch(query: string, internalDocs?: any[]): Promise<any[]> {
  try {
    // Use internal context to improve search queries
    const context = internalDocs ? internalDocs.map(doc => doc.content).join('\n\n') : '';
    
    // Enhanced search query using context
    const enhancedQuery = context ? `${query} ${extractKeyTerms(context)}` : query;
    
    // Simulate web search results with context enhancement
    const results = [
      {
        title: `Enhanced result for: ${query}`,
        url: `https://example.com/search?q=${encodeURIComponent(enhancedQuery)}`,
        description: `Context-enhanced search result based on internal knowledge`,
        type: 'article',
        relevance: 0.85,
        source: 'enhanced_fallback'
      }
    ];
    
    return results;
    
  } catch (error) {
    console.error('Enhanced fallback web search error:', error);
    return [];
  }
}

// Extract key terms from context for enhanced search
function extractKeyTerms(context: string): string {
  // Simple key term extraction - could be enhanced with NLP
  const words = context.split(/\s+/).filter(word => word.length > 4);
  const uniqueWords = [...new Set(words)].slice(0, 5);
  return uniqueWords.join(' ');
}

// Parse enhanced web search results
function parseEnhancedWebResults(content: string): any[] {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    const results = [];
    let currentResult: any = {};
    
    for (const line of lines) {
      if (line.startsWith('- Title:')) {
        if (currentResult.title) results.push(currentResult);
        currentResult = { title: line.substring(8).trim() };
      } else if (line.startsWith('- URL:')) {
        currentResult.url = line.substring(6).trim();
      } else if (line.startsWith('- Description:')) {
        currentResult.description = line.substring(14).trim();
      } else if (line.startsWith('- Type:')) {
        currentResult.type = line.substring(7).trim();
      } else if (line.startsWith('- Relevance:')) {
        currentResult.relevance = parseFloat(line.substring(12).trim()) || 0.8;
      }
    }
    
    if (currentResult.title) results.push(currentResult);
    return results;
    
  } catch (error) {
    console.error('Error parsing enhanced web results:', error);
    return [];
  }
}

// Filter web search results based on role and team context
function filterWebResults(results: any[], role: string, teamId?: string): any[] {
  return results
    .filter(result => result.title && result.url)
    .map(result => ({
      ...result,
      source: 'web_search',
      timestamp: new Date().toISOString()
    }))
    .slice(0, RAG_CONFIG.maxWebResults);
}

// Helper function for single model response generation
async function generateSingleModelResponse(query: string, searchResults: any[], graphData: any, model: string): Promise<any> {
  switch (model) {
    case 'openai':
      return await generateOpenAIResponse(query, searchResults, graphData);
    case 'gemini':
      return await generateGeminiResponse(query, searchResults, graphData);
    case 'claude':
      return await generateClaudeResponse(query, searchResults, graphData);
    default:
      return await generateOpenAIResponse(query, searchResults, graphData);
  }
}