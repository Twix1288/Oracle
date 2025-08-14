-- Create the journey stages and content system
CREATE TABLE IF NOT EXISTS public.journey_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  characteristics TEXT[],
  support_needed TEXT[],
  frameworks TEXT[],
  cac_focus TEXT,
  ai_impact TEXT,
  stage_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.journey_stages ENABLE ROW LEVEL SECURITY;

-- Create policies for journey stages
CREATE POLICY "Journey stages are viewable by all authenticated users" 
ON public.journey_stages 
FOR SELECT 
USING (true);

-- Insert the six journey stages
INSERT INTO public.journey_stages (stage_name, title, description, characteristics, support_needed, frameworks, cac_focus, ai_impact, stage_order) VALUES
('ideation', 'Ideation & Validation', 'Teams are exploring problems, validating ideas, and forming their core concept', 
 ARRAY['Exploring multiple problem spaces', 'Seeking validation from potential users', 'Defining target market', 'Building initial team'], 
 ARRAY['Market research guidance', 'Customer interview techniques', 'Problem validation frameworks'], 
 ARRAY['Problem Validation', 'Jobs-to-be-Done', 'Customer Development'], 
 'find_users', 'Helps identify market opportunities and validate assumptions', 1);

INSERT INTO public.journey_stages (stage_name, title, description, characteristics, support_needed, frameworks, cac_focus, ai_impact, stage_order) VALUES
('development', 'MVP Development', 'Teams are building their minimum viable product and establishing core functionality',
 ARRAY['Writing code and building features', 'Defining core product requirements', 'Setting up technical infrastructure', 'Creating user experience'], 
 ARRAY['Technical mentorship', 'Architecture guidance', 'Resource allocation'], 
 ARRAY['Lean Startup', 'Agile Development', 'User-Centered Design'], 
 'build_product', 'Accelerates development cycles and technical decision-making', 2);

-- Add embedding column to documents table for vector search
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS embedding vector(1536);