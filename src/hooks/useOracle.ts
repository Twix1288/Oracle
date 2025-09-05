import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Team, Member, Update, Event, TeamStatus, UserRole, UpdateType } from '@/types/oracle';

export const useOracle = (selectedRole: UserRole) => {
  const queryClient = useQueryClient();

  // Fetch teams with real-time polling for multi-user support
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
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  // Fetch members with real-time polling for accurate member counts
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Member[];
    },
    refetchInterval: 3000, // Faster polling for member changes
  });

  // Fetch updates with team information
  const { data: updates, isLoading: updatesLoading } = useQuery({
    queryKey: ['updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('updates')
        .select(`
          *,
          teams:team_id (*)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Update[];
    },
  });

  // Fetch team status
  const { data: teamStatuses, isLoading: statusLoading } = useQuery({
    queryKey: ['team_status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_status')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as TeamStatus[];
    },
  });

  // Submit update mutation
  const submitUpdateMutation = useMutation({
    mutationFn: async ({ teamId, content, type, createdBy }: { 
      teamId: string; 
      content: string; 
      type: UpdateType; 
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
      queryClient.invalidateQueries({ queryKey: ['team_status'] });
    },
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (team: Omit<Team, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('teams')
        .insert([team])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
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

  // Filter data based on role
  const getFilteredData = () => {
    switch (selectedRole) {
      case 'builder':
      case 'mentor':
      case 'lead':
        // Show full data for authenticated roles
        return {
          teams,
          updates,
          members,
        };
      case 'guest':
        // Guests see sanitized public data
        return { teams, updates, members };
      default:
        return { teams: [], updates: [], members: [] };
    }
  };

  return {
    ...getFilteredData(),
    teamStatuses,
    isLoading: teamsLoading || membersLoading || updatesLoading || statusLoading,
    submitUpdate: submitUpdateMutation.mutate,
    createTeam: createTeamMutation.mutate,
    queryRAG: ragQueryMutation.mutate,
    ragResponse: ragQueryMutation.data,
    ragLoading: ragQueryMutation.isPending,
  };
};