import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, type, context } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let systemPrompt = '';
    switch (type) {
      case 'project_description':
        systemPrompt = 'You are an expert project advisor. Summarize this project description into a clear, engaging 2-sentence summary that highlights the core problem and solution. Focus on impact and innovation.';
        break;
      case 'stage_summary':
        systemPrompt = `You are a project management expert. Based on the current stage "${context?.stage}" and project details, provide a 1-sentence summary of what the team should focus on next and the key milestone they should achieve.`;
        break;
      case 'goal_analysis':
        systemPrompt = 'You are a strategic advisor. Analyze this goal/vision and provide a concise, actionable summary that clarifies the objective and suggests next steps. Keep it under 100 words.';
        break;
      default:
        systemPrompt = 'You are an expert advisor. Provide a clear, concise summary of the following content, focusing on key insights and actionable information.';
    }

    console.log('🤖 AI Summarizer - Type:', type, 'Text length:', text?.length);

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
          { role: 'user', content: text || 'No content provided' }
        ],
        max_tokens: 200,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content;

    console.log('✅ AI Summary generated successfully');

    return new Response(JSON.stringify({ 
      summary,
      original_text: text,
      type 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error in ai-summarizer function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallback_summary: "Unable to generate AI summary at this time."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});