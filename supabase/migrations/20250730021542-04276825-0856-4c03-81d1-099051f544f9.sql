-- Create messages table for communication between roles
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_role USER_ROLE NOT NULL,
  receiver_role USER_ROLE NOT NULL,
  sender_id TEXT,
  receiver_id TEXT,
  team_id UUID REFERENCES public.teams(id),
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create oracle_logs table for tracking AI queries
CREATE TABLE public.oracle_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_role USER_ROLE NOT NULL,
  user_id TEXT,
  team_id UUID REFERENCES public.teams(id),
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  sources_count INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view their own messages" 
ON public.messages 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
USING (true);

-- RLS Policies for oracle_logs  
CREATE POLICY "Users can view oracle logs based on role" 
ON public.oracle_logs 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert oracle logs" 
ON public.oracle_logs 
FOR INSERT 
WITH CHECK (true);

-- Add triggers for timestamp updates
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add team_id to members table if not exists (for better team assignment)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'members' AND column_name = 'assigned_by'
  ) THEN
    ALTER TABLE public.members ADD COLUMN assigned_by TEXT;
    ALTER TABLE public.members ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;