import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Temporary project interface using existing tables
export interface LegacyProject {
  id: string;
  title: string;
  description: string | null;
  stage: 'ideation' | 'development' | 'testing' | 'launch' | 'growth';
  created_at: string;
  updated_at: string;
}

export const useLegacyProjects = () => {
  const queryClient = useQueryClient();

  // Use teams table as projects for now
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['legacy_projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform teams to look like projects
      return data.map(team => ({
        id: team.id,
        title: team.name,
        description: team.description,
        stage: team.stage || 'ideation',
        created_at: team.created_at,
        updated_at: team.updated_at
      })) as LegacyProject[];
    },
  });

  // Create project using teams table
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: {
      title: string;
      description?: string;
      stage?: 'ideation' | 'development' | 'testing' | 'launch' | 'growth';
    }) => {
      const { data, error } = await supabase
        .from('teams')
        .insert([{
          name: projectData.title,
          description: projectData.description,
          stage: projectData.stage || 'ideation'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legacy_projects'] });
      toast.success('Project created successfully!');
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  });

  // Update project using teams table
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LegacyProject> & { id: string }) => {
      const teamUpdates: any = {};
      if (updates.title) teamUpdates.name = updates.title;
      if (updates.description !== undefined) teamUpdates.description = updates.description;
      if (updates.stage) teamUpdates.stage = updates.stage;

      const { data, error } = await supabase
        .from('teams')
        .update(teamUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legacy_projects'] });
      toast.success('Project updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    }
  });

  return {
    projects,
    isLoading: projectsLoading,
    createProject: createProjectMutation.mutate,
    updateProject: updateProjectMutation.mutate,
    createProjectLoading: createProjectMutation.isPending,
    updateProjectLoading: updateProjectMutation.isPending
  };
};