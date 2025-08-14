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

-- Create stage content chunks table
CREATE TABLE IF NOT EXISTS public.stage_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_name TEXT NOT NULL REFERENCES public.journey_stages(stage_name),
  content_type TEXT NOT NULL, -- 'overview', 'frameworks', 'cac_lens'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  role_visibility TEXT[] DEFAULT '{"builder","mentor","lead","guest"}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for stage content
ALTER TABLE public.stage_content ENABLE ROW LEVEL SECURITY;

-- Create policies for stage content
CREATE POLICY "Stage content is viewable by all authenticated users" 
ON public.stage_content 
FOR SELECT 
USING (true);

-- Create user stage analysis table
CREATE TABLE IF NOT EXISTS public.user_stage_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id),
  current_stage TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.50,
  reasoning TEXT,
  next_actions TEXT[],
  applicable_frameworks TEXT[],
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for user stage analysis
ALTER TABLE public.user_stage_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies for user stage analysis
CREATE POLICY "User stage analysis is viewable by all authenticated users" 
ON public.user_stage_analysis 
FOR SELECT 
USING (true);

CREATE POLICY "User stage analysis can be inserted by all authenticated users" 
ON public.user_stage_analysis 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "User stage analysis can be updated by all authenticated users" 
ON public.user_stage_analysis 
FOR UPDATE 
USING (true);

-- Insert the six journey stages
INSERT INTO public.journey_stages (stage_name, title, description, characteristics, support_needed, frameworks, cac_focus, ai_impact, stage_order) VALUES
('ideation', 'Ideation & Validation', 'Teams are exploring problems, validating ideas, and forming their core concept', 
 ARRAY['Exploring multiple problem spaces', 'Seeking validation from potential users', 'Defining target market', 'Building initial team'], 
 ARRAY['Market research guidance', 'Customer interview techniques', 'Problem validation frameworks'], 
 ARRAY['Problem Validation', 'Jobs-to-be-Done', 'Customer Development'], 
 'find_users', 'Helps identify market opportunities and validate assumptions', 1),

('development', 'MVP Development', 'Teams are building their minimum viable product and establishing core functionality',
 ARRAY['Writing code and building features', 'Defining core product requirements', 'Setting up technical infrastructure', 'Creating user experience'], 
 ARRAY['Technical mentorship', 'Architecture guidance', 'Resource allocation'], 
 ARRAY['Lean Startup', 'Agile Development', 'User-Centered Design'], 
 'build_product', 'Accelerates development cycles and technical decision-making', 2),

('testing', 'Testing & Iteration', 'Teams are testing their MVP with users and iterating based on feedback',
 ARRAY['Gathering user feedback', 'Analyzing usage data', 'Iterating on features', 'Refining product-market fit'], 
 ARRAY['User testing guidance', 'Analytics interpretation', 'Pivot decision support'], 
 ARRAY['JTBD Strategic Lens', 'Data-Driven Development', 'Growth Hacking'], 
 'learn_market', 'Provides insights for rapid iteration and user behavior analysis', 3),

('launch', 'Launch & Go-to-Market', 'Teams are launching their product and executing go-to-market strategies',
 ARRAY['Executing marketing campaigns', 'Acquiring first customers', 'Scaling operations', 'Building brand presence'], 
 ARRAY['Marketing strategy', 'Sales process design', 'Customer success planning'], 
 ARRAY['CAC Strategic Lens', 'Growth Marketing', 'Sales Funnel Optimization'], 
 'acquire_customers', 'Optimizes customer acquisition and marketing effectiveness', 4),

('growth', 'Scale & Growth', 'Teams are scaling their business and optimizing for sustainable growth',
 ARRAY['Scaling operations', 'Optimizing unit economics', 'Building team and culture', 'Expanding market reach'], 
 ARRAY['Business model optimization', 'Team building guidance', 'Investor readiness'], 
 ARRAY['Business Model Canvas', 'OKRs', 'Venture Capital Readiness'], 
 'scale_business', 'Enables data-driven scaling and operational efficiency', 5),

('expansion', 'Market Expansion', 'Teams are expanding to new markets and exploring additional opportunities',
 ARRAY['Entering new markets', 'Developing new product lines', 'Building strategic partnerships', 'Preparing for investment'], 
 ARRAY['Strategic planning', 'Partnership development', 'Investment preparation'], 
 ARRAY['Strategic Planning', 'Partnership Development', 'Due Diligence Preparation'], 
 'expand_reach', 'Identifies expansion opportunities and strategic partnerships', 6);

-- Insert stage content chunks
INSERT INTO public.stage_content (stage_name, content_type, content, metadata) VALUES
-- Ideation stage content
('ideation', 'overview', 'The ideation stage is about discovering and validating problems worth solving. Teams explore different problem spaces, talk to potential customers, and form hypotheses about market opportunities.', '{"focus": "problem_discovery"}'),
('ideation', 'frameworks', 'Problem Validation Framework: Identify assumptions, design experiments, gather evidence. Jobs-to-be-Done: Understand what job customers hire your product to do. Customer Development: Get out of the building and talk to customers.', '{"primary_framework": "problem_validation"}'),
('ideation', 'cac_lens', 'Focus on finding users who have the problem you want to solve. Before worrying about customer acquisition cost, ensure there are customers who actually want what you are building.', '{"cac_focus": "find_users"}'),

-- Development stage content  
('development', 'overview', 'The development stage focuses on building the minimum viable product (MVP). Teams translate their validated problem into a solution, making key technical and design decisions.', '{"focus": "solution_building"}'),
('development', 'frameworks', 'Lean Startup: Build-Measure-Learn cycles for rapid iteration. Agile Development: Iterative development with regular feedback. User-Centered Design: Design with user needs at the center.', '{"primary_framework": "lean_startup"}'),
('development', 'cac_lens', 'Build the core product that solves the validated problem. Focus on creating something users will pay for rather than optimizing acquisition costs.', '{"cac_focus": "build_product"}'),

-- Testing stage content
('testing', 'overview', 'The testing stage involves putting your MVP in front of real users and learning from their behavior. Teams gather feedback, analyze data, and iterate on their product.', '{"focus": "user_validation"}'),
('testing', 'frameworks', 'JTBD Strategic Lens: Understand the job your product does for customers. Data-Driven Development: Use analytics to guide product decisions. Growth Hacking: Test creative ways to grow.', '{"primary_framework": "jtbd_strategic"}'),
('testing', 'cac_lens', 'Learn what the market actually wants. Understand user behavior and preferences to improve product-market fit before scaling acquisition.', '{"cac_focus": "learn_market"}'),

-- Launch stage content
('launch', 'overview', 'The launch stage is about executing go-to-market strategies and acquiring your first paying customers. Teams focus on marketing, sales, and customer success.', '{"focus": "market_execution"}'),
('launch', 'frameworks', 'CAC Strategic Lens: Optimize customer acquisition cost and lifetime value. Growth Marketing: Scale proven acquisition channels. Sales Funnel Optimization: Convert prospects to customers.', '{"primary_framework": "cac_strategic"}'),
('launch', 'cac_lens', 'Acquire customers efficiently. Test different acquisition channels and optimize for sustainable customer acquisition cost.', '{"cac_focus": "acquire_customers"}'),

-- Growth stage content
('growth', 'overview', 'The growth stage focuses on scaling the business model and optimizing operations. Teams build systems, hire talent, and expand their market presence.', '{"focus": "business_scaling"}'),
('growth', 'frameworks', 'Business Model Canvas: Optimize all aspects of the business model. OKRs: Set and track ambitious growth goals. Venture Capital Readiness: Prepare for investment.', '{"primary_framework": "business_model_canvas"}'),
('growth', 'cac_lens', 'Scale the business with healthy unit economics. Optimize the entire customer journey and build repeatable growth systems.', '{"cac_focus": "scale_business"}'),

-- Expansion stage content
('expansion', 'overview', 'The expansion stage involves growing into new markets and opportunities. Teams explore adjacent markets, develop new products, and build strategic partnerships.', '{"focus": "market_expansion"}'),
('expansion', 'frameworks', 'Strategic Planning: Identify and prioritize expansion opportunities. Partnership Development: Build strategic alliances. Due Diligence Preparation: Prepare for larger investments.', '{"primary_framework": "strategic_planning"}'),
('expansion', 'cac_lens', 'Expand reach into new customer segments and markets. Leverage existing capabilities to acquire customers in adjacent areas.', '{"cac_focus": "expand_reach"});