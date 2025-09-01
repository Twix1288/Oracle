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

    // Check if code already exists in access_codes table
    const { data: existingCode } = await supabase
      .from('access_codes')
      .select('id')
      .eq('code', code);

    if (!existingCode || existingCode.length === 0) {
      isUnique = true;
      return code;
    }
  }

  throw new Error('Failed to generate unique access code');
};

// Assign access code to user
export const assignAccessCode = async (userId: string, role: string, teamId?: string): Promise<string> => {
  try {
    console.log('🔑 assignAccessCode called with:', { userId, role, teamId });
    
    // Generate new access code
    console.log('🔑 Generating access code...');
    const accessCode = await generateAccessCode();
    console.log('🔑 Generated access code:', accessCode);

    // Create access code entry
    console.log('🔑 Inserting access code into database...');
    const { error: codeError } = await supabase
      .from('access_codes')
      .insert({
        code: accessCode,
        role: role as any,
        team_id: teamId || null,
        description: `Generated for user ${userId}`,
        generated_by: userId
      });

    if (codeError) {
      console.error('🔑 Database insertion error:', codeError);
      throw codeError;
    }

    console.log('🔑 Access code successfully saved to database');
    return accessCode;
  } catch (error) {
    console.error('🔑 Error assigning access code:', error);
    throw error;
  }
};

// Validate access code
export const validateAccessCode = async (code: string, role: string): Promise<boolean> => {
  if (!code.trim()) return false;

  try {
    // Check master codes
    if (code === 'LEAD2024' && role === 'lead') return true;

    // Check access codes table
    const { data: codeData } = await supabase
      .from('access_codes')
      .select('role')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (codeData && codeData.role === role) return true;

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
      .from('access_codes')
      .select('code')
      .eq('generated_by', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data?.code || null;
  } catch (error) {
    console.error('Error getting user access code:', error);
    return null;
  }
};
