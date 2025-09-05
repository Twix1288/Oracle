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
      access_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          description: string | null
          expires_at: string | null
          generated_by: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          team_id: string | null
          team_name: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          expires_at?: string | null
          generated_by?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          role?: Database["public"]["Enums"]["user_role"] | null
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          expires_at?: string | null
          generated_by?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          role?: Database["public"]["Enums"]["user_role"] | null
          team_id?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_commands_log: {
        Row: {
          command_data: Json | null
          command_name: string
          created_at: string
          error_message: string | null
          guild_id: string | null
          id: string
          response_time_ms: number | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          command_data?: Json | null
          command_name: string
          created_at?: string
          error_message?: string | null
          guild_id?: string | null
          id?: string
          response_time_ms?: number | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          command_data?: Json | null
          command_name?: string
          created_at?: string
          error_message?: string | null
          guild_id?: string | null
          id?: string
          response_time_ms?: number | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_commands_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_assignments: {
        Row: {
          access_code: string
          assigned_at: string
          assigned_by: string | null
          builder_name: string
          created_at: string
          id: string
          is_active: boolean | null
          team_id: string
          updated_at: string
        }
        Insert: {
          access_code: string
          assigned_at?: string
          assigned_by?: string | null
          builder_name: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          team_id: string
          updated_at?: string
        }
        Update: {
          access_code?: string
          assigned_at?: string
          assigned_by?: string | null
          builder_name?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_onboarding: {
        Row: {
          builder_member_id: string | null
          created_at: string
          current_challenges: string[] | null
          embedding: string | null
          goals: string[] | null
          id: string
          notes: string | null
          project_domain: string | null
          team_id: string | null
          tech_stack: string[] | null
          updated_at: string
        }
        Insert: {
          builder_member_id?: string | null
          created_at?: string
          current_challenges?: string[] | null
          embedding?: string | null
          goals?: string[] | null
          id?: string
          notes?: string | null
          project_domain?: string | null
          team_id?: string | null
          tech_stack?: string[] | null
          updated_at?: string
        }
        Update: {
          builder_member_id?: string | null
          created_at?: string
          current_challenges?: string[] | null
          embedding?: string | null
          goals?: string[] | null
          id?: string
          notes?: string | null
          project_domain?: string | null
          team_id?: string | null
          tech_stack?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_onboarding_builder_member_id_fkey"
            columns: ["builder_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_onboarding_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          role_visibility: Database["public"]["Enums"]["user_role"][] | null
          source_reference: string | null
          source_type: string | null
          team_visibility: string[] | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          role_visibility?: Database["public"]["Enums"]["user_role"][] | null
          source_reference?: string | null
          source_type?: string | null
          team_visibility?: string[] | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          role_visibility?: Database["public"]["Enums"]["user_role"][] | null
          source_reference?: string | null
          source_type?: string | null
          team_visibility?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          attendance: string[] | null
          created_at: string
          date: string
          description: string | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          attendance?: string[] | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          attendance?: string[] | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      journey_stages: {
        Row: {
          ai_impact: string | null
          cac_focus: string | null
          characteristics: string[] | null
          created_at: string
          description: string
          frameworks: string[] | null
          id: string
          stage_name: string
          stage_order: number
          support_needed: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_impact?: string | null
          cac_focus?: string | null
          characteristics?: string[] | null
          created_at?: string
          description: string
          frameworks?: string[] | null
          id?: string
          stage_name: string
          stage_order: number
          support_needed?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_impact?: string | null
          cac_focus?: string | null
          characteristics?: string[] | null
          created_at?: string
          description?: string
          frameworks?: string[] | null
          id?: string
          stage_name?: string
          stage_order?: number
          support_needed?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          role: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_profiles: {
        Row: {
          bio: string | null
          created_at: string
          embedding: string | null
          id: string
          industries: string[]
          member_id: string
          skills: string[]
          strengths: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          industries?: string[]
          member_id: string
          skills?: string[]
          strengths?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          industries?: string[]
          member_id?: string
          skills?: string[]
          strengths?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_requests: {
        Row: {
          builder_id: string
          created_at: string
          id: string
          initial_message: string
          mentor_id: string
          mentor_response: string | null
          responded_at: string | null
          status: string
          updated_at: string
          verification_responses: string[] | null
        }
        Insert: {
          builder_id: string
          created_at?: string
          id?: string
          initial_message: string
          mentor_id: string
          mentor_response?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string
          verification_responses?: string[] | null
        }
        Update: {
          builder_id?: string
          created_at?: string
          id?: string
          initial_message?: string
          mentor_id?: string
          mentor_response?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string
          verification_responses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_requests_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_requests_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string | null
          receiver_role: Database["public"]["Enums"]["user_role"]
          sender_id: string | null
          sender_role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string | null
          receiver_role: Database["public"]["Enums"]["user_role"]
          sender_id?: string | null
          sender_role: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string | null
          receiver_role?: Database["public"]["Enums"]["user_role"]
          sender_id?: string | null
          sender_role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          updated_at?: string
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
      oracle_logs: {
        Row: {
          created_at: string
          id: string
          processing_time_ms: number | null
          query: string
          response: string
          sources_count: number | null
          team_id: string | null
          user_id: string | null
          user_role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          processing_time_ms?: number | null
          query: string
          response: string
          sources_count?: number | null
          team_id?: string | null
          user_id?: string | null
          user_role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          id?: string
          processing_time_ms?: number | null
          query?: string
          response?: string
          sources_count?: number | null
          team_id?: string | null
          user_id?: string | null
          user_role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "oracle_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          experience_level: string | null
          full_name: string | null
          github_url: string | null
          help_needed: string[] | null
          id: string
          individual_stage: Database["public"]["Enums"]["team_stage"] | null
          interests: string[] | null
          linkedin_url: string | null
          looking_for_skills: string[] | null
          onboarding_completed: boolean | null
          personal_goals: string[] | null
          portfolio_url: string | null
          project_vision: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          skills: string[] | null
          team_id: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          experience_level?: string | null
          full_name?: string | null
          github_url?: string | null
          help_needed?: string[] | null
          id: string
          individual_stage?: Database["public"]["Enums"]["team_stage"] | null
          interests?: string[] | null
          linkedin_url?: string | null
          looking_for_skills?: string[] | null
          onboarding_completed?: boolean | null
          personal_goals?: string[] | null
          portfolio_url?: string | null
          project_vision?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          skills?: string[] | null
          team_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          experience_level?: string | null
          full_name?: string | null
          github_url?: string | null
          help_needed?: string[] | null
          id?: string
          individual_stage?: Database["public"]["Enums"]["team_stage"] | null
          interests?: string[] | null
          linkedin_url?: string | null
          looking_for_skills?: string[] | null
          onboarding_completed?: boolean | null
          personal_goals?: string[] | null
          portfolio_url?: string | null
          project_vision?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          skills?: string[] | null
          team_id?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      role_assignments: {
        Row: {
          assigned_by: string | null
          assigned_role: Database["public"]["Enums"]["user_role"]
          created_at: string
          id: string
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_role: Database["public"]["Enums"]["user_role"]
          created_at?: string
          id?: string
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          assigned_role?: Database["public"]["Enums"]["user_role"]
          created_at?: string
          id?: string
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_status: {
        Row: {
          created_at: string
          current_status: string | null
          id: string
          last_update: string | null
          pending_actions: string[] | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_status?: string | null
          id?: string
          last_update?: string | null
          pending_actions?: string[] | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_status?: string | null
          id?: string
          last_update?: string | null
          pending_actions?: string[] | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_status_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          assigned_mentor_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          stage: Database["public"]["Enums"]["team_stage"] | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          assigned_mentor_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          stage?: Database["public"]["Enums"]["team_stage"] | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          assigned_mentor_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          stage?: Database["public"]["Enums"]["team_stage"] | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_assigned_mentor_id_fkey"
            columns: ["assigned_mentor_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      updates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          team_id: string
          type: Database["public"]["Enums"]["update_type"]
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          team_id: string
          type: Database["public"]["Enums"]["update_type"]
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          team_id?: string
          type?: Database["public"]["Enums"]["update_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "updates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: Json
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      check_user_role_simple: {
        Args: { required_role: string; user_id: string }
        Returns: boolean
      }
      enhance_oracle_response: {
        Args: { query_text: string; response_text: string; user_role: string }
        Returns: Json
      }
      generate_team_access_code: {
        Args: {
          p_generated_by?: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_team_id: string
        }
        Returns: string
      }
      get_access_codes_overview: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          description: string
          expires_at: string
          generated_by: string
          id: string
          is_active: boolean
          member_id: string
          role: Database["public"]["Enums"]["user_role"]
          team_id: string
          updated_at: string
        }[]
      }
      get_team_member_profiles: {
        Args: { p_team_id: string }
        Returns: {
          avatar_url: string
          bio: string
          experience_level: string
          full_name: string
          github_url: string
          id: string
          portfolio_url: string
          role: Database["public"]["Enums"]["user_role"]
          skills: string[]
        }[]
      }
      get_user_dashboard_stage: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["team_stage"]
      }
      get_user_role: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
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
      join_team_with_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      notify_mentor_request: {
        Args: { p_request_id: string }
        Returns: Json
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
      use_access_code: {
        Args: { p_builder_name?: string; p_code: string; p_user_id: string }
        Returns: Json
      }
      validate_access_code: {
        Args: {
          p_code: string
          p_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: {
          description: string
          expires_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          team_id: string
        }[]
      }
      validate_team_access_code: {
        Args: { p_code: string }
        Returns: {
          current_uses: number
          description: string
          expires_at: string
          id: string
          is_active: boolean
          max_uses: number
          team_id: string
          team_name: string
        }[]
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
      team_stage: "ideation" | "development" | "testing" | "launch" | "growth"
      update_type: "daily" | "milestone" | "mentor_meeting"
      user_role: "builder" | "mentor" | "lead" | "guest" | "unassigned"
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
    Enums: {
      team_stage: ["ideation", "development", "testing", "launch", "growth"],
      update_type: ["daily", "milestone", "mentor_meeting"],
      user_role: ["builder", "mentor", "lead", "guest", "unassigned"],
    },
  },
} as const
