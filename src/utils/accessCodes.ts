import { supabase } from "@/integrations/supabase/client";

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

    // Check if code already exists
    const { data: memberData } = await supabase
      .from('members')
      .select('id')
      .eq('access_code', code);

    const { data: teamData } = await supabase
      .from('teams')
      .select('id')
      .eq('access_code', code);

    if ((!memberData || memberData.length === 0) && (!teamData || teamData.length === 0)) {
      isUnique = true;
      return code;
    }
  }

  throw new Error('Failed to generate unique access code');
};

// Assign access code to user
export const assignAccessCode = async (userId: string, role: string, teamId?: string): Promise<string> => {
  try {
    // Generate new access code
    const accessCode = await generateAccessCode();

    // Update member with new access code
    const { error: memberError } = await supabase
      .from('members')
      .update({ access_code: accessCode })
      .eq('id', userId);

    if (memberError) throw memberError;

    // If this is a team member, also update team's access code
    if (teamId) {
      const { error: teamError } = await supabase
        .from('teams')
        .update({ access_code: accessCode })
        .eq('id', teamId);

      if (teamError) throw teamError;
    }

    return accessCode;
  } catch (error) {
    console.error('Error assigning access code:', error);
    throw error;
  }
};

// Validate access code
export const validateAccessCode = async (code: string, role: string): Promise<boolean> => {
  if (!code.trim()) return false;

  try {
    // Check master codes
    if (code === 'LEAD2024' && role === 'lead') return true;

    // Check member codes
    const { data: memberData } = await supabase
      .from('members')
      .select('role')
      .eq('access_code', code)
      .single();

    if (memberData && memberData.role === role) return true;

    // Check team codes (for builders)
    if (role === 'builder') {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('access_code', code)
        .single();

      if (teamData) return true;
    }

    return false;
  } catch (error) {
    console.error('Error validating access code:', error);
    return false;
  }
};

// Get user's access code
export const getUserAccessCode = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('access_code')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.access_code || null;
  } catch (error) {
    console.error('Error getting user access code:', error);
    return null;
  }
};
