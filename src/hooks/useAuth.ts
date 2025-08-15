import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  personal_goals?: string[];
  project_vision?: string;
  skills?: string[];
  help_needed?: string[];
  experience_level?: string;
  availability?: string;
  timezone?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  team_id?: string;
  role: 'builder' | 'mentor' | 'lead' | 'guest';
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            setProfile(profileData);
          }, 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch user profile
        setTimeout(async () => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          setProfile(profileData);
        }, 0);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  };

  const joinTeamWithCode = async (code: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase.rpc('join_team_with_code', {
      p_user_id: user.id,
      p_code: code
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Refresh profile after joining team
    if (data && typeof data === 'object' && 'success' in data && data.success) {
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
    }

    return data as any;
  };

  const assignRole = async (userId: string, role: 'builder' | 'mentor' | 'lead' | 'guest', reason?: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase.rpc('assign_user_role', {
      p_user_id: userId,
      p_role: role
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Log the role assignment
    if (data && typeof data === 'object' && 'success' in data && data.success) {
      await supabase.from('role_assignments').insert({
        user_id: userId,
        assigned_role: role,
        assigned_by: user.id,
        reason: reason || 'Role assigned'
      });
    }

    return data as any;
  };

  return {
    user,
    session,
    profile,
    loading,
    signOut,
    updateProfile,
    joinTeamWithCode,
    assignRole,
  };
};