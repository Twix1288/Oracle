import { supabase } from "@/integrations/supabase/client";

// Types updated for current schema
export interface Team {
  id: string;
  name: string;
  description: string | null;
  stage: TeamStage;
  created_at: string;
  // assigned_mentor_id removed as it doesn't exist in new schema
}

export type TeamStage = 'ideation' | 'development' | 'testing' | 'launch' | 'growth';

export interface Member {
  id: string;
  name: string;
  role: 'builder' | 'mentor' | 'lead' | 'guest' | 'unassigned';
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

// Generate access code using database function
export const generateAccessCode = async (): Promise<string> => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => 
    characters.charAt(Math.floor(Math.random() * characters.length))
  ).join('');
};

// Create team using database function
export const createTeam = async (
  name: string,
  description: string | null = null,
  stage: TeamStage = 'ideation',
  leadId?: string
): Promise<Team> => {
  const { data, error } = await supabase
    .from('teams')
    .insert({
      name,
      description,
      stage
    })
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    stage: data.stage as TeamStage
  } as Team;
};

// Delete a team
export const deleteTeam = async (teamId: string): Promise<void> => {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) throw error;

  // Move team members to unassigned
  await supabase
    .from('members')
    .update({ team_id: null })
    .eq('team_id', teamId);
};

// Get unassigned members
export const getUnassignedMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .is('team_id', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as any[])?.map(member => ({
    ...member,
    name: member.user_id, // Use user_id as name fallback
    updated_at: member.created_at // Use created_at as updated_at fallback
  })) || [];
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
  return (data as any[])?.map(member => ({
    ...member,
    name: member.user_id, // Use user_id as name fallback
    updated_at: member.created_at // Use created_at as updated_at fallback
  })) || [];
};

// Get all active teams
export const getActiveTeams = async (): Promise<Team[]> => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as any[])?.map(team => ({
    ...team,
    stage: team.stage as TeamStage
  })) || [];
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
      type: type === 'daily' ? 'note' : type === 'mentor_meeting' ? 'milestone' : type,
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
      status: currentStatus,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
};

// Assign mentor to team (simplified)
export const assignMentorToTeam = async (teamId: string, mentorId: string | null): Promise<void> => {
  // Mentor assignment is handled through the members table
  // This function is kept for compatibility but simplified
  if (mentorId) {
    const { error } = await supabase
      .from('members')
      .update({ team_id: teamId, role: 'mentor' })
      .eq('user_id', mentorId);
    if (error) throw error;
  }
};