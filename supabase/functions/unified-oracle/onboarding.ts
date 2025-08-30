import { createClient } from '@supabase/supabase-js';

interface OnboardingRequest {
  action: 'start_onboarding' | 'complete_onboarding' | 'validate_access' | 'update_role' | 'assign_team';
  userId: string;
  userName: string;
  role?: string;
  teamId?: string;
  accessCode?: string;
  skills?: string[];
  experience?: string;
  helpNeeded?: string[];
  bio?: string;
  metadata?: any;
}

interface OnboardingResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  nextSteps?: string[];
}

export async function manageOnboarding(
  supabase: ReturnType<typeof createClient>,
  request: OnboardingRequest
): Promise<OnboardingResponse> {
  try {
    switch (request.action) {
      case 'start_onboarding':
        return await startOnboarding(supabase, request);
      case 'complete_onboarding':
        return await completeOnboarding(supabase, request);
      case 'validate_access':
        return await validateAccess(supabase, request);
      case 'update_role':
        return await updateRole(supabase, request);
      case 'assign_team':
        return await assignTeam(supabase, request);
      default:
        return {
          success: false,
          message: 'Invalid action',
          error: 'Unsupported onboarding action'
        };
    }
  } catch (error) {
    console.error('Onboarding error:', error);
    return {
      success: false,
      message: 'Onboarding operation failed',
      error: error.message
    };
  }
}

async function startOnboarding(
  supabase: ReturnType<typeof createClient>,
  request: OnboardingRequest
): Promise<OnboardingResponse> {
  try {
    // Create initial member record
    const { data: member, error } = await supabase
      .from('members')
      .insert({
        id: request.userId,
        name: request.userName,
        role: 'guest', // Default role until validated
        metadata: {
          onboarding_started: new Date().toISOString(),
          ...request.metadata
        }
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: 'Onboarding started successfully',
      data: member,
      nextSteps: [
        'Enter your access code to validate your role',
        'Complete your profile with skills and experience',
        'Join or select your team'
      ]
    };
  } catch (error) {
    throw error;
  }
}

async function validateAccess(
  supabase: ReturnType<typeof createClient>,
  request: OnboardingRequest
): Promise<OnboardingResponse> {
  if (!request.accessCode) {
    return {
      success: false,
      message: 'Access code is required',
      error: 'Missing access code'
    };
  }

  try {
    // Check master access codes
    const masterCodes = {
      'BUILD2024': 'builder',
      'MENTOR2024': 'mentor',
      'LEAD2024': 'lead'
    };

    let role = masterCodes[request.accessCode];
    let teamId: string | undefined;

    if (!role) {
      // Check team access codes
      const { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('access_code', request.accessCode)
        .single();

      if (team) {
        role = 'builder';
        teamId = team.id;
      } else {
        return {
          success: false,
          message: 'Invalid access code',
          error: 'Access code not found'
        };
      }
    }

    // Update member role and team
    const { data: member, error } = await supabase
      .from('members')
      .update({
        role,
        team_id: teamId,
        metadata: {
          ...request.metadata,
          access_code_validated: new Date().toISOString()
        }
      })
      .eq('id', request.userId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: `Access validated successfully. Role: ${role}${teamId ? ' (Team assigned)' : ''}`,
      data: member,
      nextSteps: teamId ? 
        ['Complete your profile', 'Meet your team'] :
        ['Complete your profile', 'Select or join a team']
    };
  } catch (error) {
    throw error;
  }
}

async function completeOnboarding(
  supabase: ReturnType<typeof createClient>,
  request: OnboardingRequest
): Promise<OnboardingResponse> {
  try {
    // Update member profile
    const { data: member, error } = await supabase
      .from('members')
      .update({
        skills: request.skills,
        experience_level: request.experience,
        help_needed: request.helpNeeded,
        bio: request.bio,
        metadata: {
          ...request.metadata,
          onboarding_completed: new Date().toISOString()
        }
      })
      .eq('id', request.userId)
      .select()
      .single();

    if (error) throw error;

    // Create welcome message
    await supabase
      .from('messages')
      .insert({
        sender_id: 'system',
        sender_role: 'guest',
        receiver_id: request.userId,
        receiver_role: member.role,
        content: `Welcome to the program, ${member.name}! 🎉\n\nRole: ${member.role}\nSkills: ${member.skills?.join(', ') || 'None listed'}\n\nThe Oracle is here to help you on your journey!`,
        team_id: member.team_id
      });

    // If member has a team, create team update
    if (member.team_id) {
      await supabase
        .from('updates')
        .insert({
          team_id: member.team_id,
          content: `New team member joined: ${member.name} (${member.role})\nSkills: ${member.skills?.join(', ') || 'None listed'}`,
          type: 'milestone',
          created_by: 'system'
        });
    }

    return {
      success: true,
      message: 'Onboarding completed successfully',
      data: member,
      nextSteps: member.team_id ?
        ['Check your team dashboard', 'Review current tasks', 'Connect with team members'] :
        ['Join a team', 'Browse available projects', 'Connect with other members']
    };
  } catch (error) {
    throw error;
  }
}

async function updateRole(
  supabase: ReturnType<typeof createClient>,
  request: OnboardingRequest
): Promise<OnboardingResponse> {
  if (!request.role) {
    return {
      success: false,
      message: 'Role is required',
      error: 'Missing role'
    };
  }

  try {
    const { data: member, error } = await supabase
      .from('members')
      .update({
        role: request.role,
        metadata: {
          ...request.metadata,
          role_updated: new Date().toISOString()
        }
      })
      .eq('id', request.userId)
      .select()
      .single();

    if (error) throw error;

    // Notify team if member has one
    if (member.team_id) {
      await supabase
        .from('updates')
        .insert({
          team_id: member.team_id,
          content: `Role update: ${member.name} is now a ${member.role}`,
          type: 'milestone',
          created_by: 'system'
        });
    }

    return {
      success: true,
      message: `Role updated successfully to ${member.role}`,
      data: member
    };
  } catch (error) {
    throw error;
  }
}

async function assignTeam(
  supabase: ReturnType<typeof createClient>,
  request: OnboardingRequest
): Promise<OnboardingResponse> {
  if (!request.teamId) {
    return {
      success: false,
      message: 'Team ID is required',
      error: 'Missing team ID'
    };
  }

  try {
    // Get team info
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', request.teamId)
      .single();

    // Update member's team
    const { data: member, error } = await supabase
      .from('members')
      .update({
        team_id: request.teamId,
        metadata: {
          ...request.metadata,
          team_joined: new Date().toISOString()
        }
      })
      .eq('id', request.userId)
      .select()
      .single();

    if (error) throw error;

    // Create team update
    await supabase
      .from('updates')
      .insert({
        team_id: request.teamId,
        content: `New member joined: ${member.name} (${member.role})\nSkills: ${member.skills?.join(', ') || 'None listed'}`,
        type: 'milestone',
        created_by: 'system'
      });

    return {
      success: true,
      message: `Successfully joined team ${team.name}`,
      data: member,
      nextSteps: [
        'Review team dashboard',
        'Check current tasks',
        'Introduce yourself to the team',
        'Connect with your mentor'
      ]
    };
  } catch (error) {
    throw error;
  }
}
