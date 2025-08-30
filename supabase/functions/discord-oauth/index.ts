import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const discordClientId = Deno.env.get('DISCORD_CLIENT_ID');
const discordClientSecret = Deno.env.get('DISCORD_CLIENT_SECRET');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  banner?: string | null;
  accent_color?: number | null;
  locale?: string;
  verified?: boolean;
  email?: string | null;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, redirectUri, userId } = await req.json();
    
    if (!code || !redirectUri || !userId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters: code, redirectUri, or userId' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing Discord OAuth for user: ${userId}`);

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: discordClientId!,
        client_secret: discordClientSecret!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error(`Discord token exchange failed: ${errorText}`);
    }

    const tokenData: DiscordTokenResponse = await tokenResponse.json();
    
    // Get Discord user information
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('User fetch failed:', errorText);
      throw new Error(`Failed to get Discord user info: ${errorText}`);
    }

    const discordUser: DiscordUser = await userResponse.json();

    // Check if Discord account is already linked to another user
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('discord_id', discordUser.id)
      .single();

    if (existingProfile && existingProfile.id !== userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'This Discord account is already linked to another user account'
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update user profile with Discord information
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        discord_id: discordUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Profile update failed:', updateError);
      throw new Error(`Failed to update user profile: ${updateError.message}`);
    }

    console.log(`Successfully linked Discord user ${discordUser.username} to user ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      discord_user: {
        id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
      },
      message: `Successfully linked Discord account @${discordUser.username}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Discord OAuth error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});