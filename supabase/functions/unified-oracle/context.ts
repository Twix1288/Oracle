import { createClient } from '@supabase/supabase-js';

interface ContextRequest {
  teamId?: string;
  userId?: string;
  role: string;
  query: string;
  needsResources?: boolean;
  needsMentions?: boolean;
  needsTeamContext?: boolean;
  needsPersonalization?: boolean;
  resourceTopic?: string;
}

interface ContextResult {
  teamInfo: any;
  teamUpdates: any[];
  documents: any[];
  relevantPeople: any[];
  mentionedUsers: any[];
  resources: any[];
  context: string;
  stageAnalysis: {
    stage: string;
    confidence: number;
    reasoning: string;
  };
}

export async function gatherContext(
  supabase: ReturnType<typeof createClient>,
  request: ContextRequest
): Promise<ContextResult> {
  const {
    teamId,
    userId,
    role,
    query,
    needsResources,
    needsMentions,
    needsTeamContext,
    needsPersonalization,
    resourceTopic
  } = request;

  // Initialize result
  const result: ContextResult = {
    teamInfo: null,
    teamUpdates: [],
    documents: [],
    relevantPeople: [],
    mentionedUsers: [],
    resources: [],
    context: '',
    stageAnalysis: {
      stage: 'ideation',
      confidence: 0.5,
      reasoning: ''
    }
  };

  try {
    // Parallel fetch of all required data
    const [
      teamData,
      updatesData,
      documentsData,
      peopleData,
      mentionsData,
      resourcesData
    ] = await Promise.all([
      // Team context
      needsTeamContext && teamId ? 
        supabase
          .from('teams')
          .select(`
            *,
            members (id, name, role, skills),
            team_status (current_status, last_update, health_score),
            tasks (id, title, status, priority)
          `)
          .eq('id', teamId)
          .single() : 
        Promise.resolve({ data: null }),

      // Recent updates
      teamId ?
        supabase
          .from('updates')
          .select('*')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false })
          .limit(5) :
        Promise.resolve({ data: [] }),

      // Relevant documents
      supabase
        .from('documents')
        .select('content, metadata, source_type')
        .contains('role_visibility', [role])
        .textSearch('content', query.replace(/ /g, ' | '), {
          type: 'websearch',
          config: 'english'
        })
        .limit(3),

      // Relevant people
      needsPersonalization ?
        supabase
          .from('members')
          .select('id, name, role, skills, experience_level, help_needed')
          .not('id', 'eq', userId)
          .limit(5) :
        Promise.resolve({ data: [] }),

      // Mentioned users
      needsMentions ?
        supabase
          .from('members')
          .select('id, name, role')
          .textSearch('name', query.replace(/ /g, ' | '), {
            type: 'websearch',
            config: 'english'
          })
          .limit(3) :
        Promise.resolve({ data: [] }),

      // Resources
      needsResources ?
        supabase
          .from('documents')
          .select('*')
          .textSearch('content', (resourceTopic || query).replace(/ /g, ' | '), {
            type: 'websearch',
            config: 'english'
          })
          .eq('source_type', 'resource')
          .limit(5) :
        Promise.resolve({ data: [] })
    ]);

    // Process team data
    if (teamData.data) {
      result.teamInfo = teamData.data;
      result.context += `TEAM CONTEXT:\n`;
      result.context += `Team: ${teamData.data.name}\n`;
      result.context += `Stage: ${teamData.data.stage}\n`;
      result.context += `Description: ${teamData.data.description || 'No description'}\n`;
      result.context += `Members: ${teamData.data.members?.length || 0}\n`;
      result.context += `Health Score: ${teamData.data.team_status?.[0]?.health_score || 'N/A'}\n\n`;

      // Analyze stage based on team data
      result.stageAnalysis = analyzeTeamStage(teamData.data, updatesData.data || []);
    }

    // Process updates
    if (updatesData.data?.length) {
      result.teamUpdates = updatesData.data;
      result.context += `RECENT UPDATES:\n`;
      updatesData.data.forEach((update: any, idx: number) => {
        result.context += `${idx + 1}. ${update.content} (${update.type})\n`;
      });
      result.context += '\n';
    }

    // Process documents
    if (documentsData.data?.length) {
      result.documents = documentsData.data;
      result.context += `RELEVANT KNOWLEDGE BASE:\n`;
      documentsData.data.forEach((doc: any, idx: number) => {
        result.context += `${idx + 1}. ${doc.content}\n`;
      });
      result.context += '\n';
    }

    // Process people
    if (peopleData.data?.length) {
      result.relevantPeople = peopleData.data;
      result.context += `RELEVANT TEAM MEMBERS:\n`;
      peopleData.data.forEach((person: any) => {
        result.context += `- ${person.name} (${person.role}): ${person.skills?.join(', ') || 'No skills listed'}\n`;
      });
      result.context += '\n';
    }

    // Process mentions
    if (mentionsData.data?.length) {
      result.mentionedUsers = mentionsData.data;
    }

    // Process resources
    if (resourcesData.data?.length) {
      result.resources = resourcesData.data.map((resource: any) => ({
        title: resource.metadata?.title || 'Untitled Resource',
        url: resource.metadata?.url || '#',
        type: resource.metadata?.type || 'article',
        description: resource.content,
        relevance: calculateRelevance(resource, query)
      }));
    }

  } catch (error) {
    console.error('Error gathering context:', error);
    // Return partial context on error
  }

  return result;
}

function analyzeTeamStage(teamInfo: any, updates: any[]): ContextResult['stageAnalysis'] {
  const keywords = {
    ideation: ['idea', 'validate', 'problem', 'market', 'customer', 'research', 'hypothesis'],
    development: ['build', 'code', 'feature', 'mvp', 'prototype', 'develop', 'implement'],
    testing: ['test', 'feedback', 'user', 'iterate', 'data', 'analytics', 'pivot'],
    launch: ['launch', 'marketing', 'customer', 'acquire', 'sales', 'campaign'],
    growth: ['scale', 'growth', 'optimize', 'metrics', 'revenue', 'team']
  };

  let scores = { ideation: 0, development: 0, testing: 0, launch: 0, growth: 0 };

  // Score based on team info
  if (teamInfo.stage) {
    scores[teamInfo.stage] += 2;
  }

  // Score based on updates
  updates.forEach(update => {
    const content = update.content.toLowerCase();
    Object.entries(keywords).forEach(([stage, words]) => {
      words.forEach(word => {
        if (content.includes(word)) scores[stage] += 0.5;
      });
    });
  });

  // Score based on tasks
  teamInfo.tasks?.forEach((task: any) => {
    const content = (task.title + ' ' + (task.description || '')).toLowerCase();
    Object.entries(keywords).forEach(([stage, words]) => {
      words.forEach(word => {
        if (content.includes(word)) scores[stage] += 0.25;
      });
    });
  });

  // Find highest scoring stage
  const maxScore = Math.max(...Object.values(scores));
  const detectedStage = Object.keys(scores).find(key => scores[key] === maxScore) || 'ideation';

  // Calculate confidence
  const confidence = Math.min(0.95, 0.5 + (maxScore / 10));

  return {
    stage: detectedStage,
    confidence,
    reasoning: `Based on team activity and content analysis, the team appears to be in ${detectedStage} stage`
  };
}

function calculateRelevance(resource: any, query: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const contentTerms = resource.content.toLowerCase().split(/\s+/);
  const metadataTerms = Object.values(resource.metadata || {})
    .filter(v => typeof v === 'string')
    .join(' ')
    .toLowerCase()
    .split(/\s+/);

  let matches = 0;
  queryTerms.forEach(term => {
    if (contentTerms.includes(term)) matches += 1;
    if (metadataTerms.includes(term)) matches += 0.5;
  });

  return Math.min(1, matches / queryTerms.length);
}
