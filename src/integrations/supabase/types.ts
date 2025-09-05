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
      members: {
        Row: {
          created_at: string | null
          id: string
          joined_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
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
          {
            foreignKeyName: "members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read_at: string | null
          receiver_id: string | null
          receiver_role: Database["public"]["Enums"]["user_role"]
          sender_id: string | null
          sender_role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id?: string | null
          receiver_role: Database["public"]["Enums"]["user_role"]
          sender_id?: string | null
          sender_role: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id?: string | null
          receiver_role?: Database["public"]["Enums"]["user_role"]
          sender_id?: string | null
          sender_role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
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
          created_at: string | null
          email: string
          experience_level: string | null
          full_name: string | null
          github_url: string | null
          help_needed: string[] | null
          id: string
          individual_stage:
            | Database["public"]["Enums"]["individual_stage"]
            | null
          linkedin_url: string | null
          onboarding_completed: boolean | null
          personal_goals: string[] | null
          portfolio_url: string | null
          project_vision: string | null
          role: Database["public"]["Enums"]["user_role"]
          skills: string[] | null
          team_id: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          experience_level?: string | null
          full_name?: string | null
          github_url?: string | null
          help_needed?: string[] | null
          id: string
          individual_stage?:
            | Database["public"]["Enums"]["individual_stage"]
            | null
          linkedin_url?: string | null
          onboarding_completed?: boolean | null
          personal_goals?: string[] | null
          portfolio_url?: string | null
          project_vision?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skills?: string[] | null
          team_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          availability?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          experience_level?: string | null
          full_name?: string | null
          github_url?: string | null
          help_needed?: string[] | null
          id?: string
          individual_stage?:
            | Database["public"]["Enums"]["individual_stage"]
            | null
          linkedin_url?: string | null
          onboarding_completed?: boolean | null
          personal_goals?: string[] | null
          portfolio_url?: string | null
          project_vision?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skills?: string[] | null
          team_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_team"
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
          created_at: string | null
          id: string
          reason: string | null
          user_id: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_role: Database["public"]["Enums"]["user_role"]
          created_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_role?: Database["public"]["Enums"]["user_role"]
          created_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string | null
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
          id: string
          last_activity: string | null
          status: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          last_activity?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          last_activity?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
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
          access_code: string | null
          created_at: string | null
          description: string | null
          id: string
          max_members: number | null
          name: string
          project_description: string | null
          project_name: string | null
          stage: string | null
          tech_stack: string[] | null
          updated_at: string | null
        }
        Insert: {
          access_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_members?: number | null
          name: string
          project_description?: string | null
          project_name?: string | null
          stage?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
        }
        Update: {
          access_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          max_members?: number | null
          name?: string
          project_description?: string | null
          project_name?: string | null
          stage?: string | null
          tech_stack?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      updates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          team_id: string | null
          type: Database["public"]["Enums"]["update_type"] | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          team_id?: string | null
          type?: Database["public"]["Enums"]["update_type"] | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          team_id?: string | null
          type?: Database["public"]["Enums"]["update_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      create_team_with_project_data: {
        Args: {
          p_description?: string
          p_name: string
          p_project_description?: string
          p_project_name?: string
          p_tech_stack?: string[]
          p_user_id?: string
        }
        Returns: Json
      }
      generate_access_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      join_team_with_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      individual_stage:
        | "ideation"
        | "development"
        | "testing"
        | "launch"
        | "growth"
      update_type: "progress" | "milestone" | "issue" | "note"
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
      individual_stage: [
        "ideation",
        "development",
        "testing",
        "launch",
        "growth",
      ],
      update_type: ["progress", "milestone", "issue", "note"],
      user_role: ["builder", "mentor", "lead", "guest", "unassigned"],
    },
  },
} as const
