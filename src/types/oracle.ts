export type UserRole = 'builder' | 'mentor' | 'lead' | 'guest';

export type TeamStage = 'ideation' | 'development' | 'testing' | 'launch' | 'growth';

export type UpdateType = 'daily' | 'milestone' | 'mentor_meeting';

export interface Team {
  id: string;
  name: string;
  description?: string;
  stage: TeamStage;
  tags?: string[];
  assigned_mentor_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  name: string;
  role: UserRole;
  team_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Update {
  id: string;
  team_id: string;
  content: string;
  type: UpdateType;
  created_by?: string;
  created_at: string;
  updated_at: string;
  teams?: Team;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  tags?: string[];
  attendance?: string[];
  created_at: string;
  updated_at: string;
}

export interface TeamStatus {
  id: string;
  team_id: string;
  current_status?: string;
  last_update?: string;
  pending_actions?: string[];
  created_at: string;
  updated_at: string;
}

export interface RAGDocument {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  role_visibility: UserRole[];
  source_type?: string;
  source_reference?: string;
  created_at: string;
  updated_at: string;
}