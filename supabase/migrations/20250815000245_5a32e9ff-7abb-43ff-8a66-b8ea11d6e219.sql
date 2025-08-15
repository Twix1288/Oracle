-- Create user profiles table for detailed user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  personal_goals TEXT[],
  project_vision TEXT,
  skills TEXT[],
  help_needed TEXT[],
  experience_level TEXT,
  availability TEXT,
  timezone TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  team_id UUID REFERENCES public.teams(id),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Update access_codes table to be team-based only
ALTER TABLE public.access_codes DROP COLUMN IF EXISTS role CASCADE;
ALTER TABLE public.access_codes DROP COLUMN IF EXISTS member_id CASCADE;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT NULL;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS current_uses INTEGER DEFAULT 0;

-- Update access_codes policies
DROP POLICY IF EXISTS "Anyone can read access codes for validation" ON public.access_codes;
DROP POLICY IF EXISTS "System can manage access codes" ON public.access_codes;

CREATE POLICY "Anyone can read active access codes for validation" ON public.access_codes 
FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Authenticated users can manage access codes" ON public.access_codes 
FOR ALL USING (auth.uid() IS NOT NULL);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update validate_access_code function for team-based codes
CREATE OR REPLACE FUNCTION public.validate_team_access_code(p_code TEXT)
RETURNS TABLE(
  id UUID,
  team_id UUID,
  team_name TEXT,
  description TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN,
  max_uses INTEGER,
  current_uses INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.id,
    ac.team_id,
    t.name as team_name,
    ac.description,
    ac.expires_at,
    ac.is_active,
    ac.max_uses,
    ac.current_uses
  FROM public.access_codes ac
  LEFT JOIN public.teams t ON ac.team_id = t.id
  WHERE ac.code = p_code
    AND COALESCE(ac.is_active, true) = true
    AND (ac.expires_at IS NULL OR ac.expires_at > NOW())
    AND (ac.max_uses IS NULL OR ac.current_uses < ac.max_uses)
  LIMIT 1;
END;
$$;

-- Create function to join team with access code
CREATE OR REPLACE FUNCTION public.join_team_with_code(p_user_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access_code RECORD;
  v_result JSONB;
BEGIN
  -- Validate the access code
  SELECT * INTO v_access_code FROM public.validate_team_access_code(p_code);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired access code');
  END IF;
  
  -- Update user profile with team
  UPDATE public.profiles 
  SET team_id = v_access_code.team_id, updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Increment usage count
  UPDATE public.access_codes
  SET current_uses = current_uses + 1, updated_at = NOW()
  WHERE id = v_access_code.id;
  
  -- Return success with team info
  RETURN jsonb_build_object(
    'success', true, 
    'team_id', v_access_code.team_id,
    'team_name', v_access_code.team_name
  );
END;
$$;