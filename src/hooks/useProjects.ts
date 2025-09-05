import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Project {
  id: string;
  title: string;
  problem_statement: string | null;
  description: string | null;
  tags: string[];
  stage: 'idea' | 'prototype' | 'mvp' | 'live';
  visibility: 'public' | 'team' | 'private';
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMembership {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
}

export interface Invite {
  id: string;
  team_id: string;
  token: string;
  created_by: string;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  status: 'active' | 'expired' | 'revoked';
}

export const useProjects = () => {
  const queryClient = useQueryClient();

  // Fetch user's projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_user_id', user.user.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    },
  });

  // Fetch user's team memberships
  const { data: memberships, isLoading: membershipsLoading } = useQuery({
    queryKey: ['team_memberships'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('team_memberships')
        .select(`
          *,
          teams (
            id,
            name,
            purpose,
            project_id,
            created_by_user_id,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.user.id)
        .order('joined_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: {
      title: string;
      problem_statement?: string;
      description?: string;
      tags?: string[];
      stage?: 'idea' | 'prototype' | 'mvp' | 'live';
      visibility?: 'public' | 'team' | 'private';
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .insert([{
          ...projectData,
          owner_user_id: user.user.id,
          tags: projectData.tags || [],
          stage: projectData.stage || 'idea',
          visibility: projectData.visibility || 'private'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully!');
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    }
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (teamData: {
      name: string;
      purpose?: string;
      project_id?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('teams')
        .insert([{
          ...teamData,
          created_by_user_id: user.user.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_memberships'] });
      toast.success('Team created successfully!');
    },
    onError: (error) => {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  });

  // Generate invite mutation
  const generateInviteMutation = useMutation({
    mutationFn: async ({ team_id, max_uses }: { team_id: string; max_uses?: number }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Generate a unique token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { data, error } = await supabase
        .from('invites')
        .insert([{
          team_id,
          token,
          created_by: user.user.id,
          max_uses: max_uses || null,
          uses: 0,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Invite link generated!');
    },
    onError: (error) => {
      console.error('Error generating invite:', error);
      toast.error('Failed to generate invite');
    }
  });

  return {
    projects,
    memberships,
    isLoading: projectsLoading || membershipsLoading,
    createProject: createProjectMutation.mutate,
    updateProject: updateProjectMutation.mutate,
    createTeam: createTeamMutation.mutate,
    generateInvite: generateInviteMutation.mutate,
    createProjectLoading: createProjectMutation.isPending,
    updateProjectLoading: updateProjectMutation.isPending,
    createTeamLoading: createTeamMutation.isPending,
    generateInviteLoading: generateInviteMutation.isPending
  };
};