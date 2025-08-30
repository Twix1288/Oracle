import { createClient } from '@supabase/supabase-js';

interface TeamManagementRequest {
  action: 'create_team' | 'update_team' | 'delete_team' | 'assign_member' | 'update_status' | 'track_progress';
  teamId?: string;
  teamName?: string;
  memberId?: string;
  memberRole?: string;
  status?: string;
  progress?: {
    completed: number;
    total: number;
    milestones: string[];
  };
  metadata?: any;
}

interface TeamManagementResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export async function manageTeam(
  supabase: ReturnType<typeof createClient>,
  request: TeamManagementRequest
): Promise<TeamManagementResponse> {
  try {
    switch (request.action) {
      case 'create_team':
        return await createTeam(supabase, request);
      case 'update_team':
        return await updateTeam(supabase, request);
      case 'delete_team':
        return await deleteTeam(supabase, request);
      case 'assign_member':
        return await assignMember(supabase, request);
      case 'update_status':
        return await updateTeamStatus(supabase, request);
      case 'track_progress':
        return await trackTeamProgress(supabase, request);
      default:
        return {
          success: false,
          message: 'Invalid action',
          error: 'Unsupported team management action'
        };
    }
  } catch (error) {
    console.error('Team management error:', error);
    return {
      success: false,
      message: 'Team management operation failed',
      error: error.message
    };
  }
}

async function createTeam(
  supabase: ReturnType<typeof createClient>,
  request: TeamManagementRequest
): Promise<TeamManagementResponse> {
  if (!request.teamName) {
    return {
      success: false,
      message: 'Team name is required',
      error: 'Missing team name'
    };
  }

  try {
    // Generate access code
    const { data: accessCode } = await supabase
      .rpc('generate_team_access_code');

    // Create team
    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        name: request.teamName,
        access_code: accessCode,
        metadata: request.metadata || {}
      })
      .select()
      .single();

    if (error) throw error;

    // Initialize team status
    await supabase
      .from('team_status')
      .insert({
        team_id: team.id,
        current_status: 'Team created',
        health_score: 100
      });

    return {
      success: true,
      message: `Team "${team.name}" created successfully`,
      data: team
    };
  } catch (error) {
    throw error;
  }
}

async function updateTeam(
  supabase: ReturnType<typeof createClient>,
  request: TeamManagementRequest
): Promise<TeamManagementResponse> {
  if (!request.teamId) {
    return {
      success: false,
      message: 'Team ID is required',
      error: 'Missing team ID'
    };
  }

  try {
    const { data: team, error } = await supabase
      .from('teams')
      .update({
        name: request.teamName,
        metadata: request.metadata
      })
      .eq('id', request.teamId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `Team "${team.name}" updated successfully`,
      data: team
    };
  } catch (error) {
    throw error;
  }
}

async function deleteTeam(
  supabase: ReturnType<typeof createClient>,
  request: TeamManagementRequest
): Promise<TeamManagementResponse> {
  if (!request.teamId) {
    return {
      success: false,
      message: 'Team ID is required',
      error: 'Missing team ID'
    };
  }

  try {
    // Archive team instead of deleting
    const { data: team, error } = await supabase
      .from('teams')
      .update({
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.teamId)
      .select()
      .single();

    if (error) throw error;

    // Move members to unassigned
    await supabase
      .from('members')
      .update({ team_id: null })
      .eq('team_id', request.teamId);

    return {
      success: true,
      message: `Team "${team.name}" archived successfully`,
      data: team
    };
  } catch (error) {
    throw error;
  }
}

async function assignMember(
  supabase: ReturnType<typeof createClient>,
  request: TeamManagementRequest
): Promise<TeamManagementResponse> {
  if (!request.memberId || !request.teamId) {
    return {
      success: false,
      message: 'Member ID and Team ID are required',
      error: 'Missing required fields'
    };
  }

  try {
    const { data: member, error } = await supabase
      .from('members')
      .update({
        team_id: request.teamId,
        role: request.memberRole || 'builder'
      })
      .eq('id', request.memberId)
      .select()
      .single();

    if (error) throw error;

    // Update team status
    await updateTeamHealth(supabase, request.teamId);

    return {
      success: true,
      message: `Member "${member.name}" assigned successfully`,
      data: member
    };
  } catch (error) {
    throw error;
  }
}

async function updateTeamStatus(
  supabase: ReturnType<typeof createClient>,
  request: TeamManagementRequest
): Promise<TeamManagementResponse> {
  if (!request.teamId || !request.status) {
    return {
      success: false,
      message: 'Team ID and status are required',
      error: 'Missing required fields'
    };
  }

  try {
    const { data: status, error } = await supabase
      .from('team_status')
      .upsert({
        team_id: request.teamId,
        current_status: request.status,
        last_update: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Update team health score
    await updateTeamHealth(supabase, request.teamId);

    return {
      success: true,
      message: 'Team status updated successfully',
      data: status
    };
  } catch (error) {
    throw error;
  }
}

async function trackTeamProgress(
  supabase: ReturnType<typeof createClient>,
  request: TeamManagementRequest
): Promise<TeamManagementResponse> {
  if (!request.teamId || !request.progress) {
    return {
      success: false,
      message: 'Team ID and progress data are required',
      error: 'Missing required fields'
    };
  }

  try {
    const { completed, total, milestones } = request.progress;
    const progressPercentage = (completed / total) * 100;

    // Update team status with progress
    const { data: status, error } = await supabase
      .from('team_status')
      .upsert({
        team_id: request.teamId,
        current_status: `Progress: ${progressPercentage.toFixed(1)}% (${completed}/${total} tasks)`,
        last_update: new Date().toISOString(),
        metadata: {
          ...request.metadata,
          progress_percentage: progressPercentage,
          completed_tasks: completed,
          total_tasks: total,
          milestones
        }
      })
      .select()
      .single();

    if (error) throw error;

    // Create progress update
    await supabase
      .from('updates')
      .insert({
        team_id: request.teamId,
        content: `Progress Update: ${progressPercentage.toFixed(1)}% complete\nMilestones: ${milestones.join(', ')}`,
        type: 'milestone'
      });

    // Update team health score
    await updateTeamHealth(supabase, request.teamId);

    return {
      success: true,
      message: 'Team progress tracked successfully',
      data: {
        status,
        progress: {
          percentage: progressPercentage,
          completed,
          total,
          milestones
        }
      }
    };
  } catch (error) {
    throw error;
  }
}

async function updateTeamHealth(
  supabase: ReturnType<typeof createClient>,
  teamId: string
): Promise<void> {
  try {
    const { data: score } = await supabase
      .rpc('calculate_team_health_score', { p_team_id: teamId });

    await supabase
      .from('team_status')
      .update({ health_score: score })
      .eq('team_id', teamId);
  } catch (error) {
    console.error('Error updating team health:', error);
  }
}
