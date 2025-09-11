import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LearningLoopRequest {
  oracle_log_id: string;
  feedback_data: any;
  action: 'analyze_feedback' | 'update_models' | 'generate_insights' | 'optimize_suggestions';
}

interface LearningInsights {
  pattern_analysis: any;
  improvement_areas: string[];
  success_factors: string[];
  model_performance: any;
  user_satisfaction_trends: any;
}

// Analyze feedback patterns and generate insights
async function analyzeFeedbackPatterns(): Promise<LearningInsights> {
  try {
    console.log('🔍 Analyzing feedback patterns...');
    
    // Get recent feedback data
    const { data: recentFeedback, error: feedbackError } = await supabase
      .from('oracle_feedback')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (feedbackError) throw feedbackError;

    if (!recentFeedback || recentFeedback.length === 0) {
      return {
        pattern_analysis: {},
        improvement_areas: [],
        success_factors: [],
        model_performance: {},
        user_satisfaction_trends: {}
      };
    }

    // Analyze satisfaction trends
    const satisfactionScores = recentFeedback.map(f => f.satisfaction_score);
    const avgSatisfaction = satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length;
    
    // Analyze model performance
    const modelPerformance = recentFeedback.reduce((acc, feedback) => {
      const model = feedback.model_used || 'unknown';
      if (!acc[model]) {
        acc[model] = { total: 0, satisfaction: 0, helpful: 0 };
      }
      acc[model].total += 1;
      acc[model].satisfaction += feedback.satisfaction_score;
      acc[model].helpful += feedback.helpful ? 1 : 0;
      return acc;
    }, {} as any);

    // Calculate model averages
    Object.keys(modelPerformance).forEach(model => {
      const perf = modelPerformance[model];
      perf.avg_satisfaction = perf.satisfaction / perf.total;
      perf.helpful_rate = perf.helpful / perf.total;
    });

    // Identify improvement areas
    const lowSatisfactionFeedback = recentFeedback.filter(f => f.satisfaction_score <= 2);
    const improvementAreas = [];
    
    if (lowSatisfactionFeedback.length > 0) {
      const qualityIssues = lowSatisfactionFeedback.filter(f => f.response_quality === 'poor').length;
      const accuracyIssues = lowSatisfactionFeedback.filter(f => f.accuracy === 'inaccurate').length;
      const relevanceIssues = lowSatisfactionFeedback.filter(f => f.relevance === 'irrelevant').length;
      
      if (qualityIssues > lowSatisfactionFeedback.length * 0.3) {
        improvementAreas.push('response_quality');
      }
      if (accuracyIssues > lowSatisfactionFeedback.length * 0.3) {
        improvementAreas.push('accuracy');
      }
      if (relevanceIssues > lowSatisfactionFeedback.length * 0.3) {
        improvementAreas.push('relevance');
      }
    }

    // Identify success factors
    const highSatisfactionFeedback = recentFeedback.filter(f => f.satisfaction_score >= 4);
    const successFactors = [];
    
    if (highSatisfactionFeedback.length > 0) {
      const highQuality = highSatisfactionFeedback.filter(f => f.response_quality === 'excellent').length;
      const highAccuracy = highSatisfactionFeedback.filter(f => f.accuracy === 'very_accurate').length;
      const highRelevance = highSatisfactionFeedback.filter(f => f.relevance === 'very_relevant').length;
      
      if (highQuality > highSatisfactionFeedback.length * 0.7) {
        successFactors.push('high_response_quality');
      }
      if (highAccuracy > highSatisfactionFeedback.length * 0.7) {
        successFactors.push('high_accuracy');
      }
      if (highRelevance > highSatisfactionFeedback.length * 0.7) {
        successFactors.push('high_relevance');
      }
    }

    // Analyze query types and satisfaction
    const queryTypeAnalysis = recentFeedback.reduce((acc, feedback) => {
      const queryType = feedback.query_text?.toLowerCase() || '';
      let category = 'general';
      
      if (queryType.includes('collaboration') || queryType.includes('connect')) {
        category = 'collaboration';
      } else if (queryType.includes('project') || queryType.includes('build')) {
        category = 'project_management';
      } else if (queryType.includes('learn') || queryType.includes('skill')) {
        category = 'learning';
      } else if (queryType.includes('resource') || queryType.includes('help')) {
        category = 'resources';
      }
      
      if (!acc[category]) {
        acc[category] = { total: 0, satisfaction: 0, helpful: 0 };
      }
      acc[category].total += 1;
      acc[category].satisfaction += feedback.satisfaction_score;
      acc[category].helpful += feedback.helpful ? 1 : 0;
      
      return acc;
    }, {} as any);

    // Calculate category averages
    Object.keys(queryTypeAnalysis).forEach(category => {
      const analysis = queryTypeAnalysis[category];
      analysis.avg_satisfaction = analysis.satisfaction / analysis.total;
      analysis.helpful_rate = analysis.helpful / analysis.total;
    });

    const insights: LearningInsights = {
      pattern_analysis: {
        total_feedback: recentFeedback.length,
        avg_satisfaction: avgSatisfaction,
        satisfaction_distribution: {
          excellent: recentFeedback.filter(f => f.satisfaction_score >= 4).length,
          good: recentFeedback.filter(f => f.satisfaction_score === 3).length,
          poor: recentFeedback.filter(f => f.satisfaction_score <= 2).length
        },
        query_type_analysis: queryTypeAnalysis
      },
      improvement_areas,
      success_factors,
      model_performance: modelPerformance,
      user_satisfaction_trends: {
        daily_avg: calculateDailyTrends(recentFeedback),
        weekly_trend: avgSatisfaction
      }
    };

    console.log('✅ Feedback analysis completed');
    return insights;
    
  } catch (error) {
    console.error('❌ Error analyzing feedback patterns:', error);
    throw error;
  }
}

// Calculate daily satisfaction trends
function calculateDailyTrends(feedback: any[]): any[] {
  const dailyData = feedback.reduce((acc, f) => {
    const date = new Date(f.created_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { total: 0, satisfaction: 0 };
    }
    acc[date].total += 1;
    acc[date].satisfaction += f.satisfaction_score;
    return acc;
  }, {} as any);

  return Object.keys(dailyData).map(date => ({
    date,
    avg_satisfaction: dailyData[date].satisfaction / dailyData[date].total,
    total_feedback: dailyData[date].total
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Update Oracle models based on feedback
async function updateOracleModels(insights: LearningInsights): Promise<void> {
  try {
    console.log('🔄 Updating Oracle models based on insights...');
    
    // Store insights for model improvement
    const { error: insightsError } = await supabase
      .from('oracle_learning_insights')
      .insert({
        insights_data: insights,
        generated_at: new Date().toISOString(),
        action: 'model_update'
      });

    if (insightsError) throw insightsError;

    // Update model selection preferences based on performance
    const bestModel = Object.keys(insights.model_performance).reduce((best, model) => {
      const current = insights.model_performance[model];
      const bestPerf = insights.model_performance[best];
      return current.avg_satisfaction > bestPerf.avg_satisfaction ? model : best;
    });

    // Store model preferences
    const { error: modelError } = await supabase
      .from('oracle_model_preferences')
      .upsert({
        model_name: bestModel,
        performance_score: insights.model_performance[bestModel].avg_satisfaction,
        helpful_rate: insights.model_performance[bestModel].helpful_rate,
        last_updated: new Date().toISOString()
      });

    if (modelError) throw modelError;

    console.log('✅ Oracle models updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating Oracle models:', error);
    throw error;
  }
}

// Optimize collaboration suggestions based on success patterns
async function optimizeCollaborationSuggestions(): Promise<void> {
  try {
    console.log('🎯 Optimizing collaboration suggestions...');
    
    // Get successful collaboration data
    const { data: successfulConnections, error: connError } = await supabase
      .from('connection_requests')
      .select('*, oracle_logs(*)')
      .eq('status', 'accepted')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (connError) throw connError;

    if (!successfulConnections || successfulConnections.length === 0) {
      console.log('No successful connections found for optimization');
      return;
    }

    // Analyze successful connection patterns
    const successPatterns = successfulConnections.map(conn => ({
      request_type: conn.request_type,
      oracle_generated: conn.oracle_generated,
      satisfaction: conn.oracle_logs?.user_satisfaction || 0,
      helpful: conn.oracle_logs?.helpful || false
    }));

    // Calculate success rates by type
    const successRates = successPatterns.reduce((acc, pattern) => {
      if (!acc[pattern.request_type]) {
        acc[pattern.request_type] = { total: 0, successful: 0, avg_satisfaction: 0 };
      }
      acc[pattern.request_type].total += 1;
      if (pattern.satisfaction >= 4) {
        acc[pattern.request_type].successful += 1;
      }
      acc[pattern.request_type].avg_satisfaction += pattern.satisfaction;
      return acc;
    }, {} as any);

    // Calculate averages
    Object.keys(successRates).forEach(type => {
      const rate = successRates[type];
      rate.success_rate = rate.successful / rate.total;
      rate.avg_satisfaction = rate.avg_satisfaction / rate.total;
    });

    // Store optimization insights
    const { error: optError } = await supabase
      .from('oracle_optimization_insights')
      .insert({
        optimization_type: 'collaboration_suggestions',
        insights_data: {
          success_rates,
          total_connections: successfulConnections.length,
          oracle_generated_success_rate: successPatterns.filter(p => p.oracle_generated).length / successPatterns.length
        },
        generated_at: new Date().toISOString()
      });

    if (optError) throw optError;

    console.log('✅ Collaboration suggestions optimized');
    
  } catch (error) {
    console.error('❌ Error optimizing collaboration suggestions:', error);
    throw error;
  }
}

// Main learning loop function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody: LearningLoopRequest = await req.json();
    console.log('🧠 Learning loop request:', requestBody);

    let result: any = {};

    switch (requestBody.action) {
      case 'analyze_feedback':
        console.log('📊 Analyzing feedback...');
        const insights = await analyzeFeedbackPatterns();
        await updateOracleModels(insights);
        result = { insights, status: 'analyzed' };
        break;

      case 'update_models':
        console.log('🔄 Updating models...');
        const currentInsights = await analyzeFeedbackPatterns();
        await updateOracleModels(currentInsights);
        result = { status: 'models_updated' };
        break;

      case 'generate_insights':
        console.log('💡 Generating insights...');
        const generatedInsights = await analyzeFeedbackPatterns();
        result = { insights: generatedInsights, status: 'insights_generated' };
        break;

      case 'optimize_suggestions':
        console.log('🎯 Optimizing suggestions...');
        await optimizeCollaborationSuggestions();
        result = { status: 'suggestions_optimized' };
        break;

      default:
        throw new Error(`Unknown action: ${requestBody.action}`);
    }

    console.log('✅ Learning loop completed successfully');
    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Learning loop error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        status: 'error' 
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
