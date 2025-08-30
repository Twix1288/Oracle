// Stage types
export type TeamStage = 'ideation' | 'development' | 'testing' | 'launch' | 'growth';

// Stage information
export interface StageInfo {
  title: string;
  description: string;
  characteristics: string[];
  support_needed: string[];
  frameworks: string[];
  cac_focus: string;
}

// Stage information database
export const stageInformation: Record<TeamStage, StageInfo> = {
  ideation: {
    title: "Ideation & Discovery",
    description: "Define and validate your product concept",
    characteristics: [
      "Problem exploration",
      "Market research",
      "User interviews",
      "Concept validation"
    ],
    support_needed: [
      "Market research guidance",
      "User interview techniques",
      "Problem validation frameworks",
      "Competitive analysis"
    ],
    frameworks: [
      "Problem Validation",
      "Jobs-to-be-Done",
      "Customer Development",
      "Value Proposition Canvas"
    ],
    cac_focus: "Focus on understanding customer acquisition channels and initial market size"
  },
  development: {
    title: "Development & MVP",
    description: "Build your minimum viable product",
    characteristics: [
      "Core feature development",
      "Technical architecture",
      "Initial prototypes",
      "Basic functionality"
    ],
    support_needed: [
      "Technical mentorship",
      "Architecture review",
      "Development best practices",
      "MVP scoping"
    ],
    frameworks: [
      "Lean Startup",
      "Agile Development",
      "User-Centered Design",
      "Technical Architecture"
    ],
    cac_focus: "Plan customer acquisition strategies and set up analytics"
  },
  testing: {
    title: "Testing & Validation",
    description: "Test and refine your product with users",
    characteristics: [
      "User testing",
      "Feature refinement",
      "Performance optimization",
      "Bug fixing"
    ],
    support_needed: [
      "Testing methodologies",
      "User feedback analysis",
      "Performance optimization",
      "Quality assurance"
    ],
    frameworks: [
      "JTBD Strategic Lens",
      "Data-Driven Development",
      "Growth Hacking",
      "A/B Testing"
    ],
    cac_focus: "Test customer acquisition channels and optimize conversion"
  },
  launch: {
    title: "Launch & Go-to-Market",
    description: "Launch your product and acquire users",
    characteristics: [
      "Launch preparation",
      "Marketing strategy",
      "User acquisition",
      "Initial traction"
    ],
    support_needed: [
      "Launch strategy",
      "Marketing guidance",
      "PR and outreach",
      "User acquisition"
    ],
    frameworks: [
      "CAC Strategic Lens",
      "Growth Marketing",
      "Sales Funnel Optimization",
      "Launch Playbook"
    ],
    cac_focus: "Execute customer acquisition strategy and monitor CAC"
  },
  growth: {
    title: "Growth & Scale",
    description: "Scale your product and grow your user base",
    characteristics: [
      "User growth",
      "Feature expansion",
      "Team scaling",
      "Process optimization"
    ],
    support_needed: [
      "Growth strategy",
      "Team scaling",
      "Process optimization",
      "Metrics analysis"
    ],
    frameworks: [
      "Business Model Canvas",
      "OKRs",
      "Venture Capital Readiness",
      "Scale Framework"
    ],
    cac_focus: "Optimize CAC and explore new acquisition channels"
  }
};

// Get contextual content for a stage
export function getContextualContent(stage: TeamStage): string {
  const info = stageInformation[stage];
  if (!info) return '';

  return `Stage: ${info.title}
Description: ${info.description}

Characteristics:
${info.characteristics.map(c => `- ${c}`).join('\n')}

Support Needed:
${info.support_needed.map(s => `- ${s}`).join('\n')}

Frameworks:
${info.frameworks.map(f => `- ${f}`).join('\n')}

CAC Focus:
${info.cac_focus}`;
}

// Get relevant frameworks for a stage and situation
export function getRelevantFrameworks(stage: TeamStage, situation: string): string[] {
  const info = stageInformation[stage];
  if (!info) return [];

  // Start with stage-specific frameworks
  let frameworks = [...info.frameworks];

  // Add situational frameworks
  const situationLower = situation.toLowerCase();
  if (situationLower.includes('customer') || situationLower.includes('user')) {
    frameworks.push('Customer Development', 'User Research');
  }
  if (situationLower.includes('market') || situationLower.includes('competition')) {
    frameworks.push('Market Analysis', 'Competitive Intelligence');
  }
  if (situationLower.includes('technical') || situationLower.includes('architecture')) {
    frameworks.push('Technical Architecture', 'System Design');
  }
  if (situationLower.includes('growth') || situationLower.includes('scale')) {
    frameworks.push('Growth Framework', 'Scaling Playbook');
  }

  // Remove duplicates and return top 3
  return [...new Set(frameworks)].slice(0, 3);
}

// Generate next actions based on stage
export function generateNextActions(stage: TeamStage): string[] {
  const stageActions: Record<TeamStage, string[]> = {
    ideation: [
      "Conduct customer interviews to validate problem",
      "Define target market and personas",
      "Test core assumptions with potential users",
      "Create initial product roadmap"
    ],
    development: [
      "Build core MVP features",
      "Set up development infrastructure",
      "Create user testing plan",
      "Implement basic analytics"
    ],
    testing: [
      "Gather user feedback on MVP",
      "Analyze usage data and metrics",
      "Iterate based on learnings",
      "Prepare for launch"
    ],
    launch: [
      "Execute go-to-market strategy",
      "Optimize customer acquisition channels",
      "Track key launch metrics",
      "Gather initial user feedback"
    ],
    growth: [
      "Scale proven acquisition channels",
      "Optimize unit economics",
      "Build operational systems",
      "Expand team capabilities"
    ]
  };

  return stageActions[stage] || stageActions.ideation;
}
