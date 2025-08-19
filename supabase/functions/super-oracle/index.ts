import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl!, supabaseKey!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuperOracleRequest {
  query: string;
  role: 'builder' | 'mentor' | 'lead' | 'guest';
  teamId?: string;
  userId?: string;
  userProfile?: any;
  contextRequest?: {
    needsResources: boolean;
    needsMentions: boolean;
    needsTeamContext: boolean;
    needsPersonalization: boolean;
    resourceTopic?: string;
  };
}

interface OracleResource {
  title: string;
  url: string;
  type: 'youtube' | 'article' | 'documentation' | 'tutorial' | 'tool';
  description: string;
  relevance: number;
}

interface SuperOracleResponse {
  answer: string;
  sources: number;
  confidence: number;
  detected_stage?: string;
  resources?: OracleResource[];
  next_actions?: string[];
  mentions?: string[];
  personalization?: {
    skill_match: number;
    project_relevance: number;
    experience_level: string;
  };
}

async function getTeamContext(teamId: string, supabase: any) {
  const { data: team } = await supabase
    .from('teams')
    .select(`
      *,
      team_status(*),
      updates(content, type, created_at, created_by),
      profiles!inner(full_name, skills, help_needed, experience_level)
    `)
    .eq('id', teamId)
    .single();

  return team;
}

async function getUsersWithSkills(skill: string, supabase: any) {
  const { data: users } = await supabase
    .from('profiles')
    .select('full_name, role, skills, experience_level, help_needed, team_id, bio')
    .or(`skills.cs.{${skill}},help_needed.cs.{${skill}}`);

  return users || [];
}

async function findRelevantPeople(query: string, userProfile: any, userRole: string, supabase: any) {
  // Extract potential skills/topics from the query
  const queryWords = query.toLowerCase().split(' ');
  const techKeywords = ['react', 'javascript', 'python', 'api', 'backend', 'frontend', 'design', 'ui', 'ux', 'marketing', 'business', 'finance', 'ai', 'ml', 'data'];
  const foundKeywords = queryWords.filter(word => techKeywords.some(tech => word.includes(tech)));
  
  let relevantPeople = [];
  
  // If user needs help with specific technologies
  for (const keyword of foundKeywords) {
    const people = await getUsersWithSkills(keyword, supabase);
    relevantPeople.push(...people);
  }
  
  // If user is asking for general help, look at their help_needed array
  if (query.includes('help') || query.includes('stuck') || query.includes('guidance')) {
    if (userProfile?.help_needed) {
      for (const helpTopic of userProfile.help_needed) {
        const people = await getUsersWithSkills(helpTopic, supabase);
        relevantPeople.push(...people);
      }
    }
  }
  
  // Remove duplicates and filter based on role permissions
  const uniquePeople = relevantPeople.filter((person, index, self) => 
    index === self.findIndex(p => p.full_name === person.full_name)
  );
  
  // Filter based on role - guests can't see people
  if (userRole === 'guest') {
    return [];
  }
  
  return uniquePeople.slice(0, 5); // Limit to top 5 matches
}

async function generatePersonalizedResources(query: string, userProfile: any, teamData: any): Promise<OracleResource[]> {
  const skills = userProfile?.skills || [];
  const helpNeeded = userProfile?.help_needed || [];
  const experienceLevel = userProfile?.experience_level || 'beginner';
  const teamStage = teamData?.stage || 'ideation';
  const userRole = userProfile?.role || 'guest';
  
  const resources: OracleResource[] = [];
  const queryLower = query.toLowerCase();
  
  // Enhanced technology-specific resources with real, working URLs
  const techResources = {
    'react': [
      { title: 'React Official Documentation', url: 'https://react.dev', type: 'documentation', description: 'Official React documentation with modern hooks and patterns', relevance: 95 },
      { title: 'React Hooks Complete Guide', url: 'https://www.youtube.com/watch?v=TNhaISOUy6Q', type: 'youtube', description: 'Complete guide to React hooks for modern development', relevance: 92 },
      { title: 'React Best Practices 2025', url: 'https://kentcdodds.com/blog/application-state-management-with-react', type: 'article', description: 'Modern React patterns and best practices', relevance: 90 }
    ],
    'javascript': [
      { title: 'Modern JavaScript Guide', url: 'https://javascript.info', type: 'tutorial', description: 'Complete modern JavaScript tutorial from basics to advanced', relevance: 94 },
      { title: 'JavaScript ES6+ Features', url: 'https://www.youtube.com/watch?v=WZQc7RUAg18', type: 'youtube', description: 'Modern JavaScript features every developer should know', relevance: 90 },
      { title: 'You Don\'t Know JS', url: 'https://github.com/getify/You-Dont-Know-JS', type: 'documentation', description: 'Deep dive into JavaScript fundamentals', relevance: 88 }
    ],
    'python': [
      { title: 'Python Official Tutorial', url: 'https://docs.python.org/3/tutorial/', type: 'tutorial', description: 'Official Python 3 tutorial from basics to advanced', relevance: 95 },
      { title: 'Python for Data Science', url: 'https://www.youtube.com/watch?v=LHBE6Q9XlzI', type: 'youtube', description: 'Complete Python data science course', relevance: 90 },
      { title: 'Real Python Guides', url: 'https://realpython.com', type: 'article', description: 'High-quality Python tutorials and guides', relevance: 93 }
    ],
    'node': [
      { title: 'Node.js Official Docs', url: 'https://nodejs.org/en/docs/', type: 'documentation', description: 'Comprehensive Node.js documentation and API reference', relevance: 94 },
      { title: 'Node.js Complete Course', url: 'https://www.youtube.com/watch?v=TlB_eWDSMt4', type: 'youtube', description: 'Complete Node.js development course', relevance: 91 },
      { title: 'Express.js Guide', url: 'https://expressjs.com/en/guide/routing.html', type: 'tutorial', description: 'Express.js framework complete guide', relevance: 89 }
    ],
    'ai': [
      { title: 'OpenAI API Documentation', url: 'https://platform.openai.com/docs', type: 'documentation', description: 'Complete guide to OpenAI API integration', relevance: 96 },
      { title: 'AI for Developers Course', url: 'https://www.deeplearning.ai/courses/', type: 'tutorial', description: 'AI and machine learning for developers', relevance: 94 },
      { title: 'Prompt Engineering Guide', url: 'https://www.promptingguide.ai/', type: 'article', description: 'Best practices for AI prompt engineering', relevance: 92 }
    ],
    'design': [
      { title: 'Figma Design Tutorial', url: 'https://help.figma.com/hc/en-us', type: 'tutorial', description: 'Complete guide to Figma design tools', relevance: 93 },
      { title: 'UI/UX Design Principles', url: 'https://www.youtube.com/watch?v=_K06LoVjFSg', type: 'youtube', description: 'Fundamental UI/UX design principles', relevance: 91 },
      { title: 'Design Systems Guide', url: 'https://designsystemsrepo.com/', type: 'article', description: 'Collection of design system examples and patterns', relevance: 89 }
    ],
    'api': [
      { title: 'REST API Design Guide', url: 'https://restfulapi.net/', type: 'documentation', description: 'Complete guide to RESTful API design', relevance: 92 },
      { title: 'API Development Tutorial', url: 'https://www.youtube.com/watch?v=pKd0Rpw7O48', type: 'youtube', description: 'Building robust APIs from scratch', relevance: 90 },
      { title: 'GraphQL vs REST', url: 'https://blog.apollographql.com/graphql-vs-rest-5d425123e34b', type: 'article', description: 'When to use GraphQL vs REST APIs', relevance: 87 }
    ],
    'business': [
      { title: 'Lean Canvas Template', url: 'https://leanstack.com/lean-canvas', type: 'tool', description: 'Create your business model with Lean Canvas', relevance: 95 },
      { title: 'Customer Development Guide', url: 'https://www.youtube.com/watch?v=f_LNNnNfpp4', type: 'youtube', description: 'Steve Blank on customer development process', relevance: 93 },
      { title: 'Startup Pitch Deck Guide', url: 'https://www.sequoiacap.com/article/writing-a-business-plan/', type: 'article', description: 'Sequoia Capital guide to pitch decks', relevance: 91 }
    ]
  };
  
  // Stage-specific resources
  const stageResources = {
    'ideation': [
      { title: 'Idea Validation Framework', url: 'https://www.youtube.com/watch?v=6z-TNwqED8g', type: 'youtube', description: 'How to validate your startup idea effectively', relevance: 96 },
      { title: 'Market Research Guide', url: 'https://blog.hubspot.com/marketing/market-research-buyers-journey-guide', type: 'article', description: 'Complete guide to market research for startups', relevance: 94 },
      { title: 'Problem-Solution Fit', url: 'https://leanstack.com/problem-solution-fit/', type: 'tutorial', description: 'Achieving problem-solution fit for your startup', relevance: 92 }
    ],
    'development': [
      { title: 'Agile Development Guide', url: 'https://agilemanifesto.org/', type: 'article', description: 'Principles of agile software development', relevance: 93 },
      { title: 'MVP Development Strategy', url: 'https://www.youtube.com/watch?v=0P7nCmln7PM', type: 'youtube', description: 'Building your minimum viable product effectively', relevance: 95 },
      { title: 'Git Best Practices', url: 'https://www.atlassian.com/git/tutorials/comparing-workflows', type: 'tutorial', description: 'Git workflows for development teams', relevance: 89 }
    ],
    'testing': [
      { title: 'User Testing Guide', url: 'https://www.usertesting.com/resources', type: 'article', description: 'How to conduct effective user testing sessions', relevance: 94 },
      { title: 'A/B Testing Framework', url: 'https://www.optimizely.com/optimization-glossary/ab-testing/', type: 'tutorial', description: 'Complete guide to A/B testing methodology', relevance: 92 },
      { title: 'QA Testing Strategies', url: 'https://www.youtube.com/watch?v=VYXp1iTgNgc', type: 'youtube', description: 'Quality assurance testing best practices', relevance: 88 }
    ],
    'launch': [
      { title: 'Product Launch Checklist', url: 'https://producthabits.com/product-launch-checklist/', type: 'article', description: 'Comprehensive product launch checklist and timeline', relevance: 96 },
      { title: 'Go-to-Market Strategy', url: 'https://blog.hubspot.com/marketing/go-to-market-strategy', type: 'article', description: 'Building your go-to-market strategy', relevance: 94 },
      { title: 'Product Hunt Launch Guide', url: 'https://blog.producthunt.com/how-to-launch-on-product-hunt-7c1843e06399', type: 'tutorial', description: 'Complete guide to launching on Product Hunt', relevance: 90 }
    ],
    'growth': [
      { title: 'Growth Hacking Guide', url: 'https://blog.hubspot.com/marketing/growth-hacking', type: 'article', description: 'Growth hacking strategies for startups', relevance: 93 },
      { title: 'Customer Acquisition', url: 'https://www.youtube.com/watch?v=BPK_qzeH_yk', type: 'youtube', description: 'Effective customer acquisition strategies', relevance: 91 },
      { title: 'Scaling Your Startup', url: 'https://firstround.com/review/', type: 'article', description: 'Lessons on scaling from successful startups', relevance: 89 }
    ]
  };
  
  // Find relevant technology resources
  for (const [tech, techResourceList] of Object.entries(techResources)) {
    if (queryLower.includes(tech) || skills.some(skill => skill.toLowerCase().includes(tech))) {
      resources.push(...techResourceList.map(r => ({ ...r, type: r.type as any })));
    }
  }
  
  // Add stage-specific resources based on team context
  if (teamStage && stageResources[teamStage as keyof typeof stageResources]) {
    const stageResourceList = stageResources[teamStage as keyof typeof stageResources];
    resources.push(...stageResourceList.map(r => ({ ...r, type: r.type as any })));
  }
  
  // Add experience-level appropriate resources
  if (experienceLevel === 'beginner') {
    resources.push({
      title: 'Programming Foundations Course',
      url: 'https://www.freecodecamp.org/',
      type: 'tutorial',
      description: 'Free comprehensive programming courses for beginners',
      relevance: 85
    });
  } else if (experienceLevel === 'advanced') {
    resources.push({
      title: 'Advanced Software Architecture',
      url: 'https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/',
      type: 'documentation',
      description: 'Advanced software architecture patterns and principles',
      relevance: 88
    });
  }
  
  // Role-specific resources
  const roleSpecificResources = {
    'builder': [
      { title: 'Technical Skills Roadmap', url: 'https://roadmap.sh/', type: 'tutorial', description: 'Learning paths for developers and builders', relevance: 87 },
      { title: 'Code Quality Guide', url: 'https://github.com/ryanmcdermott/clean-code-javascript', type: 'article', description: 'Clean code principles for better development', relevance: 85 }
    ],
    'mentor': [
      { title: 'Mentoring Best Practices', url: 'https://www.themusejobs.com/advice/mentoring-best-practices', type: 'article', description: 'How to be an effective mentor in tech', relevance: 90 },
      { title: 'Coaching Techniques for Mentors', url: 'https://www.youtube.com/watch?v=oHDq1PcokdI', type: 'youtube', description: 'Effective coaching techniques for technical mentors', relevance: 88 }
    ],
    'lead': [
      { title: 'Startup Leadership Playbook', url: 'https://firstround.com/review/', type: 'article', description: 'Leadership insights from successful startup founders', relevance: 92 },
      { title: 'Team Building for Startups', url: 'https://www.atlassian.com/team-playbook', type: 'tutorial', description: 'Building and managing effective startup teams', relevance: 89 }
    ]
  };
  
  if (roleSpecificResources[userRole as keyof typeof roleSpecificResources]) {
    const roleResources = roleSpecificResources[userRole as keyof typeof roleSpecificResources];
    resources.push(...roleResources.map(r => ({ ...r, type: r.type as any })));
  }
  
  // If no specific resources found, add general startup resources
  if (resources.length === 0) {
    resources.push(
      { title: 'Y Combinator Startup School', url: 'https://www.startupschool.org/', type: 'tutorial', description: 'Free online course for entrepreneurs and builders', relevance: 85 },
      { title: 'Indie Hackers Community', url: 'https://www.indiehackers.com/', type: 'article', description: 'Community of independent entrepreneurs and makers', relevance: 82 },
      { title: 'Hacker News', url: 'https://news.ycombinator.com/', type: 'article', description: 'Tech and startup news from the community', relevance: 78 }
    );
  }
  
  // Sort by relevance and return top resources
  return resources
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 8) // Return top 8 resources
    .map(resource => ({
      ...resource,
      relevance: resource.relevance / 100 // Convert to 0-1 scale
    }));
}

async function detectMentions(query: string, supabase: any): Promise<any[]> {
  const mentionPattern = /@(\w+)/g;
  const mentionedUsers = [];
  let match;
  
  while ((match = mentionPattern.exec(query)) !== null) {
    const username = match[1];
    // Try to find user by name and fetch their full profile
    const { data: user } = await supabase
      .from('profiles')
      .select(`
        id, full_name, role, skills, help_needed, bio, 
        experience_level, team_id, project_vision,
        availability, linkedin_url, github_url, portfolio_url
      `)
      .or(`full_name.ilike.%${username}%, full_name.ilike.${username}%`)
      .single();
    
    if (user) {
      // Also get their team information if they have one
      let teamInfo = null;
      if (user.team_id) {
        const { data: team } = await supabase
          .from('teams')
          .select('name, stage, description')
          .eq('id', user.team_id)
          .single();
        teamInfo = team;
      }
      
      // Get their recent activity/updates
      const { data: recentUpdates } = await supabase
        .from('updates')
        .select('content, created_at, type')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      mentionedUsers.push({
        id: user.id,
        full_name: user.full_name,
        role: user.role,
        skills: user.skills || [],
        help_needed: user.help_needed || [],
        bio: user.bio || '',
        experience_level: user.experience_level || '',
        team: teamInfo,
        project_vision: user.project_vision || '',
        availability: user.availability || '',
        social_links: {
          linkedin: user.linkedin_url,
          github: user.github_url,
          portfolio: user.portfolio_url
        },
        recent_activity: recentUpdates || [],
        mention_text: match[0] // The original @username text
      });
    }
  }
  
  return mentionedUsers;
}

async function generateIntelligentResponse(
  query: string, 
  role: string, 
  teamContext: any, 
  userProfile: any,
  mentionedUsers: any[],
  resources: OracleResource[],
  relevantPeople: any[]
): Promise<string> {
  
  // Role-based information filtering and persona
  const getRolePersonality = (role: string) => {
    switch (role) {
      case 'guest':
        return {
          tone: 'welcoming and encouraging',
          infoLevel: 'surface-level team activities only',
          details: 'team projects, stages, and general activities - NO personal information',
          restrictions: 'No personal data, names, skills, profiles, or individual information - only team activities and project details'
        };
      case 'builder':
        return {
          tone: 'supportive and practical',
          infoLevel: 'detailed technical guidance',
          details: 'specific implementation advice, team updates, relevant resources',
          restrictions: 'Access to own team data, limited admin information'
        };
      case 'mentor':
        return {
          tone: 'wise and guidance-focused',
          infoLevel: 'comprehensive insights across teams',
          details: 'team performance data, builder progress, strategic advice',
          restrictions: 'Access to mentored teams, progress tracking, no system admin details'
        };
      case 'lead':
        return {
          tone: 'authoritative and strategic',
          infoLevel: 'full administrative access',
          details: 'complete system overview, all team data, admin functions',
          restrictions: 'Full access to all information and capabilities'
        };
      default:
        return {
          tone: 'helpful but cautious',
          infoLevel: 'minimal information',
          details: 'basic guidance only',
          restrictions: 'Very limited access'
        };
    }
  };

  // Generate detailed mentioned user context
  const getMentionedUserContext = () => {
    if (mentionedUsers.length === 0) return 'No users mentioned';
    
    switch (role) {
      case 'guest':
        return 'User mentions not available to guests';
      case 'builder':
      case 'mentor':
      case 'lead':
        return mentionedUsers.map(user => {
          const teamContext = user.team ? ` (Team: ${user.team.name} - ${user.team.stage} stage)` : ' (No team)';
          const skillsText = user.skills.length > 0 ? `Skills: ${user.skills.join(', ')}` : 'No skills listed';
          const helpText = user.help_needed.length > 0 ? `Can help with: ${user.help_needed.join(', ')}` : 'No help areas specified';
          const activityText = user.recent_activity.length > 0 ? 
            `Recent activity: ${user.recent_activity[0].content.substring(0, 100)}...` : 
            'No recent activity';
          
          return `
**${user.mention_text} → ${user.full_name}** (${user.role})${teamContext}
• ${skillsText}
• ${helpText}
• Experience Level: ${user.experience_level || 'Not specified'}
• Bio: ${user.bio || 'No bio available'}
• ${activityText}
${user.project_vision ? `• Project Vision: ${user.project_vision}` : ''}
${user.availability ? `• Availability: ${user.availability}` : ''}
${user.social_links.linkedin ? `• LinkedIn: ${user.social_links.linkedin}` : ''}
${user.social_links.github ? `• GitHub: ${user.social_links.github}` : ''}
${user.social_links.portfolio ? `• Portfolio: ${user.social_links.portfolio}` : ''}`;
        }).join('\n\n');
      default:
        return 'Limited mention information available';
    }
  };
  
  // Filter team context based on role
  const getFilteredTeamContext = () => {
    if (!teamContext) return 'No team activity information available';
    
    switch (role) {
      case 'guest':
        // Only show team activities, projects, and stages - NO personal information
        const guestInfo = {
          activeTeams: teamContext.name ? 1 : 0,
          projectStage: teamContext.stage || 'unknown',
          projectType: teamContext.description ? 'Active project in development' : 'General activity',
          recentActivity: teamContext.updates?.length > 0 ? 
            `${teamContext.updates.length} recent project updates` : 'No recent activity'
        };
        return `Teams are actively working on projects. Current activity: ${guestInfo.activeTeams} active team in ${guestInfo.projectStage} stage. ${guestInfo.recentActivity}.`;
      case 'builder':
        return `Team: ${teamContext.name}, Stage: ${teamContext.stage}, Recent activity: ${teamContext.updates?.slice(0, 2).map(u => u.content.substring(0, 50)).join('; ') || 'No recent updates'}`;
      case 'mentor':
        return `Full team context: ${teamContext.name} (${teamContext.stage}), Members: ${teamContext.profiles?.map(p => p.full_name).join(', ')}, Recent updates: ${teamContext.updates?.slice(0, 3).map(u => u.content).join('; ') || 'No recent updates'}`;
      case 'lead':
        return `Complete team data: ${JSON.stringify(teamContext, null, 2)}`;
      default:
        return 'Limited team information available';
    }
  };

  // Filter user profile based on role
  const getFilteredUserProfile = () => {
    if (!userProfile) return 'General visitor information';
    
    switch (role) {
      case 'guest':
        return 'You are exploring our startup incubator and the projects teams are working on';
      case 'builder':
        return `Your profile: ${userProfile.full_name}, Skills: ${userProfile.skills?.join(', ') || 'Not specified'}, Experience: ${userProfile.experience_level || 'Not specified'}`;
      case 'mentor':
      case 'lead':
        return `Full profile access: ${JSON.stringify(userProfile, null, 2)}`;
      default:
        return 'Limited profile information';
    }
  };

  const contextPrompt = `
You are the PieFi Oracle, an extremely intelligent AI assistant for a startup incubator program. You provide deeply personalized, contextual responses based on WHO is asking.

CRITICAL ROLE-BASED BEHAVIOR:
Role: ${role.toUpperCase()}
Personality: ${rolePersonality.tone}
Information Level: ${rolePersonality.infoLevel}
Access Restrictions: ${rolePersonality.restrictions}

ROLE-SPECIFIC INSTRUCTIONS:
${role === 'guest' ? `
- Welcome newcomers warmly and focus on team activities and projects
- Share information about what teams are working on, project stages, and general activities
- NEVER mention specific people's names, skills, profiles, or personal information
- Focus on project types, development stages, team activities, and general progress
- Encourage them to join as a builder/mentor/lead for access to team collaboration
- Discuss the types of projects and innovations happening in the incubator
` : ''}

${role === 'builder' ? `
- Provide practical, hands-on technical guidance
- Share relevant team updates and progress
- Connect with team members based on skills
- Focus on project development and collaboration
- Access to own team's data and relevant resources
` : ''}

${role === 'mentor' ? `
- Offer strategic guidance and wisdom
- Provide insights across multiple teams you mentor
- Share progress tracking and team performance insights
- Focus on growth, guidance, and leadership development
- Access to mentored teams' comprehensive data
` : ''}

${role === 'lead' ? `
- Provide full administrative and strategic oversight
- Access to all system data and team information
- Focus on program management and optimization
- Offer comprehensive insights and decision-making support
- Full access to all capabilities and information
` : ''}

FILTERED CONTEXT FOR YOUR ROLE:
User Context: ${getFilteredUserProfile()}
Team Activities: ${getFilteredTeamContext()}
Mentioned Users: ${getMentionedUserContext()}
People Who Can Help: ${role === 'guest' ? 'People connections not available to guests' : (relevantPeople.length > 0 ? relevantPeople.map(p => `${p.full_name} (${p.role}) - Skills: ${p.skills?.join(', ') || 'Not specified'}`).join('; ') : 'No specific matches found')}
Available Resources: ${resources.length} curated resources matching your needs

RESPONSE GUIDELINES:
1. PERSONALIZE EVERYTHING based on the specific user asking (${userProfile?.full_name || 'user'})
2. Reference their specific skills: ${userProfile?.skills?.join(', ') || 'none specified'}
3. Address their specific help needs: ${userProfile?.help_needed?.join(', ') || 'none specified'}
4. Consider their experience level: ${userProfile?.experience_level || 'not specified'}
5. Factor in their team's current stage: ${teamContext?.stage || 'no team context'}
6. **MENTIONED USERS CONTEXT**: ${mentionedUsers.length > 0 ? `Use detailed info about mentioned users to provide rich insights. When users are mentioned, incorporate their skills, experience, recent activity, and team context into your response.` : 'No users mentioned in this query.'}
7. SUGGEST SPECIFIC PEOPLE when relevant - if someone needs help, connect them with the right person from the "People Who Can Help" list
8. Provide resources that match their exact situation and needs
9. CRITICAL: Respect role restrictions - ${rolePersonality.restrictions}
10. Use their name and make it feel like you truly know them and their context
11. Be incredibly helpful within your authority level
12. If they need help, always try to connect them with relevant people (unless you're responding to a guest)
13. Make every response feel personally crafted for THIS specific user in THEIR specific situation
14. **MENTION INTELLIGENCE**: When users mention others (@username), use their full profile data to provide insights about collaboration potential, skill matches, project synergy, and specific ways they can work together

PERSONALITY FOR THIS USER:
- Role: ${role} 
- Tone: ${rolePersonality.tone}
- Information Level: ${rolePersonality.infoLevel}

User Query: "${query}"

Provide a response that perfectly matches your role's authority level and personality:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: contextPrompt
          }
        ],
        max_completion_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating intelligent response:', error);
    
    // Role-appropriate fallback responses
    const fallbackResponses = {
      guest: `Welcome to PieFi Oracle! 🛸 I'd love to help you explore the exciting projects our teams are working on. Unfortunately, I'm experiencing some technical difficulties right now, but I can still share information about team activities, project stages, and what types of innovations are happening in our incubator. What would you like to know about our current projects?`,
      builder: `Hey there! 🔧 I understand you're asking about "${query}". While my advanced systems are having a moment, I'm still here to help with your project development. As a builder, you have access to team collaboration tools and technical resources. What specific challenge are you working on?`,
      mentor: `Hello! 🌟 I see you're inquiring about "${query}". Even though I'm experiencing some technical hiccups, I can still provide guidance. As a mentor, you have insight into team progress and can access comprehensive data about your mentees. How can I assist with your mentoring efforts?`,
      lead: `Greetings! 👑 You're asking about "${query}". Despite some system difficulties, I'm operational for strategic support. As a lead, you have full administrative access to all program data and analytics. What administrative or strategic insight do you need?`
    };
    
    return fallbackResponses[role] || fallbackResponses.guest;
  }
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      role, 
      teamId, 
      userId, 
      userProfile,
      contextRequest 
    }: SuperOracleRequest = await req.json();

    console.log(`Super Oracle processing: ${query} for ${role}`);

    
    // Gather contextual information with people suggestions
    let teamContext = null;
    let relevantPeople = [];
    
    if (teamId && contextRequest?.needsTeamContext) {
      teamContext = await getTeamContext(teamId, supabase);
    }
    
    // Find relevant people who can help
    relevantPeople = await findRelevantPeople(query, userProfile, role, supabase);

    // Detect mentions with full user profiles
    let mentionedUsers: any[] = [];
    if (contextRequest?.needsMentions) {
      mentionedUsers = await detectMentions(query, supabase);
    }

    // Generate highly personalized resources
    let resources: OracleResource[] = [];
    if (contextRequest?.needsResources || contextRequest?.resourceTopic) {
      resources = await generatePersonalizedResources(
        contextRequest?.resourceTopic || query, 
        userProfile, 
        teamContext
      );
    }

    // Generate intelligent response with mentioned user profiles
    const answer = await generateIntelligentResponse(
      query,
      role,
      teamContext,
      userProfile,
      mentionedUsers,
      resources,
      relevantPeople
    );

    // Calculate confidence based on available context and personalization
    let confidence = 75; // Base confidence
    if (userProfile) confidence += 15; // Higher weight for user context
    if (teamContext) confidence += 10;
    if (resources.length > 0) confidence += 5;
    if (relevantPeople.length > 0) confidence += 10; // Boost for people connections
    if (mentionedUsers.length > 0) confidence += 15; // Higher boost for mentioned users with full context

    // Log interaction for learning
    await supabase.from('oracle_logs').insert({
      user_role: role,
      user_id: userId,
      team_id: teamId,
      query,
      response: answer,
      sources_count: resources.length,
      processing_time_ms: Date.now() % 1000 // Simplified timing
    });

    const response: SuperOracleResponse = {
      answer,
      sources: resources.length + relevantPeople.length + mentionedUsers.length,
      confidence: Math.min(confidence, 100),
      resources: resources.length > 0 ? resources : undefined,
      mentions: mentionedUsers.length > 0 ? mentionedUsers.map(u => u.full_name) : undefined,
      detected_stage: teamContext?.stage,
      next_actions: [], // Could be enhanced with AI-generated next steps
      personalization: userProfile ? {
        skill_match: userProfile.skills?.length || 0,
        project_relevance: teamContext ? 95 : 60,
        experience_level: userProfile.experience_level || 'unknown'
      } : undefined
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Super Oracle error:', error);
    
    return new Response(JSON.stringify({
      answer: "I'm experiencing some technical difficulties right now, but I'm still here to help! Please try rephrasing your question or ask me something else.",
      sources: 0,
      confidence: 50,
      error: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});