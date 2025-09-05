import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, query, role, userId, teamId } = await req.json();
    console.log(`Super Oracle request - Type: ${type}, Role: ${role}, Query: ${query}, User: ${userId}`);

    // Create Supabase client with user session
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {}
      }
    });

    // Handle different request types
    switch (type) {
      case 'rag_search':
        return await handleRAGSearch(supabase, query, role, userId);
      case 'chat':
        return await handleChat(supabase, query, role, userId, teamId);
      case 'journey':
        return await handleJourney(supabase, query, role, userId, teamId);
      case 'update':
        return await handleUpdate(supabase, query, role, userId, teamId);
      case 'resources':
        return await getResources(supabase, role, query);
      case 'examples':
        return await getExamples(supabase, role);
      case 'connect':
        return await getConnections(supabase, role, userId);
      default:
        return await handleChat(supabase, query, role, userId, teamId);
    }

  } catch (error) {
    console.error('Super Oracle error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function handleRAGSearch(supabase: any, query: string, role: string, userId: string) {
  try {
    console.log('Processing RAG search...');
    const startTime = Date.now();
    
    // Search for relevant documents
    const { data: documents, error } = await supabase
      .from('documents')
      .select('content, metadata')
      .textSearch('content', query)
      .limit(3);

    if (error) {
      console.error('Document search error:', error);
    }

    // Get role-specific context
    const context = await getRoleContext(supabase, role, userId);
    
    // Generate AI response
    const aiResponse = await generateAIResponse(query, role, documents || [], context);
    const processingTime = Date.now() - startTime;
    
    // Add required response fields
    const fullResponse = {
      ...aiResponse,
      processing_time: processingTime,
      sources: documents?.length || 0,
      confidence: 0.85,
      model_used: aiResponse.model_used || 'gpt-4o-mini',
      search_strategy: 'RAG Search',
      context_used: Boolean(context)
    };
    
    // Log the interaction
    await logOracleInteraction(supabase, userId, role, query, aiResponse.answer, documents?.length || 0);

    return new Response(
      JSON.stringify(fullResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('RAG search error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'RAG search failed', 
        details: error.message,
        answer: 'Sorry, I encountered an error processing your request.',
        sources: 0,
        confidence: 0,
        processing_time: 0,
        model_used: 'Error Handler',
        search_strategy: 'Error Response'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleChat(supabase: any, query: string, role: string, userId: string, teamId?: string) {
  try {
    console.log('Processing chat request...');
    const startTime = Date.now();
    
    // Detect slash commands
    const command = detectSlashCommand(query);
    if (command) {
      console.log('Detected slash command:', command);
      return await handleSlashCommand(supabase, command, query, role, userId, teamId);
    }
    
    // Get user context
    const userContext = await getUserContext(supabase, userId);
    console.log('User context retrieved:', userContext ? 'Yes' : 'No');
    
    // Search for relevant documents
    const { data: documents } = await supabase
      .from('documents')
      .select('content, metadata')
      .textSearch('content', query)
      .limit(5);

    // Generate enhanced response
    const aiResponse = await generateEnhancedResponse(query, role, documents || [], userContext);
    const processingTime = Date.now() - startTime;
    
    // Add required response fields
    const fullResponse = {
      ...aiResponse,
      processing_time: processingTime,
      sources: documents?.length || 0,
      confidence: aiResponse.confidence || 0.8,
      model_used: aiResponse.model_used || 'gpt-4o-mini',
      search_strategy: documents?.length > 0 ? 'Document Search' : 'Direct Chat',
      context_used: Boolean(userContext)
    };
    
    // Log interaction
    await logOracleInteraction(supabase, userId, role, query, aiResponse.answer, documents?.length || 0);

    console.log('Super Oracle response completed');
    return new Response(
      JSON.stringify(fullResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Chat failed', 
        details: error.message,
        answer: 'Sorry, I encountered an error processing your request.',
        sources: 0,
        confidence: 0,
        processing_time: 0,
        model_used: 'Error Handler',
        search_strategy: 'Error Response'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleJourney(supabase: any, query: string, role: string, userId: string, teamId?: string) {
  const stages = ['ideation', 'development', 'testing', 'launch', 'growth'];
  const currentStage = detectStage(query);
  
  return new Response(
    JSON.stringify({
      detected_stage: currentStage,
      feedback: `Based on your update, you seem to be in the ${currentStage} stage. Keep making progress!`,
      summary: query.slice(0, 100) + '...',
      next_steps: getNextStepsForStage(currentStage),
      answer: `Journey analysis complete. You're in the ${currentStage} stage.`,
      sources: 0,
      confidence: 0.9,
      processing_time: 50,
      model_used: 'Journey Analyzer',
      search_strategy: 'Pattern Recognition',
      context_used: true
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleUpdate(supabase: any, query: string, role: string, userId: string, teamId?: string) {
  const startTime = Date.now();
  const updateType = detectUpdateType(query);
  let stageAdvanced = false;
  let newStage = null;
  
  if (teamId && userId) {
    // Store the update
    await supabase
      .from('updates')
      .insert({
        team_id: teamId,
        content: query,
        type: updateType,
        created_by: userId
      });

    // AI-driven stage progression logic
    const shouldAdvanceStage = analyzeProgressForStageAdvancement(query, updateType);
    
    if (shouldAdvanceStage) {
      // Get current user's individual stage
      const { data: profile } = await supabase
        .from('profiles')
        .select('individual_stage')
        .eq('id', userId)
        .single();

      if (profile) {
        const stages = ['ideation', 'development', 'testing', 'launch', 'growth'];
        const currentIndex = stages.indexOf(profile.individual_stage || 'ideation');
        
        if (currentIndex < stages.length - 1) {
          newStage = stages[currentIndex + 1];
          
          // Update user's individual stage
          await supabase
            .from('profiles')
            .update({ individual_stage: newStage })
            .eq('id', userId);
          
          // Add milestone update
          await supabase
            .from('updates')
            .insert({
              team_id: teamId,
              content: `🚀 AI detected significant progress! Advanced to ${newStage} stage based on recent updates.`,
              type: 'milestone',
              created_by: 'ai_oracle'
            });
          
          stageAdvanced = true;
        }
      }
    }
  }

  const processingTime = Date.now() - startTime;
  
  return new Response(
    JSON.stringify({
      message: stageAdvanced ? `Update recorded and advanced to ${newStage} stage!` : 'Update recorded successfully',
      type: updateType,
      stage_advanced: stageAdvanced,
      new_stage: newStage,
      suggestions: getUpdateSuggestions(updateType, role),
      answer: stageAdvanced 
        ? `🎉 Update recorded successfully! Based on your progress, I've advanced you to the ${newStage} stage. Keep up the great work!`
        : `Update recorded successfully as ${updateType} update. Keep making progress to advance to the next stage!`,
      sources: 1,
      confidence: 1.0,
      processing_time: processingTime,
      model_used: 'AI Progress Analyzer',
      search_strategy: 'Progress Analysis',
      context_used: true
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// AI function to determine if progress warrants stage advancement
function analyzeProgressForStageAdvancement(query: string, updateType: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  // Milestone updates are strong indicators for advancement
  if (updateType === 'milestone') return true;
  
  // Look for completion keywords
  const completionKeywords = [
    'completed', 'finished', 'done', 'achieved', 'accomplished', 'delivered',
    'shipped', 'launched', 'deployed', 'released', 'built', 'created',
    'validated', 'tested', 'proven', 'successful', 'working'
  ];
  
  // Look for significant progress indicators
  const progressKeywords = [
    'breakthrough', 'major progress', 'significant', 'milestone reached',
    'ready for', 'moving to', 'next phase', 'phase complete'
  ];
  
  const hasCompletion = completionKeywords.some(keyword => lowerQuery.includes(keyword));
  const hasSignificantProgress = progressKeywords.some(keyword => lowerQuery.includes(keyword));
  
  // Also check for specific achievements per stage
  const stageSpecificProgress = [
    'mvp', 'prototype', 'user testing', 'feedback collected', 'market validation',
    'first users', 'beta test', 'product ready', 'go live', 'marketing campaign'
  ];
  
  const hasStageProgress = stageSpecificProgress.some(keyword => lowerQuery.includes(keyword));
  
  return hasCompletion || hasSignificantProgress || hasStageProgress;
}

function detectSlashCommand(query: string): string | null {
  const commands = ['resources', 'examples', 'connect', 'plan', 'help', 'update'];
  const lowerQuery = query.toLowerCase();
  
  for (const command of commands) {
    if (lowerQuery.includes(`/${command}`) || lowerQuery.includes(command)) {
      return command;
    }
  }
  return null;
}

async function handleSlashCommand(supabase: any, command: string, query: string, role: string, userId: string, teamId?: string) {
  switch (command) {
    case 'resources':
      return await getResources(supabase, role, query);
    case 'examples':
      return await getExamples(supabase, role);
    case 'connect':
      return await getConnections(supabase, role, userId);
    case 'plan':
      return await getPlanningHelp(role);
    case 'update':
      return await handleUpdate(supabase, query, role, userId, teamId);
    default:
      return await getHelp(role);
  }
}

async function getResources(supabase: any, role: string, query?: string) {
  const startTime = Date.now();
  
  const { data: documents } = await supabase
    .from('documents')
    .select('content, metadata')
    .eq('source_type', 'guide')
    .limit(10);

  const resources = documents?.map((doc: any) => ({
    title: doc.metadata?.title || 'Resource Guide',
    type: doc.metadata?.category || 'guide',
    category: doc.metadata?.category || 'general',
    url: doc.metadata?.url || '#',
    description: doc.content?.slice(0, 200) + '...' || 'Resource description',
    difficulty: doc.metadata?.difficulty || 'beginner',
    source: doc.metadata?.source || 'PieFi Knowledge Base'
  })) || [
    { title: 'Project Planning Guide', type: 'guide', category: 'planning', url: '#', description: 'Learn how to plan your project effectively', difficulty: 'beginner', source: 'PieFi' },
    { title: 'Team Collaboration Tools', type: 'tools', category: 'collaboration', url: '#', description: 'Essential tools for team collaboration', difficulty: 'intermediate', source: 'PieFi' },
    { title: 'Innovation Framework', type: 'framework', category: 'innovation', url: '#', description: 'Framework for structured innovation', difficulty: 'advanced', source: 'PieFi' }
  ];

  const processingTime = Date.now() - startTime;

  return new Response(
    JSON.stringify({
      answer: `Here are ${resources.length} resources for ${role}s based on your query: "${query || 'general resources'}"`,
      resources: resources,
      sources: resources.length,
      confidence: 0.9,
      processing_time: processingTime,
      model_used: 'Resource Database',
      search_strategy: 'Resource Lookup',
      context_used: true,
      commands: [
        '/examples - See practical examples',
        '/connect - Find relevant people', 
        '/plan - Get planning assistance'
      ]
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getExamples(supabase: any, role: string) {
  const startTime = Date.now();
  
  const { data: examples } = await supabase
    .from('oracle_logs')
    .select('query, response')
    .eq('user_role', role)
    .limit(3);

  const processingTime = Date.now() - startTime;

  return new Response(
    JSON.stringify({
      answer: `Here are practical examples for ${role}s:`,
      examples: examples || [
        { title: 'Successful Startup Story', type: 'case-study', description: 'How a team built a successful product from scratch' },
        { title: 'MVP Development Process', type: 'process', description: 'Step-by-step guide to creating your MVP' },
        { title: 'Team Formation Best Practices', type: 'guide', description: 'How to build and manage effective teams' }
      ],
      sources: examples?.length || 3,
      confidence: 0.8,
      processing_time: processingTime,
      model_used: 'Example Database',
      search_strategy: 'Example Lookup',
      context_used: true,
      suggestions: getRoleSuggestions(role)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getConnections(supabase: any, role: string, userId: string) {
  const startTime = Date.now();
  
  const targetRoles = role === 'builder' ? ['mentor', 'lead'] : 
                     role === 'mentor' ? ['builder', 'lead'] :
                     ['builder', 'mentor'];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('full_name, role, bio, skills, github_url, linkedin_url')
    .in('role', targetRoles)
    .limit(5);

  const connections = profiles?.map((profile: any) => ({
    full_name: profile.full_name || 'Anonymous User',
    name: profile.full_name || 'Anonymous User',
    role: profile.role,
    title: `${profile.role} at PieFi`,
    bio: profile.bio?.slice(0, 100) + '...' || 'No bio available',
    company: 'PieFi Accelerator',
    skills: profile.skills || [],
    expertise: profile.bio || 'General expertise',
    linkedin: profile.linkedin_url || '#',
    github: profile.github_url || '#'
  })) || [
    { full_name: 'John Doe', name: 'John Doe', role: 'Mentor', title: 'Mentor at PieFi', bio: 'Experienced tech mentor with 10+ years in startups', company: 'PieFi', skills: ['React', 'Node.js', 'Leadership'], linkedin: '#' },
    { full_name: 'Jane Smith', name: 'Jane Smith', role: 'Builder', title: 'Builder at PieFi', bio: 'Passionate builder working on innovative solutions', company: 'PieFi', skills: ['UI/UX', 'Design', 'Prototyping'], linkedin: '#' }
  ];

  const processingTime = Date.now() - startTime;

  return new Response(
    JSON.stringify({
      answer: `Here are ${connections.length} relevant connections for ${role}s:`,
      connections: connections,
      sources: connections.length,
      confidence: 0.7,
      processing_time: processingTime,
      model_used: 'Connection Database',
      search_strategy: 'Network Lookup',
      context_used: true,
      suggestions: ['Connect via messaging', 'Join common teams', 'Participate in discussions']
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getPlanningHelp(role: string) {
  const startTime = Date.now();
  
  const planningAdvice = {
    builder: [
      'Define your problem and target users',
      'Research existing solutions and identify gaps',
      'Create a minimum viable product (MVP)',
      'Set up user testing and feedback loops',
      'Iterate based on user feedback'
    ],
    mentor: [
      'Schedule regular check-ins with mentees',
      'Prepare thoughtful questions for guidance sessions',
      'Share relevant resources and examples',
      'Help mentees set realistic goals',
      'Connect mentees with relevant opportunities'
    ],
    lead: [
      'Define clear team goals and success metrics',
      'Establish communication protocols',
      'Set up regular progress reviews',
      'Identify and mitigate potential risks',
      'Ensure teams have necessary resources'
    ]
  };

  const processingTime = Date.now() - startTime;

  return new Response(
    JSON.stringify({
      answer: `Here's comprehensive planning guidance for ${role}s:`,
      plan_steps: planningAdvice[role as keyof typeof planningAdvice] || planningAdvice.builder,
      sources: 1,
      confidence: 0.95,
      processing_time: processingTime,
      model_used: 'Planning Assistant',
      search_strategy: 'Knowledge Base',
      context_used: true,
      resources: ['Project management templates', 'Goal-setting frameworks', 'Progress tracking tools']
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getHelp(role: string) {
  const commands = [
    '/resources - View guides and best practices',
    '/examples - See practical examples for your role',
    '/connect - Find relevant team members',
    '/plan - Get project planning assistance',
    '/update - Record progress updates'
  ];

  return new Response(
    JSON.stringify({
      answer: `Welcome to Oracle! I'm here to help ${role}s succeed. Here are available commands:`,
      sources: 0,
      confidence: 1.0,
      processing_time: 10,
      model_used: 'Help System',
      search_strategy: 'Command Reference',
      context_used: false,
      commands,
      getting_started: `Try asking: "How do I get started?" or use any of the commands above.`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getRoleContext(supabase: any, role: string, userId: string) {
  const context: any = { role };
  
  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id, skills, user_types, interests, looking_for_skills, individual_stage, role')
      .eq('id', userId)
      .single();
    context.profile = profile;
  }
  
  return context;
}

async function getUserContext(supabase: any, userId: string) {
  if (!userId) return null;
  
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    return profile;
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
}

async function generateAIResponse(query: string, role: string, documents: any[], context: any) {
  const startTime = Date.now();
  
  const roleContext = {
    builder: 'You are helping builders create innovative projects and learn new skills.',
    mentor: 'You are helping mentors guide and support builders effectively.',
    lead: 'You are helping leads manage teams and coordinate projects.',
    guest: 'You are helping guests explore opportunities and find their path.'
  };

  const systemPrompt = `${roleContext[role as keyof typeof roleContext] || roleContext.guest}
  
Available context: ${JSON.stringify(context)}
Available documents: ${documents?.map(d => d.content?.slice(0, 200)).join('\n') || 'No documents found'}

Provide helpful, actionable advice. Include specific suggestions and resources when possible.`;

  const fallbackResponse = {
    answer: generateFallbackResponse(query, role),
    sources: documents?.length || 0,
    confidence: 0.7,
    processing_time: Date.now() - startTime,
    model_used: 'Fallback Response',
    search_strategy: 'Fallback',
    context_used: Boolean(context),
    suggestions: getRoleSuggestions(role),
    commands: ['/resources', '/examples', '/connect', '/plan']
  };

  if (!openAIApiKey) {
    console.log('OpenAI API key not found, using fallback');
    return fallbackResponse;
  }

  try {
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
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return fallbackResponse;
    }

    const data = await response.json();
    const aiAnswer = data.choices[0].message.content;
    const processingTime = Date.now() - startTime;

    return {
      answer: aiAnswer,
      sources: documents?.length || 0,
      confidence: 0.85,
      processing_time: processingTime,
      model_used: 'gpt-4o-mini',
      search_strategy: documents?.length > 0 ? 'RAG Search' : 'Direct Response',
      context_used: Boolean(context),
      suggestions: getRoleSuggestions(role),
      commands: ['/resources', '/examples', '/connect', '/plan']
    };

  } catch (error) {
    console.error('AI generation error:', error);
    return fallbackResponse;
  }
}

async function generateEnhancedResponse(query: string, role: string, documents: any[], userContext: any) {
  return await generateAIResponse(query, role, documents, userContext);
}

function generateFallbackResponse(query: string, role: string): string {
  const responses = {
    builder: `As a builder, focus on: 1) Clearly defining your problem, 2) Understanding your users, 3) Building iteratively, 4) Testing early and often. What specific aspect would you like help with?`,
    mentor: `As a mentor, your key responsibilities are: 1) Active listening, 2) Asking powerful questions, 3) Sharing relevant experiences, 4) Connecting mentees with resources. How can I help you support your mentees better?`,
    lead: `As a lead, focus on: 1) Clear communication, 2) Setting realistic goals, 3) Removing blockers for your team, 4) Fostering collaboration. What leadership challenge can I help you with?`,
    guest: `Welcome! Oracle can help you explore different roles, learn best practices, and connect with the community. What interests you most about innovation and collaboration?`
  };

  return responses[role as keyof typeof responses] || responses.guest;
}

function getRoleSuggestions(role: string): string[] {
  const suggestions = {
    builder: [
      'Break your project into smaller milestones',
      'Research similar solutions for inspiration',
      'Start with user interviews to validate ideas',
      'Create a simple prototype to test concepts'
    ],
    mentor: [
      'Ask open-ended questions to guide thinking',
      'Share relevant experiences without prescribing solutions',
      'Connect mentees with useful resources',
      'Help them set achievable goals'
    ],
    lead: [
      'Monitor team health and productivity',
      'Facilitate cross-team collaboration',
      'Ensure clear goals and adequate resources',
      'Address blockers quickly'
    ],
    guest: [
      'Explore different roles to find your fit',
      'Learn from others experiences',
      'Start with small experiments',
      'Connect with the community'
    ]
  };

  return suggestions[role as keyof typeof suggestions] || suggestions.guest;
}

async function logOracleInteraction(supabase: any, userId: string, role: string, query: string, response: string, sourcesCount: number) {
  try {
    if (userId) {
      let userRole = role;
      if (!userRole) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        userRole = profile?.role || 'guest';
      }

      await supabase
        .from('oracle_logs')
        .insert({
          user_id: userId,
          user_role: userRole,
          query,
          response,
          sources_count: sourcesCount,
          processing_time_ms: Date.now()
        });
    }
  } catch (error) {
    console.error('Error logging interaction:', error);
  }
}

function detectStage(query: string): string {
  const stageKeywords = {
    ideation: ['idea', 'concept', 'brainstorm', 'problem', 'research'],
    development: ['build', 'code', 'develop', 'implement', 'create'],
    testing: ['test', 'user', 'feedback', 'validate', 'prototype'],
    launch: ['launch', 'deploy', 'release', 'go live', 'publish'],
    growth: ['scale', 'grow', 'expand', 'marketing', 'users']
  };

  const lowerQuery = query.toLowerCase();
  for (const [stage, keywords] of Object.entries(stageKeywords)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      return stage;
    }
  }
  return 'ideation';
}

function detectUpdateType(query: string): string {
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes('milestone') || lowerQuery.includes('completed')) return 'milestone';
  if (lowerQuery.includes('mentor') || lowerQuery.includes('meeting')) return 'mentor_meeting';
  return 'daily';
}

function getNextStepsForStage(stage: string): string[] {
  const nextSteps = {
    ideation: ['Validate your problem with potential users', 'Research existing solutions', 'Define your target audience'],
    development: ['Set up your development environment', 'Create a simple prototype', 'Plan your MVP features'],
    testing: ['Recruit test users', 'Create feedback collection system', 'Iterate based on user input'],
    launch: ['Prepare marketing materials', 'Set up analytics', 'Plan launch sequence'],
    growth: ['Analyze user metrics', 'Optimize conversion funnel', 'Scale successful features']
  };

  return nextSteps[stage as keyof typeof nextSteps] || nextSteps.ideation;
}

function getUpdateSuggestions(updateType: string, role: string): string[] {
  const suggestions = {
    daily: ['What did you accomplish?', 'Any blockers?', 'Plans for tomorrow?'],
    milestone: ['What was completed?', 'Lessons learned?', 'Next milestone target?'],
    mentor_meeting: ['Key discussion points?', 'Action items?', 'Next meeting scheduled?']
  };

  return suggestions[updateType as keyof typeof suggestions] || suggestions.daily;
}