import { supabase } from "@/integrations/supabase/client";

// Types
export interface Team {
  id: string;
  name: string;
  description: string | null;
  stage: TeamStage;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  assigned_mentor_id: string | null;
}

export type TeamStage = 'ideation' | 'development' | 'testing' | 'launch' | 'growth';

export interface Member {
  id: string;
  name: string;
  role: 'builder' | 'mentor' | 'lead' | 'guest';
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

// Create a new team
export const createTeam = async (
  name: string,
  description: string | null = null,
  stage: TeamStage = 'ideation',
  leadId: string
): Promise<Team> => {
  const { data, error } = await supabase
    .from('teams')
    .insert({
      name,
      description,
      stage,
      created_by: leadId,
      is_archived: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete a team (soft delete)
export const deleteTeam = async (teamId: string): Promise<void> => {
  const { error } = await supabase
    .from('teams')
    .update({ 
      is_archived: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', teamId);

  if (error) throw error;

  // Move all team members to unassigned
  const { error: memberError } = await supabase
    .from('members')
    .update({ team_id: null })
    .eq('team_id', teamId);

  if (memberError) throw memberError;
};

// Get unassigned members
export const getUnassignedMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .is('team_id', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Assign member to team
export const assignMemberToTeam = async (memberId: string, teamId: string | null): Promise<void> => {
  const { error } = await supabase
    .from('members')
    .update({ team_id: teamId })
    .eq('id', memberId);

  if (error) throw error;
};

// Get team members
export const getTeamMembers = async (teamId: string): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('team_id', teamId)
    .order('role');

  if (error) throw error;
  return data || [];
};

// Get all active teams
export const getActiveTeams = async (): Promise<Team[]> => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Get team updates
export const getTeamUpdates = async (teamId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('updates')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
};

// Create team update
export const createTeamUpdate = async (
  teamId: string,
  content: string,
  type: 'daily' | 'milestone' | 'mentor_meeting',
  createdBy: string
): Promise<void> => {
  const { error } = await supabase
    .from('updates')
    .insert({
      team_id: teamId,
      content,
      type,
      created_by: createdBy
    });

  if (error) throw error;
};

// Update team status
export const updateTeamStatus = async (
  teamId: string,
  currentStatus: string,
  pendingActions?: string[]
): Promise<void> => {
  const { error } = await supabase
    .from('team_status')
    .upsert({
      team_id: teamId,
      current_status: currentStatus,
      pending_actions: pendingActions,
      last_update: new Date().toISOString()
    });

  if (error) throw error;
};

// Assign mentor to team
export const assignMentorToTeam = async (teamId: string, mentorId: string | null): Promise<void> => {
  const { error } = await supabase
    .from('teams')
    .update({ assigned_mentor_id: mentorId })
    .eq('id', teamId);

  if (error) throw error;
};