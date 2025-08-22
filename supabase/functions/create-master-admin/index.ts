import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create admin client with service role
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating master admin account...');

    // Master admin credentials
    const adminEmail = 'admin@piefi.co';
    const adminPassword = 'PieFiAdmin2025!';
    
    // Check if admin already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(adminEmail);
    
    if (existingUser?.user) {
      console.log('Admin user already exists');
      
      // Ensure they have lead role in profiles
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', existingUser.user.id)
        .maybeSingle();
        
      if (!profile) {
        // Create profile if missing
        await supabaseAdmin
          .from('profiles')
          .insert({
            id: existingUser.user.id,
            email: adminEmail,
            full_name: 'PieFi Master Admin',
            role: 'lead',
            onboarding_completed: true
          });
        console.log('Created missing profile for existing admin');
      } else if (profile.role !== 'lead') {
        // Update role to lead if not already
        await supabaseAdmin
          .from('profiles')
          .update({ role: 'lead' })
          .eq('id', existingUser.user.id);
        console.log('Updated existing admin role to lead');
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Admin account already exists and has been verified',
        credentials: {
          email: adminEmail,
          password: adminPassword,
          role: 'lead'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create new admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Skip email verification
      user_metadata: {
        full_name: 'PieFi Master Admin',
        role: 'lead'
      }
    });

    if (createError) {
      console.error('Error creating admin user:', createError);
      throw createError;
    }

    if (!newUser?.user) {
      throw new Error('Failed to create user');
    }

    console.log('Admin user created successfully:', newUser.user.id);

    // Create profile with lead role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email: adminEmail,
        full_name: 'PieFi Master Admin',
        role: 'lead',
        onboarding_completed: true,
        bio: 'Master administrator account with full system access'
      });

    if (profileError) {
      console.error('Error creating admin profile:', profileError);
      throw profileError;
    }

    console.log('Admin profile created successfully');

    // Log the role assignment
    await supabaseAdmin
      .from('role_assignments')
      .insert({
        user_id: newUser.user.id,
        assigned_role: 'lead',
        assigned_by: newUser.user.id,
        reason: 'Master admin account creation'
      });

    return new Response(JSON.stringify({
      success: true,
      message: 'Master admin account created successfully',
      credentials: {
        email: adminEmail,
        password: adminPassword,
        role: 'lead',
        userId: newUser.user.id
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-master-admin:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});