import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Team, Member, Update, Event, TeamStatus, UserRole, UpdateType } from '@/types/oracle';

export const useOracle = (selectedRole: UserRole) => {
  const queryClient = useQueryClient();

  // Fetch teams
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
  });

  // Fetch members
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
      const { data, error } = await supabase.functions.invoke('rag-query', {
        body: { query, role }
      });
      if (error) throw error;
      return data;
    },
  });

  // Filter data based on role
  const getFilteredData = () => {
    switch (selectedRole) {
      case 'builder':
        // Builders see their team's data
        return {
          teams: teams?.slice(0, 1), // For demo, show first team
          updates: updates?.slice(0, 10),
          members: members?.slice(0, 5),
        };
      case 'mentor':
        // Mentors see teams they mentor
        return {
          teams: teams?.slice(0, 3), // For demo, show first 3 teams
          updates: updates?.slice(0, 20),
          members: members?.slice(0, 10),
        };
      case 'lead':
        // Leads see all data
        return {
          teams,
          updates,
          members,
        };
      case 'guest':
        // Guests see limited public data
        return {
          teams: teams?.map(team => ({ ...team, description: 'Public team information' })),
          updates: updates?.slice(0, 5).map(update => ({ 
            ...update, 
            content: 'Public update summary' 
          })),
          members: [],
        };
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