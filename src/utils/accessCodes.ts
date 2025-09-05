import { supabase } from "@/integrations/supabase/client";

// Generate a unique access code using teams table
export const generateAccessCode = async (): Promise<string> => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  let isUnique = false;

  while (!isUnique) {
    // Generate a random 8-character code
    code = Array.from({ length: 8 }, () => 
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');

    // Check if code already exists in teams table
    const { data: existingCode } = await supabase
      .from('teams')
      .select('id')
      .eq('access_code', code)
      .limit(1)
      .maybeSingle();

    if (!existingCode) {
      isUnique = true;
      return code;
    }
  }

  throw new Error('Failed to generate unique access code');
};

// Validate access code using teams table
export const validateAccessCode = async (code: string, role: string): Promise<boolean> => {
  if (!code.trim()) return false;

  try {
    // Check master codes
    if (code === 'LEAD2024' && role === 'lead') return true;
    if (code === 'GUEST2024' && role === 'guest') return true;

    // Check teams access codes for builders/mentors
    const { data: teamData } = await supabase
      .from('teams')
      .select('access_code, name')
      .eq('access_code', code)
      .limit(1)
      .maybeSingle();

    if (teamData && (role === 'builder' || role === 'mentor')) return true;

    return false;
  } catch (error) {
    console.error('Error validating access code:', error);
    return false;
  }
};

// Validate guest access using simple key
export const validateGuestAccess = async (accessKey: string): Promise<boolean> => {
  if (accessKey === 'guest2024') return true;
  
  try {
    const { data } = await supabase
      .from('teams')
      .select('access_code')
      .eq('access_code', accessKey)
      .limit(1)
      .maybeSingle();
    return !!data;
  } catch (error) {
    console.error('Error validating guest access:', error);
    return false;
  }
};

// Get team by access code
export const getTeamByAccessCode = async (code: string) => {
  try {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('access_code', code)
      .limit(1)
      .maybeSingle();
    return data;
  } catch (error) {
    console.error('Error getting team by access code:', error);
    return null;
  }
};

// Assign access code (stub for compatibility)
export const assignAccessCode = async (userId: string, role: string, teamId?: string): Promise<string> => {
  // This function exists for compatibility but isn't used in new system
  return generateAccessCode();
};