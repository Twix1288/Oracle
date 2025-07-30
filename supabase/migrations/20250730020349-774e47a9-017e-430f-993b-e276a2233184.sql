-- Add access codes table for role-based entry
CREATE TABLE public.access_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    role user_role NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and create policies
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to access_codes" ON public.access_codes FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to access_codes" ON public.access_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to access_codes" ON public.access_codes FOR UPDATE USING (true);

-- Create trigger for access_codes
CREATE TRIGGER update_access_codes_updated_at BEFORE UPDATE ON public.access_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample access codes
INSERT INTO public.access_codes (role, code, description) VALUES
('builder', 'build2024', 'Access code for builders'),
('mentor', 'guide2024', 'Access code for mentors'), 
('lead', 'lead2024', 'Access code for program leads');