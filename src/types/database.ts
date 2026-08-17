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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          timezone: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          timezone?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          timezone?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      study_goals: {
        Row: {
          created_at: string
          daily_target_minutes: number | null
          description: string | null
          id: string
          is_archived: boolean
          name: string
          updated_at: string
          user_id: string
          weekly_target_minutes: number | null
        }
        Insert: {
          created_at?: string
          daily_target_minutes?: number | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          updated_at?: string
          user_id: string
          weekly_target_minutes?: number | null
        }
        Update: {
          created_at?: string
          daily_target_minutes?: number | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          updated_at?: string
          user_id?: string
          weekly_target_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          goal_id: string | null
          id: string
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          pomodoro_minutes: number | null
          rating: number | null
          share_notes: boolean
          session_type: Database["public"]["Enums"]["session_type"]
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          goal_id?: string | null
          id?: string
          notes?: string | null
          paused_at?: string | null
          paused_seconds?: number
          pomodoro_minutes?: number | null
          rating?: number | null
          share_notes?: boolean
          session_type?: Database["public"]["Enums"]["session_type"]
          started_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          goal_id?: string | null
          id?: string
          notes?: string | null
          paused_at?: string | null
          paused_seconds?: number
          pomodoro_minutes?: number | null
          rating?: number | null
          share_notes?: boolean
          session_type?: Database["public"]["Enums"]["session_type"]
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_goal_owner_fk"
            columns: ["goal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_goals"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "study_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_study_group: { Args: { p_name: string }; Returns: string }
      delete_completed_study_session: {
        Args: { p_session_id: string }
        Returns: string
      }
      delete_study_group: { Args: { p_group_id: string }; Returns: undefined }
      delete_unused_study_goal: { Args: { p_goal_id: string }; Returns: string }
      finish_study_session: {
        Args: { p_session_id: string }
        Returns: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          goal_id: string | null
          id: string
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          pomodoro_minutes: number | null
          rating: number | null
          share_notes: boolean
          session_type: Database["public"]["Enums"]["session_type"]
          started_at: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "study_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_activity_feed: {
        Args: {
          p_before_ended_at?: string
          p_before_id?: string
          p_group_id?: string
          p_limit?: number
          p_scope?: string
        }
        Returns: Json
      }
      get_application_leaderboard: {
        Args: { p_limit?: number; p_period?: string }
        Returns: Json
      }
      get_my_study_groups: { Args: never; Returns: Json }
      get_personal_history_stats: { Args: { p_days?: number }; Returns: Json }
      get_study_analytics: {
        Args: { p_group_id?: string | null; p_limit?: number; p_range?: string; p_scope?: string }
        Returns: Json
      }
      get_study_group: {
        Args: { p_group_id: string; p_limit?: number; p_period?: string }
        Returns: Json
      }
      get_today_study_summary: {
        Args: never
        Returns: {
          duration_seconds: number
          goal_id: string
        }[]
      }
      is_username_available: { Args: { candidate: string }; Returns: boolean }
      join_study_group: { Args: { p_token: string }; Returns: string }
      leave_study_group: { Args: { p_group_id: string }; Returns: undefined }
      pause_study_session: {
        Args: { p_session_id: string }
        Returns: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          goal_id: string | null
          id: string
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          pomodoro_minutes: number | null
          rating: number | null
          share_notes: boolean
          session_type: Database["public"]["Enums"]["session_type"]
          started_at: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "study_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      preview_group_invite: { Args: { p_token: string }; Returns: Json }
      regenerate_group_invite: { Args: { p_group_id: string }; Returns: string }
      remove_study_group_member: {
        Args: { p_group_id: string; p_username: string }
        Returns: undefined
      }
      rename_study_group: {
        Args: { p_group_id: string; p_name: string }
        Returns: undefined
      }
      resume_study_session: {
        Args: { p_session_id: string }
        Returns: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          goal_id: string | null
          id: string
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          pomodoro_minutes: number | null
          rating: number | null
          share_notes: boolean
          session_type: Database["public"]["Enums"]["session_type"]
          started_at: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "study_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_study_session: {
        Args: {
          p_goal_id: string
          p_pomodoro_minutes?: number
          p_session_type: Database["public"]["Enums"]["session_type"]
        }
        Returns: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          goal_id: string | null
          id: string
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          pomodoro_minutes: number | null
          rating: number | null
          share_notes: boolean
          session_type: Database["public"]["Enums"]["session_type"]
          started_at: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "study_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_study_session_reflection: {
        Args: {
          p_notes: string
          p_rating: number
          p_session_id: string
          p_share_notes: boolean
        }
        Returns: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          goal_id: string | null
          id: string
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          pomodoro_minutes: number | null
          rating: number | null
          share_notes: boolean
          session_type: Database["public"]["Enums"]["session_type"]
          started_at: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "study_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      group_role: "owner" | "member"
      session_type: "normal" | "pomodoro"
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
      group_role: ["owner", "member"],
      session_type: ["normal", "pomodoro"],
    },
  },
} as const
