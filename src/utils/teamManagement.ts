import { supabase } from "@/integrations/supabase/client";

// Types
export interface Team {
  id: string;
  name: string;
  description: string | null;
  stage: TeamStage;
  access_code: string | null;
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

// Generate a unique access code
export const generateAccessCode = async (): Promise<string> => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  let isUnique = false;

  while (!isUnique) {
    // Generate a random 8-character code
    code = Array.from({ length: 8 }, () => 
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');

    // Check if code is unique
    const { data } = await supabase
      .from('teams')
      .select('id')
      .eq('access_code', code);

    if (!data || data.length === 0) {
      isUnique = true;
      return code;
    }
  }

  throw new Error('Failed to generate unique access code');
};

// Create a new team
export const createTeam = async (
  name: string,
  description: string | null = null,
  stage: TeamStage = 'ideation',
  leadId: string
): Promise<Team> => {
  const access_code = await generateAccessCode();

  const { data, error } = await supabase
    .from('teams')
    .insert({
      name,
      description,
      stage,
      access_code,
      created_by: leadId
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
      access_code: null, // Invalidate access code
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

// Regenerate team access code
export const regenerateAccessCode = async (teamId: string): Promise<string> => {
  const newCode = await generateAccessCode();

  const { error } = await supabase
    .from('teams')
    .update({ access_code: newCode })
    .eq('id', teamId);

  if (error) throw error;
  return newCode;
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

// Validate team access code
export const validateAccessCode = async (code: string): Promise<Team | null> => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('access_code', code)
    .eq('is_archived', false)
    .single();

  if (error) return null;
  return data;
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
