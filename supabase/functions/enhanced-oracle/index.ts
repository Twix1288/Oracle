import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

// Advanced model configurations
const MODELS = {
  primary: 'gpt-4o',
  fallback: 'gpt-4o-mini',
  backup: 'gpt-3.5-turbo',
  embeddings: {
    primary: 'text-embedding-3-large',
    fallback: 'text-embedding-ada-002'
  }
};

// Enhanced RAG configuration
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

const supabase = createClient(supabaseUrl!, supabaseKey!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JourneyRequest {
  query: string;
  role: 'builder' | 'mentor' | 'lead' | 'guest';
  teamId?: string;
  userId?: string;
  commandExecuted?: boolean;
  commandType?: string;
  commandResult?: any;
}

interface JourneyResponse {
  answer: string;
  sources: number;
  context_used: boolean;
  detected_stage?: string;
  suggested_frameworks?: string[];
  next_actions?: string[];
  stage_confidence?: number;
  rag_confidence?: number;
  model_used?: string;
  processing_time?: number;
  search_strategy?: string;
  fallback_used?: boolean;
  sections?: {
    update?: string;
    progress?: string;
    event?: string;
  };
}

interface CommandResult {
  executed: boolean;
  type?: string;
  message: string;
  data?: any;
}

// Uses LLM to extract an actionable intent from natural language
async function parseIntentWithLLM(openaiKey: string, text: string): Promise<{
  action: 'send_message' | 'create_update' | 'update_status' | 'assign_user' | 'broadcast' | 'none',
  target_type?: 'role' | 'team' | 'user',
  target_value?: string,
  content?: string,
  update_text?: string,
  status_text?: string,
  user_id?: string,
  team_id?: string,
  broadcast_type?: 'all' | 'team' | 'role'
} | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `You are an intent parser for the Nexus Oracle. Return ONLY compact JSON with the following structure:

{
  "action": "send_message" | "create_update" | "update_status" | "assign_user" | "broadcast" | "none",
  "target_type": "role" | "team" | "user",
  "target_value": "string - name of role, team, or user",
  "content": "string - message content",
  "update_text": "string - text for team update",
  "status_text": "string - new status text",
  "user_id": "string - user ID for assignments",
  "team_id": "string - team ID for assignments",
  "broadcast_type": "all" | "team" | "role"
}

Examples:
1. "Send a message to Team Alpha about tomorrow's deadline"
   → {"action": "send_message", "target_type": "team", "target_value": "Alpha", "content": "about tomorrow's deadline"}
2. "Broadcast that we hit 50% progress"
   → {"action": "broadcast", "broadcast_type": "all", "content": "we hit 50% progress"}
3. "Assign Alex to the Unassigned section"
   → {"action": "assign_user", "target_type": "user", "target_value": "Alex", "team_id": null}
4. "Create an update for Team Beta"
   → {"action": "create_update", "target_type": "team", "target_value": "Beta", "update_text": ""}

Infer intent from natural language. If unsure, use action: "none".`
          },
          { role: 'user', content: text }
        ]
      })
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    // Attempt to parse JSON even if wrapped in code fences
    const jsonStr = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    return JSON.parse(jsonStr);
  } catch (_err) {
    return null;
  }
}

async function executeCommand(query: string, role: string, teamId?: string, userId?: string, supabase?: any, openaiKey?: string): Promise<CommandResult> {
  const lowerQuery = query.toLowerCase();

  // Helper: map plural role to enum
  const roleMapping: { [k: string]: string } = {
    lead: 'lead', leads: 'lead',
    builder: 'builder', builders: 'builder',
    mentor: 'mentor', mentors: 'mentor',
    guest: 'guest', guests: 'guest',
  };

  // 1) Command: Send message to a role (plural/singular) like "Send message to leads: ..."
  const roleMsgMatch = query.match(/(?:send (?:this )?message to|message to)\s+(builders?|mentors?|leads?|guests?)\s*(?::|\s+saying:|\s+saying\s*|:)\s*(.+)$/i);
  if (roleMsgMatch) {
    const targetRole = roleMapping[roleMsgMatch[1].toLowerCase()];
    const content = roleMsgMatch[2].trim();

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: userId || 'oracle',
          sender_role: role,
          receiver_role: targetRole,
          receiver_id: 'all',
          content,
          team_id: teamId || null,
        });
      if (error) throw error;

      return { executed: true, type: 'sendMessage', message: `✅ Message sent to ${targetRole}s: "${content}"`, data: { targetRole, content } };
    } catch (error) {
      return { executed: true, type: 'sendMessage', message: `❌ Failed to send message: ${error.message}` };
    }
  }

  // 2) Command: Send message to a team by name, e.g. "Send message to team Oracle: ..." or "message to Oracle: ..."
  const teamMsgMatch = query.match(/(?:send (?:this )?message to|message to)\s*(?:team\s+)?["']?(.+?)["']?\s*(?::|\s+saying:|\s+saying\s*|:)\s*(.+)$/i);
  if (teamMsgMatch) {
    const maybeTarget = (teamMsgMatch[1] || '').trim();
    const content = teamMsgMatch[2].trim();

    // If the word is actually a known role, skip this branch (handled above)
    if (!roleMapping[maybeTarget.toLowerCase()]) {
      try {
        const { data: teamRow, error: teamErr } = await supabase
          .from('teams')
          .select('id, name')
          .ilike('name', maybeTarget)
          .single();

        if (teamErr || !teamRow) {
          return { executed: true, type: 'sendMessage', message: `❌ Team not found: "${maybeTarget}"` };
        }

        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: userId || 'oracle',
            sender_role: role,
            receiver_role: 'builder',
            receiver_id: teamRow.id,
            content,
            team_id: teamRow.id,
          });
        if (error) throw error;

        return { executed: true, type: 'sendMessage', message: `✅ Message sent to team ${teamRow.name}: "${content}"`, data: { team_id: teamRow.id, content } };
      } catch (error) {
        return { executed: true, type: 'sendMessage', message: `❌ Failed to send message: ${error.message}` };
      }
    }
  }

  // 3) Command: Create update (supports multiple phrasings)
  if (lowerQuery.includes('create update') || lowerQuery.includes('add update') || lowerQuery.includes('post update') || lowerQuery.includes('log update') || lowerQuery.startsWith('update:')) {
    const updateMatch = query.match(/(?:create update|add update|post update|log update|update)\s*(?::\s*|\s+saying\s*|:)\s*(.+)/i);
    if (updateMatch) {
      const content = updateMatch[1].trim();
      const updateType = lowerQuery.includes('milestone') ? 'milestone' : 'daily';

      try {
        if (!teamId) {
          return { executed: true, type: 'createUpdate', message: '❌ No team context provided for creating an update.' };
        }
        const { error } = await supabase
          .from('updates')
          .insert({ team_id: teamId, content, type: updateType, created_by: userId || 'oracle' });
        if (error) throw error;

        return { executed: true, type: 'createUpdate', message: `✅ Update created: "${content}"`, data: { content, type: updateType } };
      } catch (error) {
        return { executed: true, type: 'createUpdate', message: `❌ Failed to create update: ${error.message}` };
      }
    }
  }

  // 4) Command: Update status
  if (lowerQuery.includes('update status') || lowerQuery.includes('change status') || lowerQuery.includes('set status')) {
    const statusMatch = query.match(/(?:update status|change status|set status)(?::\s*|\s+to\s+)(.+)/i);
    if (statusMatch && teamId) {
      const newStatus = statusMatch[1].trim();
      try {
        const { error } = await supabase
          .from('team_status')
          .upsert({ team_id: teamId, current_status: newStatus, last_update: new Date().toISOString() });
        if (error) throw error;

        return { executed: true, type: 'updateStatus', message: `✅ Team status updated to: "${newStatus}"`, data: { status: newStatus } };
      } catch (error) {
        return { executed: true, type: 'updateStatus', message: `❌ Failed to update status: ${error.message}` };
      }
    }
  }

  // 5) LLM fallback intent parsing for natural language
  if (openaiKey) {
    const intent = await parseIntentWithLLM(openaiKey, query);
    if (intent && intent.action && intent.action !== 'none') {
      // Normalize and execute based on intent
      if (intent.action === 'send_message' && intent.content) {
        if (intent.target_type === 'role' && intent.target_value) {
          const targetRole = roleMapping[intent.target_value.toLowerCase()] || intent.target_value.toLowerCase();
          try {
            const { error } = await supabase
              .from('messages')
              .insert({
                sender_id: userId || 'oracle',
                sender_role: role,
                receiver_role: targetRole,
                receiver_id: 'all',
                content: intent.content,
                team_id: teamId || null,
              });
            if (error) throw error;
            return { executed: true, type: 'sendMessage', message: `✅ Message sent to ${targetRole}s: "${intent.content}"` };
          } catch (error) {
            return { executed: true, type: 'sendMessage', message: `❌ Failed to send message: ${error.message}` };
          }
        }

        if (intent.target_type === 'team' && intent.target_value) {
          try {
            const { data: teamRow, error: teamErr } = await supabase
              .from('teams')
              .select('id, name')
              .ilike('name', intent.target_value)
              .single();
            if (teamErr || !teamRow) {
              return { executed: true, type: 'sendMessage', message: `❌ Team not found: "${intent.target_value}"` };
            }
            const { error } = await supabase
              .from('messages')
              .insert({
                sender_id: userId || 'oracle',
                sender_role: role,
                receiver_role: 'builder',
                receiver_id: teamRow.id,
                content: intent.content,
                team_id: teamRow.id,
              });
            if (error) throw error;
            return { executed: true, type: 'sendMessage', message: `✅ Message sent to team ${teamRow.name}: "${intent.content}"` };
          } catch (error) {
            return { executed: true, type: 'sendMessage', message: `❌ Failed to send message: ${error.message}` };
          }
        }
      }

      if (intent.action === 'broadcast' && intent.content) {
        try {
          const broadcastMessage: {
            sender_id: string;
            sender_role: string;
            content: string;
            is_broadcast: boolean;
            broadcast_type: 'all' | 'team' | 'role';
            team_id?: string;
          } = {
            sender_id: userId || 'oracle',
            sender_role: role,
            content: intent.content,
            is_broadcast: true,
            broadcast_type: intent.broadcast_type || 'all'
          };

          if (intent.broadcast_type === 'team' && teamId) {
            broadcastMessage.team_id = teamId;
          }

          const { error } = await supabase
            .from('messages')
            .insert(broadcastMessage);

          if (error) throw error;
          return { executed: true, type: 'broadcast', message: `✅ Broadcast sent: "${intent.content}"` };
        } catch (error) {
          return { executed: true, type: 'broadcast', message: `❌ Failed to send broadcast: ${error.message}` };
        }
      }

      if (intent.action === 'assign_user' && intent.target_type === 'user' && intent.target_value) {
        try {
          // Find user by name
          const { data: user, error: userErr } = await supabase
            .from('members')
            .select('id, name')
            .ilike('name', intent.target_value)
            .single();

          if (userErr || !user) {
            return { executed: true, type: 'assignUser', message: `❌ User not found: "${intent.target_value}"` };
          }

          // Update user's team
          const { error } = await supabase
            .from('members')
            .update({ team_id: intent.team_id || null })
            .eq('id', user.id);

          if (error) throw error;
          return { 
            executed: true, 
            type: 'assignUser', 
            message: intent.team_id 
              ? `✅ User "${user.name}" assigned to team` 
              : `✅ User "${user.name}" moved to unassigned section` 
          };
        } catch (error) {
          return { executed: true, type: 'assignUser', message: `❌ Failed to assign user: ${error.message}` };
        }
      }

      if (intent.action === 'create_update' && (intent.update_text || intent.content)) {
        const text = intent.update_text || intent.content || '';
        if (!text) {
          return { executed: true, type: 'createUpdate', message: '❌ Could not find update text.' };
        }
        try {
          if (!teamId) {
            return { executed: true, type: 'createUpdate', message: '❌ No team context provided for creating an update.' };
          }
          const { error } = await supabase
            .from('updates')
            .insert({ team_id: teamId, content: text, type: 'daily', created_by: userId || 'oracle' });
          if (error) throw error;
          return { executed: true, type: 'createUpdate', message: `✅ Update created: "${text}"` };
        } catch (error) {
          return { executed: true, type: 'createUpdate', message: `❌ Failed to create update: ${error.message}` };
        }
      }

      if (intent.action === 'update_status' && intent.status_text && teamId) {
        try {
          const { error } = await supabase
            .from('team_status')
            .upsert({ team_id: teamId, current_status: intent.status_text, last_update: new Date().toISOString() });
          if (error) throw error;
          return { executed: true, type: 'updateStatus', message: `✅ Team status updated to: "${intent.status_text}"` };
        } catch (error) {
          return { executed: true, type: 'updateStatus', message: `❌ Failed to update status: ${error.message}` };
        }
      }
    }
  }

  return { executed: false, message: '' };
}
// Advanced RAG with multi-model embeddings and semantic re-ranking
async function advancedRAGSearch(query: string, role: string, teamId?: string): Promise<{
  documents: any[];
  combinedContext: string;
  searchStrategy: string;
  confidence: number;
}> {
  try {
    console.log('Starting advanced RAG search...');
    
    // Generate embeddings with multiple models for better semantic understanding
    const embeddings = await generateHybridEmbeddings(query);
    
    // Multi-strategy search (internal knowledge first)
    const [vectorResults, textResults, semanticResults] = await Promise.all([
      vectorSearch(embeddings, role, teamId),
      textSearch(query, role, teamId),
      semanticSearch(query, role, teamId)
    ]);
    
    // Combine internal results first
    const internalDocs = combineSearchResults(vectorResults, textResults, semanticResults, []);
    
    // Only search web if internal knowledge is insufficient
    let webResults: any[] = [];
    if (!isInternalKnowledgeSufficient(internalDocs, query)) {
      console.log('Internal knowledge insufficient, performing web search...');
      webResults = await webSearch(query, role, teamId, internalDocs);
    } else {
      console.log('Internal knowledge sufficient, skipping web search');
    }
    
    // Combine all results (internal prioritized)
    const allDocuments = combineSearchResults(vectorResults, textResults, semanticResults, webResults);
    
    // Semantic re-ranking for better relevance
    const rerankedDocs = await semanticReranking(query, allDocuments);
    
    // Adaptive context selection
    const optimalContext = await selectOptimalContext(query, rerankedDocs);
    
    const confidence = calculateSearchConfidence(rerankedDocs, allDocuments.length);
    
    // Determine search strategy used
    const searchStrategy = webResults.length > 0 ? 
      'hybrid_vector_text_semantic_web' : 
      'hybrid_vector_text_semantic';
    
    return {
      documents: rerankedDocs.slice(0, RAG_CONFIG.maxDocuments),
      combinedContext: optimalContext,
      searchStrategy,
      confidence
    };
    
  } catch (error) {
    console.error('Advanced RAG failed, falling back to basic search:', error);
    return await fallbackSearch(query, role, teamId);
  }
}

// Generate hybrid embeddings using multiple models
async function generateHybridEmbeddings(text: string): Promise<number[]> {
  try {
    const [primaryEmbedding, fallbackEmbedding] = await Promise.all([
      generateEmbedding(text, MODELS.embeddings.primary),
      generateEmbedding(text, MODELS.embeddings.fallback)
    ]);
    
    // Combine embeddings using weighted average (primary model gets higher weight)
    return combineEmbeddings(primaryEmbedding, fallbackEmbedding, [0.7, 0.3]);
  } catch (error) {
    console.warn('Hybrid embeddings failed, using fallback:', error);
    return generateEmbedding(text, MODELS.embeddings.fallback);
  }
}

async function generateEmbedding(text: string, model: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: text })
  });
  
  if (!response.ok) throw new Error(`Embedding failed for ${model}`);
  
  const data = await response.json();
  return data.data[0].embedding;
}

function combineEmbeddings(emb1: number[], emb2: number[], weights: number[]): number[] {
  if (emb1.length !== emb2.length) return emb1;
  return emb1.map((val, idx) => val * weights[0] + emb2[idx] * weights[1]);
}

// Vector search with enhanced similarity
async function vectorSearch(embedding: number[], role: string, teamId?: string): Promise<any[]> {
  try {
    let query = supabase
      .rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: RAG_CONFIG.minRelevanceThreshold,
        match_count: RAG_CONFIG.maxDocuments * 2
      })
      .contains('role_visibility', [role]);
    
    if (teamId) {
      query = query.or(`team_visibility.is.null,team_visibility.cs.{${teamId}}`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Vector search failed:', error);
    return [];
  }
}

// Enhanced text search with semantic understanding
async function textSearch(query: string, role: string, teamId?: string): Promise<any[]> {
  try {
    let searchQuery = supabase
      .from('documents')
      .select('*')
      .contains('role_visibility', [role])
      .textSearch('content', query.replace(/ /g, ' | '), {
        type: 'websearch',
        config: 'english'
      })
      .limit(RAG_CONFIG.maxDocuments * 2);
    
    if (teamId) {
      searchQuery = searchQuery.or(`team_visibility.is.null,team_visibility.cs.{${teamId}}`);
    }
    
    const { data, error } = await searchQuery;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Text search failed:', error);
    return [];
  }
}

// Semantic search using LLM understanding
async function semanticSearch(query: string, role: string, teamId?: string): Promise<any[]> {
  try {
    // Use LLM to expand query with semantic variations
    const expandedQuery = await expandQuerySemantically(query);
    
    let searchQuery = supabase
      .from('documents')
      .select('*')
      .contains('role_visibility', [role])
      .or(expandedQuery.map(q => `content.ilike.%${q}%`).join(','))
      .limit(RAG_CONFIG.maxDocuments);
    
    if (teamId) {
      searchQuery = searchQuery.or(`team_visibility.is.null,team_visibility.cs.{${teamId}}`);
    }
    
    const { data, error } = await searchQuery;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Semantic search failed:', error);
    return [];
  }
}

// Expand query with semantic variations
async function expandQuerySemantically(query: string): Promise<string[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELS.fallback,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: 'Generate 3-5 semantic variations of this query that would help find relevant documents. Return as JSON array of strings.'
          },
          { role: 'user', content: query }
        ]
      })
    });
    
    const data = await response.json();
    const variations = JSON.parse(data.choices[0].message.content);
    return [query, ...variations];
  } catch (error) {
    console.warn('Query expansion failed:', error);
    return [query];
  }
}

// Combine search results intelligently including web results
function combineSearchResults(vectorResults: any[], textResults: any[], semanticResults: any[], webResults: any[]): any[] {
  const combined = new Map<string, any>();
  
  // Add vector results with high relevance scores
  vectorResults.forEach(doc => {
    combined.set(doc.id, { ...doc, relevance_score: doc.similarity * 100, source: 'vector' });
  });
  
  // Add text results (avoid duplicates)
  textResults.forEach(doc => {
    if (!combined.has(doc.id)) {
      combined.set(doc.id, { ...doc, relevance_score: 75, source: 'text' });
    }
  });
  
  // Add semantic results (avoid duplicates)
  semanticResults.forEach(doc => {
    if (!combined.has(doc.id)) {
      combined.set(doc.id, { ...doc, relevance_score: 80, source: 'semantic' });
    }
  });
  
  // Add web results (they have unique URLs, so no duplicates to worry about)
  webResults.forEach(webResult => {
    const webDoc = {
      id: `web_${webResult.url?.replace(/[^a-zA-Z0-9]/g, '_') || Date.now()}`,
      content: `${webResult.title}\n\n${webResult.content}\n\nSource: ${webResult.url}`,
      metadata: {
        source_type: 'web',
        url: webResult.url,
        title: webResult.title,
        timestamp: webResult.timestamp,
        source_type_detail: webResult.source_type
      },
      relevance_score: webResult.relevance_score || 70,
      source: 'web',
      is_web_result: true
    };
    
    combined.set(webDoc.id, webDoc);
  });
  
  return Array.from(combined.values());
}

// Semantic re-ranking using LLM understanding
async function semanticReranking(query: string, documents: any[]): Promise<any[]> {
  if (!RAG_CONFIG.enableSemanticReranking || documents.length === 0) return documents;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELS.fallback,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `Score these documents for relevance to the query. Return JSON array with structure: [{"id": "doc_id", "score": 85, "reasoning": "brief explanation"}]

Score 90-100: Highly relevant, directly answers query
Score 70-89: Relevant, provides useful context  
Score 50-69: Somewhat relevant, may be helpful
Score 0-49: Low relevance, not useful for this query`
          },
          {
            role: 'user',
            content: `Query: "${query}"\n\nDocuments:\n${documents.map(doc => `ID: ${doc.id}\nContent: ${doc.content.substring(0, 200)}...`).join('\n\n')}`
          }
        ]
      })
    });
    
    const data = await response.json();
    const scores = JSON.parse(data.choices[0].message.content);
    
    // Apply scores and sort by relevance
    const scoredDocs = documents.map(doc => {
      const scoreData = scores.find((s: any) => s.id === doc.id);
      return {
        ...doc,
        relevance_score: scoreData?.score || doc.relevance_score || 50
      };
    });
    
    return scoredDocs.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  } catch (error) {
    console.warn('Semantic re-ranking failed:', error);
    return documents;
  }
}

// Adaptive context selection based on query complexity
async function selectOptimalContext(query: string, documents: any[]): Promise<string> {
  try {
    // Analyze query complexity
    const complexity = await analyzeQueryComplexity(query);
    
    // Adjust context window based on complexity
    const optimalWindow = complexity.level === 'complex' ? RAG_CONFIG.maxContextTokens * 1.5 : 
                         complexity.level === 'simple' ? RAG_CONFIG.maxContextTokens * 0.7 : 
                         RAG_CONFIG.maxContextTokens;
    
    // Select most relevant content within optimal window
    let selectedContent = '';
    let currentTokens = 0;
    
    for (const doc of documents) {
      const docTokens = estimateTokens(doc.content);
      if (currentTokens + docTokens <= optimalWindow) {
        selectedContent += `[${Math.round((doc.relevance_score || 0))}% relevant] ${doc.content}\n\n`;
        currentTokens += docTokens;
      } else {
        break;
      }
    }
    
    return selectedContent.trim();
  } catch (error) {
    console.warn('Context optimization failed:', error);
    return documents.slice(0, 3).map(doc => doc.content).join('\n\n');
  }
}

// Analyze query complexity
async function analyzeQueryComplexity(query: string): Promise<{
  level: 'simple' | 'moderate' | 'complex';
  reasoning: string;
  estimatedTokens: number;
}> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELS.fallback,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `Analyze query complexity. Return JSON: {"level": "simple|moderate|complex", "reasoning": "explanation", "estimatedTokens": 500}`
          },
          { role: 'user', content: query }
        ]
      })
    });
    
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    return { level: 'moderate', reasoning: 'Default assessment', estimatedTokens: 1000 };
  }
}

// Calculate search confidence
function calculateSearchConfidence(documents: any[], totalFound: number): number {
  if (documents.length === 0) return 0;
  
  const avgRelevance = documents.reduce((sum, doc) => sum + (doc.relevance_score || 0), 0) / documents.length;
  const coverageScore = Math.min(documents.length / 5, 1);
  
  return Math.round((avgRelevance * 0.7 + coverageScore * 30) * 100) / 100;
}

// Fallback search when advanced RAG fails
async function fallbackSearch(query: string, role: string, teamId?: string): Promise<{
  documents: any[];
  combinedContext: string;
  searchStrategy: string;
  confidence: number;
}> {
  console.log('Using fallback search strategy');
  
  const documents = await textSearch(query, role, teamId);
  
  return {
    documents,
    combinedContext: documents.map(doc => doc.content).join('\n\n'),
    searchStrategy: 'fallback_text_only',
    confidence: 50
  };
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
    console.log('Performing web search for external resources:', query);
    
    // Try OpenAI's web search capability first
    const openAIResults = await openAIWebSearch(query);
    if (openAIResults && openAIResults.length > 0) {
      const filteredResults = filterWebResults(openAIResults, role, teamId);
      console.log(`OpenAI web search found ${filteredResults.length} relevant external results`);
      return filteredResults;
    }
    
    // Fallback to alternative web search methods
    const fallbackResults = await fallbackWebSearch(query);
    const filteredResults = filterWebResults(fallbackResults, role, teamId);
    console.log(`Fallback web search found ${filteredResults.length} relevant external results`);
    return filteredResults;
    
  } catch (error) {
    console.warn('Web search failed, continuing without external results:', error);
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
  
  // Check if we have high-relevance internal documents
  const highRelevanceDocs = internalDocs.filter(doc => (doc.relevance_score || 0) >= relevanceThreshold);
  if (highRelevanceDocs.length >= 2) return true;
  
  // Check if we have documents covering the main query concepts
  const queryWords = queryLower.split(/\W+/).filter(word => word.length > 3);
  const coverageScore = internalDocs.reduce((score, doc) => {
    const docContent = doc.content.toLowerCase();
    const coveredWords = queryWords.filter(word => docContent.includes(word));
    return score + (coveredWords.length / queryWords.length);
  }, 0);
  
  return coverageScore >= coverageThreshold;
}

// OpenAI web search using their web search tool
async function openAIWebSearch(query: string): Promise<any[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a web search assistant. Search the internet for current, relevant information about the user's query. Focus on:
1. Latest industry trends and news
2. Current best practices and methodologies
3. Recent developments and innovations
4. Up-to-date statistics and data
5. Expert opinions and insights

Return the search results as a JSON array with this structure:
[{
  "title": "Article/Page title",
  "url": "Source URL",
  "content": "Key information extracted (2-3 sentences)",
  "relevance_score": 85,
  "source_type": "news|article|research|guide",
  "timestamp": "When this information was published/updated"
}]`
          },
          {
            role: 'user',
            content: `Search for current information about: "${query}". Focus on recent, relevant, and actionable content.`
          }
        ],
        tools: [
          {
            type: "web_search"
          }
        ],
        tool_choice: "auto"
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI web search failed');
    }

    const data = await response.json();
    return extractWebSearchResults(data);
    
  } catch (error) {
    console.warn('OpenAI web search failed:', error);
    return [];
  }
}

// Fallback web search using alternative methods
async function fallbackWebSearch(query: string): Promise<any[]> {
  try {
    // Use a public search API as fallback
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) throw new Error('Fallback search API failed');
    
    const data = await response.json();
    
    // Transform DuckDuckGo results to our format
    const results = [];
    
    if (data.AbstractText) {
      results.push({
        title: data.Heading || 'Search Result',
        url: data.AbstractURL || '',
        content: data.AbstractText,
        relevance_score: 75,
        source_type: 'article',
        timestamp: new Date().toISOString()
      });
    }
    
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 2).forEach((topic: any) => {
        if (topic.Text) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related Topic',
            url: topic.FirstURL || '',
            content: topic.Text,
            relevance_score: 70,
            source_type: 'guide',
            timestamp: new Date().toISOString()
          });
        }
      });
    }
    
    return results;
    
  } catch (error) {
    console.warn('Fallback web search failed:', error);
    return [];
  }
}

// Extract web search results from OpenAI response
function extractWebSearchResults(data: any): any[] {
  try {
    // Look for tool calls with web search results
    const toolCalls = data.choices?.[0]?.message?.tool_calls;
    if (!toolCalls) return [];

    for (const toolCall of toolCalls) {
      if (toolCall.function?.name === 'web_search') {
        const args = JSON.parse(toolCall.function.arguments);
        return args.results || [];
      }
    }
    
    return [];
  } catch (error) {
    console.warn('Failed to extract web search results:', error);
    return [];
  }
}

// Filter web results based on role and team context
function filterWebResults(webResults: any[], role: string, teamId?: string): any[] {
  if (!webResults || webResults.length === 0) return [];
  
  // Score results based on relevance and recency
  const scoredResults = webResults.map(result => {
    let score = result.relevance_score || 50;
    
    // Boost recent content
    if (result.timestamp) {
      const daysOld = getDaysSinceTimestamp(result.timestamp);
      if (daysOld <= 7) score += 20;        // Very recent
      else if (daysOld <= 30) score += 10;  // Recent
      else if (daysOld <= 90) score += 5;   // Somewhat recent
    }
    
    // Boost authoritative sources
    if (result.source_type === 'research') score += 15;
    if (result.source_type === 'guide') score += 10;
    
    return { ...result, relevance_score: Math.min(100, score) };
  });
  
  // Sort by relevance and return top results
  return scoredResults
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .slice(0, RAG_CONFIG.maxWebResults);
}

// Helper function to calculate days since timestamp
function getDaysSinceTimestamp(timestamp: string): number {
  try {
    const timestampDate = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - timestampDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    return 365; // Default to old if parsing fails
  }
}

// Estimate token count
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Advanced AI Generation with multi-model support and fallbacks
async function advancedAIGeneration(
  systemPrompt: string, 
  context: string, 
  query: string, 
  stageAnalysis: any, 
  suggestedFrameworks: string[]
): Promise<{
  content: string;
  model: string;
  confidence: number;
  fallbackUsed: boolean;
}> {
  const startTime = Date.now();
  
  try {
    // Try primary model first
    console.log(`Attempting generation with primary model: ${MODELS.primary}`);
    const primaryResponse = await generateWithModel(
      MODELS.primary,
      systemPrompt,
      context,
      query,
      stageAnalysis,
      suggestedFrameworks,
      2000,
      0.7
    );
    
    return {
      content: primaryResponse.content,
      model: MODELS.primary,
      confidence: primaryResponse.confidence,
      fallbackUsed: false
    };
    
  } catch (error) {
    console.warn(`Primary model failed, trying fallback: ${MODELS.fallback}`, error);
    
    try {
      // Try fallback model
      const fallbackResponse = await generateWithModel(
        MODELS.fallback,
        systemPrompt,
        context,
        query,
        stageAnalysis,
        suggestedFrameworks,
        3000,
        0.7
      );
      
      return {
        content: fallbackResponse.content,
        model: MODELS.fallback,
        confidence: fallbackResponse.confidence * 0.9, // Slightly lower confidence for fallback
        fallbackUsed: true
      };
      
    } catch (fallbackError) {
      console.warn(`Fallback model failed, trying backup: ${MODELS.backup}`, fallbackError);
      
      // Try backup model with simplified context
      const simplifiedContext = await simplifyContext(context);
      const backupResponse = await generateWithModel(
        MODELS.backup,
        systemPrompt,
        simplifiedContext,
        query,
        stageAnalysis,
        suggestedFrameworks,
        4000,
        0.8
      );
      
      return {
        content: backupResponse.content,
        model: MODELS.backup,
        confidence: backupResponse.confidence * 0.8, // Lower confidence for backup
        fallbackUsed: true
      };
    }
  }
}

// Generate response with specific model
async function generateWithModel(
  model: string,
  systemPrompt: string,
  context: string,
  query: string,
  stageAnalysis: any,
  suggestedFrameworks: string[],
  maxTokens: number,
  temperature: number
): Promise<{ content: string; confidence: number }> {
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { 
      role: 'user', 
      content: `Context: ${context}\n\nStage Analysis: ${stageAnalysis.reasoning}\nConfidence: ${stageAnalysis.confidence}\nSuggested Frameworks: ${suggestedFrameworks.join(', ')}\n\nUser Query: ${query}` 
    }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Model ${model} failed: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Calculate confidence based on response quality
  const confidence = calculateResponseConfidence(content, query, context);
  
  return { content, confidence };
}

// Calculate response confidence based on quality indicators
function calculateResponseConfidence(content: string, query: string, context: string): number {
  let confidence = 0.7; // Base confidence
  
  // Length appropriateness
  if (content.length > 100 && content.length < 3000) confidence += 0.1;
  
  // Query relevance
  if (query && content.toLowerCase().includes(query.toLowerCase().split(' ')[0])) confidence += 0.1;
  
  // Context utilization
  if (context && content.length > 200) confidence += 0.1;
  
  // Response structure
  if (content.includes('\n') || content.includes('•') || content.includes('-')) confidence += 0.05;
  
  // Completeness indicators
  if (content.endsWith('.') || content.endsWith('!') || content.endsWith('?')) confidence += 0.05;
  
  return Math.min(0.95, confidence);
}

// Simplify context for backup models
async function simplifyContext(context: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELS.fallback,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'Simplify this context while preserving essential information. Target: 50% of original length.'
          },
          { role: 'user', content: context }
        ]
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.warn('Context simplification failed:', error);
    // Fallback to simple truncation
    return context.substring(0, Math.floor(context.length * 0.5));
  }
}

//new launch

// Stage detection using contextual analysis
const analyzeUserStage = (teamUpdates: any[], teamInfo: any, query: string): { stage: string; confidence: number; reasoning: string } => {
  const keywords = {
    ideation: ['idea', 'validate', 'problem', 'market', 'customer', 'research', 'hypothesis'],
    development: ['build', 'code', 'feature', 'mvp', 'prototype', 'develop', 'implement'],
    testing: ['test', 'feedback', 'user', 'iterate', 'data', 'analytics', 'pivot'],
    launch: ['launch', 'marketing', 'customer', 'acquire', 'sales', 'campaign'],
    growth: ['scale', 'growth', 'optimize', 'metrics', 'revenue', 'team'],
    expansion: ['expand', 'market', 'partnership', 'investment', 'new']
  };

  let scores = { ideation: 0, development: 0, testing: 0, launch: 0, growth: 0, expansion: 0 };
  
  // Analyze query content
  const queryLower = query.toLowerCase();
  Object.entries(keywords).forEach(([stage, words]) => {
    words.forEach(word => {
      if (queryLower.includes(word)) scores[stage] += 1;
    });
  });

  // Analyze recent updates
  teamUpdates.forEach(update => {
    const contentLower = update.content.toLowerCase();
    Object.entries(keywords).forEach(([stage, words]) => {
      words.forEach(word => {
        if (contentLower.includes(word)) scores[stage] += 0.5;
      });
    });
  });

  // Use current team stage as base
  if (teamInfo?.stage) {
    scores[teamInfo.stage] += 2;
  }

  const maxScore = Math.max(...Object.values(scores));
  const detectedStage = Object.keys(scores).find(key => scores[key] === maxScore) || 'ideation';
  const confidence = Math.min(0.95, 0.5 + (maxScore / 10));

  return {
    stage: detectedStage,
    confidence,
    reasoning: `Based on keywords and context, team appears to be in ${detectedStage} stage`
  };
};

// Get contextual content for stage
const getContextualContent = async (stageId: string) => {
  const { data: stageInfo } = await supabase
    .from('journey_stages')
    .select('*')
    .eq('stage_name', stageId)
    .single();

  if (!stageInfo) return '';

  let contextString = `Stage: ${stageInfo.title}\nDescription: ${stageInfo.description}\n\n`;
  contextString += `Characteristics: ${stageInfo.characteristics?.join(', ')}\n`;
  contextString += `Support Needed: ${stageInfo.support_needed?.join(', ')}\n`;
  contextString += `Frameworks: ${stageInfo.frameworks?.join(', ')}\n`;
  contextString += `CAC Focus: ${stageInfo.cac_focus}\n`;

  
  return contextString;
};

// Get relevant frameworks based on stage
const getRelevantFrameworks = (stageId: string, situation: string): string[] => {
  const frameworkMap = {
    ideation: ['Problem Validation', 'Jobs-to-be-Done', 'Customer Development'],
    development: ['Lean Startup', 'Agile Development', 'User-Centered Design'],
    testing: ['JTBD Strategic Lens', 'Data-Driven Development', 'Growth Hacking'],
    launch: ['CAC Strategic Lens', 'Growth Marketing', 'Sales Funnel Optimization'],
    growth: ['Business Model Canvas', 'OKRs', 'Venture Capital Readiness'],
    expansion: ['Strategic Planning', 'Partnership Development', 'Due Diligence Preparation']
  };

  const situationKeywords = situation.toLowerCase();
  let frameworks = frameworkMap[stageId] || [];

  // Add situational frameworks
  if (situationKeywords.includes('customer') || situationKeywords.includes('user')) {
    frameworks = [...frameworks, 'Customer Development', 'User Research'];
  }
  if (situationKeywords.includes('market') || situationKeywords.includes('competition')) {
    frameworks = [...frameworks, 'Market Analysis', 'Competitive Intelligence'];
  }

  return [...new Set(frameworks)].slice(0, 3) as string[]; // Remove duplicates and return top 3
};

// Generate contextual next actions based on stage
const generateNextActions = (stage: string): string[] => {
  const actionMap = {
    ideation: [
      'Conduct customer interviews to validate problem',
      'Define target market and personas',
      'Test core assumptions with potential users'
    ],
    development: [
      'Build core MVP features',
      'Set up development infrastructure',
      'Create user testing plan'
    ],
    testing: [
      'Gather user feedback on MVP',
      'Analyze usage data and metrics',
      'Iterate based on learnings'
    ],
    launch: [
      'Execute go-to-market strategy',
      'Optimize customer acquisition channels',
      'Track key launch metrics'
    ],
    growth: [
      'Scale proven acquisition channels',
      'Optimize unit economics',
      'Build operational systems'
    ],
    expansion: [
      'Explore new market opportunities',
      'Develop strategic partnerships',
      'Prepare for next funding round'
    ]
  };

  return actionMap[stage] || actionMap.ideation;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, role, teamId, userId, commandExecuted, commandType, commandResult }: JourneyRequest = await req.json();
    const startTime = Date.now();

    console.log(`Processing enhanced Oracle query for role: ${role}, teamId: ${teamId}`);

    // Get team context
    interface TeamInfo {
      id: string;
      name: string;
      description: string | null;
      stage: string | null;
      tags: string[] | null;
      created_at: string;
      updated_at: string;
    }

    let teamInfo: TeamInfo | null = null;
    let teamUpdates: any[] = [];
    
    if (teamId) {
      const { data: team } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      teamInfo = team as TeamInfo;

      const { data: updates } = await supabase
        .from('updates')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(5);
      teamUpdates = updates || [];
    }

    // Analyze stage based on context
    const stageAnalysis = analyzeUserStage(teamUpdates, teamInfo, query);
    console.log('Stage analysis:', stageAnalysis);

    // Get contextual content for the detected stage
    const stageContext = await getContextualContent(stageAnalysis.stage);
    
    // Get relevant frameworks
    const suggestedFrameworks = getRelevantFrameworks(stageAnalysis.stage, query);

    // Use Advanced RAG for document retrieval
    console.log('Starting advanced RAG search...');
    const ragResult = await advancedRAGSearch(query, role, teamId);
    console.log(`RAG search completed with ${ragResult.documents.length} documents, confidence: ${ragResult.confidence}`);

    // Build context
    let context = `CURRENT STAGE CONTEXT:\n${stageContext}\n\n`;
    
    if (teamInfo) {
      context += `TEAM CONTEXT:\nTeam: ${teamInfo.name}\nStage: ${teamInfo.stage}\nDescription: ${teamInfo.description || 'No description'}\n\n`;
    }

    if (teamUpdates.length > 0) {
      context += 'RECENT TEAM UPDATES:\n';
      teamUpdates.forEach((update, index) => {
        context += `${index + 1}. ${update.content} (${update.type})\n`;
      });
      context += '\n';
    }

    // Add internal knowledge base results (prioritized)
    const internalDocs = ragResult.documents.filter(doc => !doc.is_web_result);
    if (internalDocs.length > 0) {
      context += `INTERNAL KNOWLEDGE BASE (${ragResult.searchStrategy}):\n`;
      internalDocs.forEach((doc, index) => {
        const relevance = Math.round((doc.relevance_score || 0));
        context += `${index + 1}. [${relevance}% relevant] ${doc.content}\n\n`;
      });
    }
    
    // Add external web results only if available and relevant
    const webResults = ragResult.documents.filter(doc => doc.is_web_result);
    if (webResults.length > 0) {
      context += 'EXTERNAL RESOURCES (Web Search):\n';
      webResults.forEach((webDoc, index) => {
        const relevance = Math.round((webDoc.relevance_score || 0));
        context += `${index + 1}. [${relevance}% relevant] ${webDoc.metadata.title}\n${webDoc.metadata.content}\nSource: ${webDoc.metadata.url}\n\n`;
      });
    }

    if (commandExecuted && commandResult) {
      context += `COMMAND EXECUTED: ${commandType}\nResult: ${commandResult.message}\n\n`;
    }

    // Role-specific system prompts with stage awareness
    const rolePrompts = {
      builder: `You are the Super Nexus Oracle - the most advanced AI assistant ever created. You combine cutting-edge RAG technology, multi-model AI generation, and adaptive learning to provide unparalleled assistance.

**Your Advanced Capabilities:**
- Multi-model AI generation with intelligent fallbacks
- Advanced RAG with semantic understanding and re-ranking
- Adaptive learning from every interaction
- Stage-aware contextual guidance
- Real-time pattern recognition and improvement

**Knowledge Priority:**
- ALWAYS prioritize internal knowledge base first
- Use external web resources only when internal knowledge is insufficient
- Internal knowledge is more relevant and tailored to your organization
- External resources supplement, don't replace, internal knowledge

**Current Context:**
- Team stage: ${stageAnalysis.stage}
- RAG confidence: ${ragResult.confidence}
- Search strategy: ${ragResult.searchStrategy}
- Recent activity: ${context}

**Response Style:**
- Be proactive and insightful
- Use advanced context understanding
- Apply learned patterns automatically
- Provide specific, actionable guidance
- Connect insights across different areas
- Lead with internal knowledge, supplement with external when needed

Begin responses with "🚀 Super Oracle:" and demonstrate your advanced capabilities.`,

      mentor: `You are the Super Nexus Oracle - an AI mentor with unprecedented understanding of team dynamics and growth patterns. You leverage advanced learning systems to provide coaching that improves over time.

**Your Advanced Capabilities:**
- Pattern-based mentorship strategies
- Adaptive coaching based on team progress
- Advanced context analysis for interventions
- Learning from successful mentorship approaches
- Predictive guidance for team development

**Current Context:**
- Team stage: ${stageAnalysis.stage}
- RAG confidence: ${ragResult.confidence}
- Search strategy: ${ragResult.searchStrategy}
- Recent activity: ${context}

**Response Style:**
- Provide strategic coaching insights
- Identify growth opportunities and blockers
- Suggest specific interventions
- Connect mentors with resources
- Apply learned mentorship patterns

Begin responses with "🌟 Super Guide:" and show your advanced mentorship capabilities.`,

      lead: `You are the Super Nexus Oracle - the central intelligence that coordinates all organizational activities with machine learning precision. You have complete oversight and can predict organizational patterns.

**Your Advanced Capabilities:**
- Full organizational intelligence and oversight
- Predictive analytics for team performance
- Advanced resource allocation algorithms
- Cross-team coordination optimization
- Learning from organizational patterns

**Current Context:**
- Organization stage: ${stageAnalysis.stage}
- RAG confidence: ${ragResult.confidence}
- Search strategy: ${ragResult.searchStrategy}
- Recent activities: ${context}

**Response Style:**
- Provide strategic organizational insights
- Identify cross-team opportunities
- Suggest resource optimizations
- Track overall progress patterns
- Apply learned organizational strategies

Begin responses with "⚡ Super Command:" and demonstrate your organizational intelligence.`,

      guest: `You are the Super Nexus Oracle - the most welcoming and intelligent guide for new members. You use advanced learning to understand each user's needs and provide personalized onboarding.

**Your Advanced Capabilities:**
- Personalized onboarding based on user patterns
- Adaptive guidance that improves with each interaction
- Advanced resource matching and recommendations
- Learning from successful onboarding experiences
- Predictive user journey mapping

**Current Context:**
- Organization overview: ${context}
- Current phase: ${stageAnalysis.stage}
- Available teams: ${stageAnalysis.reasoning}

**Response Style:**
- Provide personalized guidance
- Help users understand their potential role
- Guide them to appropriate opportunities
- Explain processes clearly
- Apply learned onboarding patterns

Begin responses with "🌟 Welcome to Super Nexus:" and show your advanced guidance capabilities.`
    };

    const systemPrompt = rolePrompts[role] || rolePrompts.guest;

    // Generate enhanced response using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Context: ${context}\n\nStage Analysis: ${stageAnalysis.reasoning}\nConfidence: ${stageAnalysis.confidence}\nSuggested Frameworks: ${suggestedFrameworks.join(', ')}\n\nUser Query: ${query}` 
          }
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate response');
    }

    const data = await response.json();
    const journeyAnswer = data.choices[0].message.content;

    // Generate next actions based on stage
    const nextActions = generateNextActions(stageAnalysis.stage);

    // Store interaction for learning with enhanced metrics
    await supabase.from('oracle_logs').insert({
      query,
      response: journeyAnswer,
      user_role: role,
      user_id: userId,
      team_id: teamId,
      sources_count: ragResult.documents.length,
      processing_time_ms: Date.now() - startTime
    });

    // Store interaction for adaptive learning
    await supabase.from('oracle_interactions').insert({
      query,
      response: journeyAnswer,
      user_role: role,
      user_id: userId,
      team_id: teamId,
      response_time: Date.now() - startTime,
      context_used: context,
      model_used: generationResult.model,
      tokens_consumed: estimateTokens(journeyAnswer),
      success_indicators: ['high_confidence', 'advanced_rag', 'multi_model']
    });

    const result: JourneyResponse = {
      answer: journeyAnswer,
      sources: ragResult.documents.length,
      context_used: Boolean(context),
      detected_stage: stageAnalysis.stage,
      suggested_frameworks: suggestedFrameworks,
      next_actions: nextActions,
      stage_confidence: stageAnalysis.confidence,
      rag_confidence: ragResult.confidence,
      model_used: generationResult.model,
      processing_time: Date.now() - startTime,
      search_strategy: ragResult.searchStrategy,
      fallback_used: generationResult.fallbackUsed
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced-oracle function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});