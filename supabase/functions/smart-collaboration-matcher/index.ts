import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl!, supabaseKey!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmartMatcherRequest {
  user_id: string;
  user_profile: any;
  match_types: string[];
  limit: number;
}

interface SmartMatch {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    bio: string;
    skills: string[];
    builder_level: string;
    availability_hours: number;
  };
  match_score: number;
  match_reasons: string[];
  collaboration_type: string;
  success_probability: number;
  complementary_skills: string[];
  shared_interests: string[];
  time_zone_compatibility: number;
  availability_overlap: number;
  previous_success_rate?: number;
  oracle_confidence: number;
}

// Calculate skill complementarity score
function calculateSkillComplementarity(userSkills: string[], targetSkills: string[]): number {
  const userSkillsSet = new Set(userSkills.map(s => s.toLowerCase()));
  const targetSkillsSet = new Set(targetSkills.map(s => s.toLowerCase()));
  
  // Calculate Jaccard similarity for shared skills
  const intersection = new Set([...userSkillsSet].filter(s => targetSkillsSet.has(s)));
  const union = new Set([...userSkillsSet, ...targetSkillsSet]);
  const sharedScore = intersection.size / union.size;
  
  // Calculate complementarity (skills user doesn't have but target has)
  const complementarySkills = [...targetSkillsSet].filter(s => !userSkillsSet.has(s));
  const complementarityScore = Math.min(complementarySkills.length / 5, 1); // Cap at 1
  
  return (sharedScore * 0.3) + (complementarityScore * 0.7);
}

// Calculate availability overlap
function calculateAvailabilityOverlap(userHours: number, targetHours: number): number {
  const minHours = Math.min(userHours, targetHours);
  const maxHours = Math.max(userHours, targetHours);
  return minHours / maxHours;
}

// Calculate time zone compatibility (simplified)
function calculateTimeZoneCompatibility(userId: string, targetId: string): number {
  // In a real implementation, this would use actual time zone data
  // For now, return a random value between 0.7 and 1.0
  return 0.7 + Math.random() * 0.3;
}

// Generate match reasons based on analysis
function generateMatchReasons(
  userProfile: any,
  targetProfile: any,
  skillComplementarity: number,
  availabilityOverlap: number,
  collaborationType: string
): string[] {
  const reasons: string[] = [];
  
  // Skill-based reasons
  if (skillComplementarity > 0.8) {
    reasons.push(`Excellent skill complementarity (${Math.round(skillComplementarity * 100)}%)`);
  } else if (skillComplementarity > 0.6) {
    reasons.push(`Good skill complementarity with learning opportunities`);
  }
  
  // Availability reasons
  if (availabilityOverlap > 0.9) {
    reasons.push(`Perfect availability alignment (${Math.round(availabilityOverlap * 100)}% overlap)`);
  } else if (availabilityOverlap > 0.7) {
    reasons.push(`Good availability overlap for collaboration`);
  }
  
  // Level-based reasons
  if (targetProfile.builder_level === 'expert' && userProfile.builder_level !== 'expert') {
    reasons.push(`Mentorship opportunity: ${targetProfile.name} is an expert in your field`);
  } else if (userProfile.builder_level === 'expert' && targetProfile.builder_level !== 'expert') {
    reasons.push(`You can mentor ${targetProfile.name} in your areas of expertise`);
  }
  
  // Interest-based reasons
  const sharedInterests = userProfile.learning_goals?.filter((goal: string) => 
    targetProfile.learning_goals?.includes(goal)
  ) || [];
  
  if (sharedInterests.length > 0) {
    reasons.push(`Shared learning goals: ${sharedInterests.join(', ')}`);
  }
  
  // Collaboration type specific reasons
  switch (collaborationType) {
    case 'micro':
      reasons.push(`Perfect for quick ${collaborationType} collaboration`);
      break;
    case 'skill_exchange':
      reasons.push(`Ideal skill exchange opportunity based on complementary expertise`);
      break;
    case 'partnership':
      reasons.push(`Strong potential for long-term partnership based on shared vision`);
      break;
    case 'mentorship':
      reasons.push(`Excellent mentorship match based on experience levels and goals`);
      break;
  }
  
  return reasons;
}

// Calculate overall match score
function calculateMatchScore(
  skillComplementarity: number,
  availabilityOverlap: number,
  timeZoneCompatibility: number,
  previousSuccessRate: number = 0.5
): number {
  const weights = {
    skills: 0.4,
    availability: 0.3,
    timezone: 0.2,
    history: 0.1
  };
  
  return (
    skillComplementarity * weights.skills +
    availabilityOverlap * weights.availability +
    timeZoneCompatibility * weights.timezone +
    previousSuccessRate * weights.history
  );
}

// Get potential matches from database
async function getPotentialMatches(userId: string, limit: number): Promise<any[]> {
  try {
    // Get all users except the current user
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', userId)
      .not('builder_level', 'is', null)
      .limit(limit * 2); // Get more than needed for filtering

    if (error) throw error;
    return users || [];
  } catch (error) {
    console.error('Error fetching potential matches:', error);
    return [];
  }
}

// Get previous success rates for collaboration types
async function getSuccessRates(): Promise<Record<string, number>> {
  try {
    const { data: insights, error } = await supabase
      .from('oracle_optimization_insights')
      .select('insights_data')
      .eq('optimization_type', 'collaboration_suggestions')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    
    if (insights && insights.length > 0) {
      return insights[0].insights_data.success_rates || {};
    }
    
    return {};
  } catch (error) {
    console.error('Error fetching success rates:', error);
    return {};
  }
}

// Main matching function
async function generateSmartMatches(request: SmartMatcherRequest): Promise<SmartMatch[]> {
  try {
    console.log('🎯 Generating smart matches for user:', request.user_id);
    
    const potentialMatches = await getPotentialMatches(request.user_id, request.limit * 3);
    const successRates = await getSuccessRates();
    const matches: SmartMatch[] = [];
    
    for (const targetUser of potentialMatches) {
      // Skip if user doesn't have required fields
      if (!targetUser.skills || !targetUser.builder_level) continue;
      
      // Calculate compatibility metrics
      const skillComplementarity = calculateSkillComplementarity(
        request.user_profile?.skills || [],
        targetUser.skills || []
      );
      
      const availabilityOverlap = calculateAvailabilityOverlap(
        request.user_profile?.availability_hours || 10,
        targetUser.availability_hours || 10
      );
      
      const timeZoneCompatibility = calculateTimeZoneCompatibility(
        request.user_id,
        targetUser.id
      );
      
      // Determine best collaboration type
      let bestCollaborationType = 'micro';
      let bestScore = 0;
      
      for (const type of request.match_types) {
        const score = calculateMatchScore(
          skillComplementarity,
          availabilityOverlap,
          timeZoneCompatibility,
          successRates[type] || 0.5
        );
        
        if (score > bestScore) {
          bestScore = score;
          bestCollaborationType = type;
        }
      }
      
      // Only include matches above threshold
      if (bestScore < 0.6) continue;
      
      // Generate match reasons
      const matchReasons = generateMatchReasons(
        request.user_profile,
        targetUser,
        skillComplementarity,
        availabilityOverlap,
        bestCollaborationType
      );
      
      // Find complementary skills
      const userSkills = new Set((request.user_profile?.skills || []).map((s: string) => s.toLowerCase()));
      const complementarySkills = (targetUser.skills || []).filter((skill: string) => 
        !userSkills.has(skill.toLowerCase())
      );
      
      // Find shared interests
      const sharedInterests = (request.user_profile?.learning_goals || []).filter((goal: string) => 
        (targetUser.learning_goals || []).includes(goal)
      );
      
      const match: SmartMatch = {
        id: `match_${targetUser.id}`,
        user: {
          id: targetUser.id,
          name: targetUser.full_name || 'Anonymous Builder',
          avatar: targetUser.avatar_url,
          bio: targetUser.bio || 'Building the future, one project at a time.',
          skills: targetUser.skills || [],
          builder_level: targetUser.builder_level || 'novice',
          availability_hours: targetUser.availability_hours || 10
        },
        match_score: bestScore,
        match_reasons: matchReasons,
        collaboration_type: bestCollaborationType,
        success_probability: Math.min(bestScore * 1.1, 0.95), // Cap at 95%
        complementary_skills: complementarySkills.slice(0, 5),
        shared_interests: sharedInterests.slice(0, 3),
        time_zone_compatibility: timeZoneCompatibility,
        availability_overlap: availabilityOverlap,
        previous_success_rate: successRates[bestCollaborationType] || 0.5,
        oracle_confidence: Math.min(bestScore * 1.05, 0.98) // Cap at 98%
      };
      
      matches.push(match);
    }
    
    // Sort by match score and return top matches
    matches.sort((a, b) => b.match_score - a.match_score);
    
    console.log(`✅ Generated ${matches.length} smart matches`);
    return matches.slice(0, request.limit);
    
  } catch (error) {
    console.error('Error generating smart matches:', error);
    throw error;
  }
}

// Main function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: SmartMatcherRequest = await req.json();
    console.log('🧠 Smart collaboration matcher request:', request);

    // Validate request
    if (!request.user_id) {
      throw new Error('user_id is required');
    }

    // Generate smart matches
    const matches = await generateSmartMatches(request);

    console.log('✅ Smart matching completed successfully');
    return new Response(
      JSON.stringify({ 
        matches,
        total_matches: matches.length,
        generated_at: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Smart matcher error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        matches: [],
        total_matches: 0
      }),
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
