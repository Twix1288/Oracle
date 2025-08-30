/**
 * Generates a random access code for teams
 * @returns A unique 8-character access code
 */
export function generateAccessCode(): string {
  // Generate a random 8-character code using alphanumeric characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Regenerates an access code for a team
 * @param teamId The ID of the team
 * @param supabase Supabase client instance
 * @returns The new access code
 */
export async function regenerateAccessCode(teamId: string, supabase: any): Promise<string> {
  const newCode = generateAccessCode();
  
  const { error } = await supabase
    .from('teams')
    .update({ access_code: newCode })
    .eq('id', teamId);
    
  if (error) throw error;
  
  return newCode;
}
