
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  role: 'builder' | 'mentor' | 'lead' | 'guest' | 'unassigned';
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
    console.log('🔐 Setting up auth state listener...');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, 'User ID:', session?.user?.id || 'None');
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 User authenticated, fetching profile...');
          // Use setTimeout to avoid blocking the auth callback
          setTimeout(async () => {
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();
              
              if (error) {
                console.error('❌ Profile fetch error:', error);
                setProfile(null);
              } else if (profileData) {
                console.log('✅ Profile loaded successfully:', {
                  id: profileData.id,
                  role: profileData.role,
                  onboarding_completed: profileData.onboarding_completed,
                  team_id: profileData.team_id
                });
                setProfile(profileData);
              } else {
                console.log('⚠️ No profile found for user, needs to be created');
                setProfile(null);
              }
            } catch (error) {
              console.error('❌ Profile fetch exception:', error);
              setProfile(null);
            }
          }, 0);
        } else {
          console.log('👤 No user session, clearing profile');
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    console.log('🔍 Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ Session retrieval error:', error);
        setLoading(false);
        return;
      }
      
      console.log('🔍 Initial session check result:', session?.user?.id || 'No session');
      
      // If we have a session but the auth state listener hasn't fired yet, 
      // the listener will handle setting the state
      if (!session) {
        setLoading(false);
      }
    }).catch((error) => {
      console.error('❌ Session check exception:', error);
      setLoading(false);
    });

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async (scope: 'local' | 'global' | 'others' = 'global') => {
    console.log('🚪 Signing out with scope:', scope);
    
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope });
      
      console.log('✅ Signed out successfully');
      toast.success("Logged out successfully");
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      toast.error("Failed to log out");
      // Even if logout fails, clear local state
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { data: null, error: new Error('Not authenticated') };

    try {
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
    } catch (error) {
      return { data: null, error };
    }
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
        .maybeSingle();
      
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

  const signOutAllSessions = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    toast.success('Signed out from all devices');
  };

  return {
    user,
    session,
    profile,
    loading,
    signOut,
    signOutAllSessions,
    updateProfile,
    joinTeamWithCode,
    assignRole,
  };
};
