import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/types/oracle';

export interface JourneyStage {
  id: string;
  stage_name: string;
  title?: string;
  name?: string;
  description: string;
  characteristics?: string[];
  support_needed?: string[];
  frameworks?: string[];
  cac_focus?: string;
  ai_impact?: string;
  stage_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface JourneyRequest {
  query: string;
  role: UserRole;
  teamId?: string;
  userId?: string;
  commandExecuted?: boolean;
  commandType?: string;
  commandResult?: any;
}

export interface JourneyResponse {
  answer: string;
  sources: number;
  context_used: boolean;
  detected_stage?: string;
  suggested_frameworks?: string[];
  next_actions?: string[];
  stage_confidence?: number;
  commandExecuted?: boolean;
  commandType?: string;
  commandResult?: any;
  sections?: {
    update?: string;
    progress?: string;
    event?: string;
  };
}

export const useJourneyService = (selectedRole: UserRole) => {
  const queryClient = useQueryClient();

  // Fetch all journey stages
  const { data: journeyStages, isLoading: stagesLoading } = useQuery({
    queryKey: ['journey_stages'],
    queryFn: async () => {
      try {
        // Return default journey stages since we don't have a journey_stages table
        return [
          { 
            id: '1', 
            stage_name: 'ideation',
            name: 'Ideation', 
            title: 'Ideation',
            description: 'Generate and validate ideas', 
            stage_order: 1, 
            characteristics: [],
            support_needed: [],
            frameworks: []
          },
          { 
            id: '2', 
            stage_name: 'development',
            name: 'Development', 
            title: 'Development',
            description: 'Build your MVP', 
            stage_order: 2,
            characteristics: [],
            support_needed: [],
            frameworks: []
          },
          { 
            id: '3', 
            stage_name: 'testing',
            name: 'Testing', 
            title: 'Testing',
            description: 'Test and refine', 
            stage_order: 3,
            characteristics: [],
            support_needed: [],
            frameworks: []
          },
          { 
            id: '4', 
            stage_name: 'launch',
            name: 'Launch', 
            title: 'Launch',
            description: 'Go to market', 
            stage_order: 4,
            characteristics: [],
            support_needed: [],
            frameworks: []
          },
          { 
            id: '5', 
            stage_name: 'growth',
            name: 'Growth', 
            title: 'Growth',
            description: 'Scale your business', 
            stage_order: 5,
            characteristics: [],
            support_needed: [],
            frameworks: []
          }
        ] as JourneyStage[];
      } catch (error) {
        console.error('Error fetching journey stages:', error);
        return [];
      }
    },
  });

  // Get stage by name
  const getStage = (stageName: string) => {
    return journeyStages?.find(stage => stage.stage_name === stageName);
  };

  // Get all stages
  const getAllStages = () => {
    return journeyStages || [];
  };

  // Get relevant frameworks based on stage and situation
  const getRelevantFrameworks = (stageId: string, situation: string): string[] => {
    const stage = getStage(stageId);
    if (!stage) return [];

    let frameworks = stage.frameworks || [];
    const situationKeywords = situation.toLowerCase();

    // Add situational frameworks
    if (situationKeywords.includes('customer') || situationKeywords.includes('user')) {
      frameworks = [...frameworks, 'Customer Development', 'User Research'];
    }
    if (situationKeywords.includes('market') || situationKeywords.includes('competition')) {
      frameworks = [...frameworks, 'Market Analysis', 'Competitive Intelligence'];
    }

    return [...new Set(frameworks)].slice(0, 3); // Remove duplicates and return top 3
  };

  // Analyze user stage based on team data and query
  const analyzeUserStage = (teamUpdates: any[], teamInfo: any, query: string) => {
    const keywords = {
      ideation: ['idea', 'validate', 'problem', 'market', 'customer', 'research', 'hypothesis'],
      development: ['build', 'code', 'feature', 'mvp', 'prototype', 'develop', 'implement'],
      testing: ['test', 'feedback', 'user', 'iterate', 'data', 'analytics', 'pivot'],
      launch: ['launch', 'marketing', 'customer', 'acquire', 'sales', 'campaign'],
      growth: ['scale', 'growth', 'optimize', 'metrics', 'revenue', 'team'],
      expansion: ['expand', 'market', 'partnership', 'investment', 'new']
    };

    let scores: Record<string, number> = { 
      ideation: 0, development: 0, testing: 0, 
      launch: 0, growth: 0, expansion: 0 
    };
    
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

  // Enhanced Oracle query mutation
  const journeyQueryMutation = useMutation({
    mutationFn: async (request: JourneyRequest) => {
              const { data, error } = await supabase.functions.invoke('super-oracle', {
        body: request
      });
      if (error) throw error;
      return data as JourneyResponse;
    },
  });

  // Generate next actions based on stage
  const generateNextActions = (stage: string, query: string, teamInfo: any): string[] => {
    const actionMap: Record<string, string[]> = {
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

  return {
    // Data
    journeyStages,
    isLoading: stagesLoading,
    
    // Functions
    getStage,
    getAllStages,
    getRelevantFrameworks,
    analyzeUserStage,
    generateNextActions,
    
    // Mutations
    queryJourney: journeyQueryMutation.mutate,
    journeyResponse: journeyQueryMutation.data,
    journeyLoading: journeyQueryMutation.isPending,
    journeyError: journeyQueryMutation.error,
  };
};