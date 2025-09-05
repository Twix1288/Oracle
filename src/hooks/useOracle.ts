import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/types/oracle';

// Updated types for new schema - fallback to existing for now
export interface Team {
  id: string;
  name: string;
  purpose?: string;
  description?: string;
  project_id?: string;
  created_by_user_id?: string;
  stage?: string;
  created_at: string;
  updated_at: string;
}

export interface Update {
  id: string;
  team_id: string;
  content: string;
  type: 'daily' | 'milestone' | 'mentor_meeting';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface QAThread {
  id: string;
  title: string;
  body: string;
  tags: string[];
  author_id: string;
  status: 'open' | 'solved';
  project_id?: string;
  created_at: string;
  updated_at: string;
}

export const useOracle = (selectedRole: UserRole) => {
  const queryClient = useQueryClient();

  // Fetch teams with real-time polling
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Team[];
    },
    refetchInterval: 5000,
  });

  // For now, we'll skip QA threads until the migration is complete
  const qaThreads: QAThread[] = [];
  const qaLoading = false;

  // Fetch updates
  const { data: updates, isLoading: updatesLoading } = useQuery({
    queryKey: ['updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('updates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Update[];
    },
  });

  // Submit update mutation
  const submitUpdateMutation = useMutation({
    mutationFn: async ({ teamId, content, type, createdBy }: { 
      teamId: string; 
      content: string; 
      type: 'daily' | 'milestone' | 'mentor_meeting'; 
      createdBy?: string;
    }) => {
      const { data, error } = await supabase
        .from('updates')
        .insert([{
          team_id: teamId,
          content,
          type,
          created_by: createdBy,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['updates'] });
    },
  });

  // Create QA thread mutation - disabled for now
  const createQAThreadMutation = useMutation({
    mutationFn: async (thread: {
      title: string;
      body: string;
      tags: string[];
      project_id?: string;
    }) => {
      // This will be implemented when qa_threads table is available
      console.log('QA Thread creation not yet implemented:', thread);
      throw new Error('QA threads not yet available');
    },
    onSuccess: () => {
      // queryClient.invalidateQueries({ queryKey: ['qa_threads'] });
    },
  });

  // RAG query mutation
  const ragQueryMutation = useMutation({
    mutationFn: async ({ query, role }: { query: string; role: UserRole }) => {
      const { data, error } = await supabase.functions.invoke('super-oracle', {
        body: { 
          type: 'rag_search',
          query, 
          role,
          userId: (await supabase.auth.getUser()).data.user?.id
        }
      });
      if (error) throw error;
      return data;
    },
  });

  return {
    teams,
    updates,
    qaThreads,
    isLoading: teamsLoading || updatesLoading || qaLoading,
    submitUpdate: submitUpdateMutation.mutate,
    createQAThread: createQAThreadMutation.mutate,
    queryRAG: ragQueryMutation.mutate,
    ragResponse: ragQueryMutation.data,
    ragLoading: ragQueryMutation.isPending,
  };
};