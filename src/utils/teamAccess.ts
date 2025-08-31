import { supabase } from "@/integrations/supabase/client";

export const generateTeamAccessCode = async (teamId: string): Promise<string> => {
  try {
    // Get team name
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    if (!team) throw new Error('Team not found');

    // Generate code based on team name
    const teamPrefix = team.name
      .split(' ')[0] // Take first word
      .slice(0, 4) // Take first 4 characters
      .toUpperCase();

    // Add random numbers
    const randomNum = Math.floor(Math.random() * 9000) + 1000; // 1000-9999

    const accessCode = `${teamPrefix}-${randomNum}`;

    // Create access code record
    const { error: codeError } = await supabase
      .from('access_codes')
      .insert({
        code: accessCode,
        role: 'builder',
        team_id: teamId,
        description: `Team access code for ${team.name}`,
        generated_by: 'system'
      });

    if (codeError) throw codeError;

    return accessCode;
  } catch (error) {
    console.error('Error generating team access code:', error);
    throw error;
  }
};
