// Role types
export type UserRole = 'builder' | 'mentor' | 'lead' | 'guest';
export type TeamStage = 'ideation' | 'development' | 'testing' | 'launch' | 'growth';
export type UpdateType = 'daily' | 'milestone' | 'mentor_meeting';
export type BroadcastType = 'all' | 'team' | 'role';

// Team types
export interface Team {
  id: string;
  name: string;
  description: string | null;
  stage: TeamStage;
  tags: string[] | null;
  assigned_mentor_id: string | null;
  access_code: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  metadata: Record<string, any>;
}

// Member types
export interface Member {
  id: string;
  name: string;
  role: UserRole;
  team_id: string | null;
  skills: string[] | null;
  experience_level: string | null;
  help_needed: string[] | null;
  bio: string | null;
  avatar_url: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

// Update types
export interface Update {
  id: string;
  team_id: string;
  content: string;
  type: UpdateType;
  created_by: string;
  sentiment: number | null;
  keywords: string[] | null;
  related_tasks: string[] | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

// Message types
export interface Message {
  id: string;
  sender_id: string;
  sender_role: UserRole;
  receiver_id: string | null;
  receiver_role: UserRole | null;
  content: string;
  team_id: string | null;
  is_broadcast: boolean;
  broadcast_type: BroadcastType | null;
  broadcast_target: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

// Document types
export interface Document {
  id: string;
  content: string;
  metadata: Record<string, any>;
  source_type: string;
  role_visibility: UserRole[];
  team_visibility: string[];
  embedding: number[];
  created_at: string;
  updated_at: string;
}

// Oracle types
export interface OracleRequest {
  query: string;
  role: UserRole;
  teamId?: string;
  userId?: string;
  userProfile?: {
    id: string;
    name: string;
    role: UserRole;
    [key: string]: any;
  };
  contextRequest?: {
    needsResources?: boolean;
    needsMentions?: boolean;
    needsTeamContext?: boolean;
    needsPersonalization?: boolean;
    resourceTopic?: string;
  };
  commandExecuted?: boolean;
  commandType?: string;
  commandResult?: any;
}

export interface OracleResponse {
  answer: string;
  sources: number;
  context_used: boolean;
  detected_stage?: TeamStage;
  suggested_frameworks?: string[];
  next_actions?: string[];
  stage_confidence?: number;
  sections?: {
    update?: string;
    progress?: string;
    event?: string;
  };
  resources?: OracleResource[];
  mentions?: string[];
  team_updates?: Update[];
  task_assignments?: any[];
}

export interface OracleResource {
  title: string;
  url: string;
  type: 'youtube' | 'article' | 'documentation' | 'tutorial' | 'tool';
  description: string;
  relevance: number;
}

export interface CommandResult {
  executed: boolean;
  type?: string;
  message: string;
  data?: any;
}

// Stage analysis types
export interface StageAnalysis {
  stage: TeamStage;
  confidence: number;
  reasoning: string;
}

// OpenAI types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens: number;
  temperature: number;
  timeout?: number;
  stream?: boolean;
  n?: number;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Database types
export interface DatabaseError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

export interface DatabaseResult<T> {
  data: T | null;
  error: DatabaseError | null;
}

// Error types
export interface ErrorDetails {
  code: string;
  message: string;
  status: number;
  details?: any;
}

export interface ErrorResponse {
  error: ErrorDetails;
}
