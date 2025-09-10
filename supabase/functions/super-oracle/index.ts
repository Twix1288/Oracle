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
}

// Get comprehensive user context from database
async function getUserContext(userId?: string, teamId?: string): Promise<string> {
  try {
    console.log('🔍 Getting comprehensive user context...');
    
    if (!userId) return '';
    
    let context = '';
    
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profile) {
      context += `\n## User Profile
- Name: ${profile.full_name || 'Unknown'}
- Bio: ${profile.bio || 'No bio available'}
- Skills: ${(profile.skills || []).join(', ')}
- Builder Level: ${profile.builder_level || 'novice'}
- Learning Goals: ${(profile.learning_goals || []).join(', ')}
- Project Goals: ${profile.project_goals || 'No specific goals'}
- Availability: ${profile.availability_hours || 0} hours/week
`;
    }
    
    // Get user's teams (both created and joined)
    const { data: createdTeams } = await supabase
      .from('teams')
      .select('id, name, description, status, created_at, project_description')
      .eq('team_creator_id', userId);
    
    const { data: memberTeams } = await supabase
      .from('members')
      .select(`
        teams!inner(id, name, description, status, created_at, project_description),
        role
      `)
      .eq('user_id', userId);
    
    const allTeams = [
      ...(createdTeams || []).map(team => ({ ...team, role: 'creator' })),
      ...(memberTeams || []).map(m => ({ ...m.teams, role: m.role }))
    ];
    
    if (allTeams && allTeams.length > 0) {
      context += `\n## User's Projects/Teams
${allTeams.map(team => `- ${team.name}: ${team.description || team.project_description || 'No description'} (${team.status}) - Role: ${team.role}`).join('\n')}
`;
    }
    
    // Get recent progress entries
    const { data: progress } = await supabase
      .from('progress_entries')
      .select('title, description, category, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (progress && progress.length > 0) {
      context += `\n## Recent Progress
${progress.map(p => `- ${p.title}: ${p.description} (${p.status})`).join('\n')}
`;
    }
    
    // Get recent project updates
    const { data: updates } = await supabase
      .from('project_updates')
      .select('title, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (updates && updates.length > 0) {
      context += `\n## Recent Project Updates
${updates.map(u => `- ${u.title}: ${u.content.substring(0, 100)}...`).join('\n')}
`;
    }
    
    // Get connection requests
    const { data: connections } = await supabase
      .from('connection_requests')
      .select('request_type, message, status, created_at')
      .or(`requester_id.eq.${userId},requested_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (connections && connections.length > 0) {
      context += `\n## Recent Connections
${connections.map(c => `- ${c.request_type}: ${c.message.substring(0, 50)}... (${c.status})`).join('\n')}
`;
    }
    
    console.log('✅ User context retrieved successfully');
    console.log('📊 Context length:', context.length);
    console.log('📊 Context preview:', context.substring(0, 500));
    return context;
  } catch (error) {
    console.error('❌ Error getting user context:', error);
    return `Error retrieving user context: ${error.message}`;
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

// Simple AI response generation
async function generateAIResponse(query: string, context: string, userContext: any, userId?: string, teamId?: string): Promise<string> {
  try {
    console.log('🤖 Generating AI response for query:', query.substring(0, 100));
    
    if (!AI_MODELS.openai.apiKey) {
      console.error('❌ OpenAI API key not found');
      return 'I apologize, but the AI service is not properly configured. Please contact support.';
    }

    // Get comprehensive user context from database
    const userContextData = await getUserContext(userId, teamId);
    
    // Search for relevant documents
    const documentContext = await searchDocuments(query, userId);
    const hasDocumentContext = documentContext.length > 0;
    
    const prompt = `You are the PieFi Oracle, an AI assistant helping builders in the PieFi accelerator program. You have access to comprehensive user data and should provide personalized, actionable advice.

## User Context from Database:
${userContextData}

## Additional Context:
${userContext ? JSON.stringify(userContext, null, 2) : 'No additional context available'}

## Query:
${query}

## Context Information:
${context}

${hasDocumentContext ? `\n## Relevant Documents/Data:\n${documentContext}` : ''}

## Instructions:
- Use the user's profile, skills, goals, and recent activity to provide personalized advice
- Reference their specific projects, teams, and progress when relevant
- Provide actionable next steps based on their current situation
- Be encouraging and supportive while being practical
- If they're asking about collaboration, suggest specific people or projects from their context
- If they're asking about learning, tailor resources to their skill level and goals
- Always be specific and reference their actual data when possible

Please provide a helpful, personalized response that leverages their actual PieFi data and context.`;

    console.log('🔄 Making OpenAI API request...');
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
        response.sources = 0;
        response.context_used = true;
        response.confidence = 0.85;
        response.search_strategy = 'ai_chat_with_user_context';
        break;
    }

    response.processing_time = Date.now() - startTime;

    // Log interaction if user provided
    if (requestBody.userId) {
      try {
        await supabase.from('oracle_logs').insert({
          user_id: requestBody.userId,
          team_id: requestBody.teamId,
          query: requestBody.query.substring(0, 500),
          response: response.answer.substring(0, 500),
          query_type: requestBody.type,
          user_role: requestBody.role,
          confidence: response.confidence,
          sources: response.sources,
          processing_time: response.processing_time,
          context_used: response.context_used,
          search_strategy: response.search_strategy,
          model_used: response.model_used
        });
      } catch (logError) {
        console.warn('Failed to log Oracle interaction:', logError);
      }
    }

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