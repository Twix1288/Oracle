export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      builder_challenges: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          difficulty: string | null
          embedding_vector: string | null
          id: string
          tags: string[] | null
          title: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          difficulty?: string | null
          embedding_vector?: string | null
          id?: string
          tags?: string[] | null
          title: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          difficulty?: string | null
          embedding_vector?: string | null
          id?: string
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      builder_conversations: {
        Row: {
          content: string | null
          created_at: string
          creator_id: string
          embedding_vector: string | null
          id: string
          participants: string[]
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          creator_id: string
          embedding_vector?: string | null
          id?: string
          participants: string[]
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          creator_id?: string
          embedding_vector?: string | null
          id?: string
          participants?: string[]
          title?: string
        }
        Relationships: []
      }
      collaboration_proposals: {
        Row: {
          created_at: string
          id: string
          message: string | null
          proposal_type: string
          proposer_id: string
          status: string | null
          target_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          proposal_type: string
          proposer_id: string
          status?: string | null
          target_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          proposal_type?: string
          proposer_id?: string
          status?: string | null
          target_id?: string
        }
        Relationships: []
      }
      connection_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          requested_id: string
          requester_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          requested_id: string
          requester_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          requested_id?: string
          requester_id?: string
          status?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          created_at: string
          embedding_vector: string | null
          id: string
          team_id: string | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          embedding_vector?: string | null
          id?: string
          team_id?: string | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          embedding_vector?: string | null
          id?: string
          team_id?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_interactions: {
        Row: {
          body: string | null
          created_at: string
          feed_item_id: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          feed_item_id: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          feed_item_id?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          embedding_vector: string | null
          id: string
          sender_id: string
          team_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          embedding_vector?: string | null
          id?: string
          sender_id: string
          team_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          embedding_vector?: string | null
          id?: string
          sender_id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      oracle_logs: {
        Row: {
          command_executed: boolean | null
          command_result: Json | null
          confidence: number | null
          context_used: boolean | null
          created_at: string
          embedding_vector: string | null
          graph_nodes: Json | null
          graph_relationships: Json | null
          helpful: boolean | null
          id: string
          knowledge_graph: Json | null
          model_used: string | null
          query: string
          query_type: string
          response: Json
          similarity_score: number | null
          sources: number | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          command_executed?: boolean | null
          command_result?: Json | null
          confidence?: number | null
          context_used?: boolean | null
          created_at?: string
          embedding_vector?: string | null
          graph_nodes?: Json | null
          graph_relationships?: Json | null
          helpful?: boolean | null
          id?: string
          knowledge_graph?: Json | null
          model_used?: string | null
          query: string
          query_type?: string
          response: Json
          similarity_score?: number | null
          sources?: number | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          command_executed?: boolean | null
          command_result?: Json | null
          confidence?: number | null
          context_used?: boolean | null
          created_at?: string
          embedding_vector?: string | null
          graph_nodes?: Json | null
          graph_relationships?: Json | null
          helpful?: boolean | null
          id?: string
          knowledge_graph?: Json | null
          model_used?: string | null
          query?: string
          query_type?: string
          response?: Json
          similarity_score?: number | null
          sources?: number | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          embedding_vector: string | null
          full_name: string | null
          id: string
          location: string | null
          role: string | null
          skills: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          embedding_vector?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          role?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          embedding_vector?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          role?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progress_entries: {
        Row: {
          created_at: string
          description: string | null
          embedding_vector: string | null
          id: string
          status: string | null
          team_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          embedding_vector?: string | null
          id?: string
          status?: string | null
          team_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          embedding_vector?: string | null
          id?: string
          status?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      project_interests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          project_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          project_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          project_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_interests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          author_id: string
          content: string | null
          created_at: string
          embedding_vector: string | null
          id: string
          team_id: string
          title: string
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string
          embedding_vector?: string | null
          id?: string
          team_id: string
          title: string
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string
          embedding_vector?: string | null
          id?: string
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_offers: {
        Row: {
          availability: string | null
          created_at: string
          description: string | null
          embedding_vector: string | null
          id: string
          owner_id: string
          skill: string
        }
        Insert: {
          availability?: string | null
          created_at?: string
          description?: string | null
          embedding_vector?: string | null
          id?: string
          owner_id: string
          skill: string
        }
        Update: {
          availability?: string | null
          created_at?: string
          description?: string | null
          embedding_vector?: string | null
          id?: string
          owner_id?: string
          skill?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          embedding_vector: string | null
          id: string
          name: string
          status: string | null
          team_creator_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          embedding_vector?: string | null
          id?: string
          name: string
          status?: string | null
          team_creator_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          embedding_vector?: string | null
          id?: string
          name?: string
          status?: string | null
          team_creator_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      updates: {
        Row: {
          content: string | null
          created_at: string
          embedding_vector: string | null
          id: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          embedding_vector?: string | null
          id?: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          embedding_vector?: string | null
          id?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workshops: {
        Row: {
          attendees: Json | null
          created_at: string
          description: string | null
          embedding_vector: string | null
          host_id: string
          id: string
          max_attendees: number | null
          scheduled_at: string | null
          title: string
        }
        Insert: {
          attendees?: Json | null
          created_at?: string
          description?: string | null
          embedding_vector?: string | null
          host_id: string
          id?: string
          max_attendees?: number | null
          scheduled_at?: string | null
          title: string
        }
        Update: {
          attendees?: Json | null
          created_at?: string
          description?: string | null
          embedding_vector?: string | null
          host_id?: string
          id?: string
          max_attendees?: number | null
          scheduled_at?: string | null
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      search_graph_rag: {
        Args: { k?: number; q_emb: number[] }
        Returns: {
          distance: number
          id: string
          snippet: string
          src_type: string
          title: string
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      team_neighbors: {
        Args: { team_id: string }
        Returns: {
          full_name: string
          role: string
          user_id: string
        }[]
      }
      upsert_embedding: {
        Args: { emb: number[]; row_id: string; tablename: string }
        Returns: undefined
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
