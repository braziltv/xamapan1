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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_key_usage: {
        Row: {
          api_key_index: number
          created_at: string
          id: string
          unit_name: string
        }
        Insert: {
          api_key_index: number
          created_at?: string
          id?: string
          unit_name: string
        }
        Update: {
          api_key_index?: number
          created_at?: string
          id?: string
          unit_name?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          checked_in_at: string | null
          created_at: string
          id: string
          observations: string | null
          patient_name: string
          priority: string
          scheduled_date: string
          scheduled_time: string
          status: string
          unit_name: string
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          id?: string
          observations?: string | null
          patient_name: string
          priority?: string
          scheduled_date: string
          scheduled_time: string
          status?: string
          unit_name: string
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          id?: string
          observations?: string | null
          patient_name?: string
          priority?: string
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          unit_name?: string
        }
        Relationships: []
      }
      call_history: {
        Row: {
          call_type: string
          completion_type: string | null
          created_at: string
          destination: string | null
          id: string
          patient_name: string
          unit_name: string
        }
        Insert: {
          call_type: string
          completion_type?: string | null
          created_at?: string
          destination?: string | null
          id?: string
          patient_name: string
          unit_name: string
        }
        Update: {
          call_type?: string
          completion_type?: string | null
          created_at?: string
          destination?: string | null
          id?: string
          patient_name?: string
          unit_name?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          recipient: string | null
          sender_name: string | null
          sender_station: string
          unit_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          recipient?: string | null
          sender_name?: string | null
          sender_station: string
          unit_name: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          recipient?: string | null
          sender_name?: string | null
          sender_station?: string
          unit_name?: string
        }
        Relationships: []
      }
      destinations: {
        Row: {
          created_at: string
          display_name: string
          display_order: number
          id: string
          is_active: boolean
          module_id: string | null
          name: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          display_order?: number
          id?: string
          is_active?: boolean
          module_id?: string | null
          name: string
          unit_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          display_order?: number
          id?: string
          is_active?: boolean
          module_id?: string | null
          name?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "destinations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destinations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_health_history: {
        Row: {
          checked_at: string
          created_at: string
          error_message: string | null
          function_label: string
          function_name: string
          id: string
          response_time_ms: number | null
          status: string
        }
        Insert: {
          checked_at?: string
          created_at?: string
          error_message?: string | null
          function_label: string
          function_name: string
          id?: string
          response_time_ms?: number | null
          status: string
        }
        Update: {
          checked_at?: string
          created_at?: string
          error_message?: string | null
          function_label?: string
          function_name?: string
          id?: string
          response_time_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          call_type: string
          code: string
          created_at: string
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          call_type: string
          code: string
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          call_type?: string
          code?: string
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      news_cache: {
        Row: {
          created_at: string
          id: string
          link: string
          source: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          link: string
          source: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string
          source?: string
          title?: string
        }
        Relationships: []
      }
      operator_permissions: {
        Row: {
          can_call: boolean
          can_manage: boolean
          can_view: boolean
          created_at: string
          id: string
          module_id: string
          operator_id: string
        }
        Insert: {
          can_call?: boolean
          can_manage?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module_id: string
          operator_id: string
        }
        Update: {
          can_call?: boolean
          can_manage?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module_id?: string
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_permissions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          password_hash: string
          role: Database["public"]["Enums"]["user_role"]
          unit_id: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          password_hash: string
          role?: Database["public"]["Enums"]["user_role"]
          unit_id: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          password_hash?: string
          role?: Database["public"]["Enums"]["user_role"]
          unit_id?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "operators_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_calls: {
        Row: {
          call_type: string
          completed_at: string | null
          created_at: string
          destination: string | null
          id: string
          observations: string | null
          patient_name: string
          priority: string
          status: string
          unit_name: string
        }
        Insert: {
          call_type: string
          completed_at?: string | null
          created_at?: string
          destination?: string | null
          id?: string
          observations?: string | null
          patient_name: string
          priority?: string
          status?: string
          unit_name: string
        }
        Update: {
          call_type?: string
          completed_at?: string | null
          created_at?: string
          destination?: string | null
          id?: string
          observations?: string | null
          patient_name?: string
          priority?: string
          status?: string
          unit_name?: string
        }
        Relationships: []
      }
      scheduled_announcements: {
        Row: {
          audio_cache_url: string | null
          audio_generated_at: string | null
          audio_type: string
          created_at: string
          custom_audio_url: string | null
          days_of_week: number[]
          end_time: string
          id: string
          interval_minutes: number
          is_active: boolean
          last_played_at: string | null
          repeat_count: number
          start_time: string
          text_content: string
          title: string
          unit_name: string
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          audio_cache_url?: string | null
          audio_generated_at?: string | null
          audio_type?: string
          created_at?: string
          custom_audio_url?: string | null
          days_of_week?: number[]
          end_time?: string
          id?: string
          interval_minutes?: number
          is_active?: boolean
          last_played_at?: string | null
          repeat_count?: number
          start_time?: string
          text_content: string
          title: string
          unit_name: string
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Update: {
          audio_cache_url?: string | null
          audio_generated_at?: string | null
          audio_type?: string
          created_at?: string
          custom_audio_url?: string | null
          days_of_week?: number[]
          end_time?: string
          id?: string
          interval_minutes?: number
          is_active?: boolean
          last_played_at?: string | null
          repeat_count?: number
          start_time?: string
          text_content?: string
          title?: string
          unit_name?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      scheduled_commercial_phrases: {
        Row: {
          created_at: string
          days_of_week: number[]
          display_order: number
          end_time: string
          id: string
          is_active: boolean
          phrase_content: string
          start_time: string
          unit_name: string
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          display_order?: number
          end_time?: string
          id?: string
          is_active?: boolean
          phrase_content: string
          start_time?: string
          unit_name: string
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          display_order?: number
          end_time?: string
          id?: string
          is_active?: boolean
          phrase_content?: string
          start_time?: string
          unit_name?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      statistics_daily: {
        Row: {
          calls_by_destination: Json | null
          calls_by_hour: Json | null
          created_at: string
          date: string
          doctor_calls: number
          id: string
          total_calls: number
          triage_calls: number
          unit_name: string
          updated_at: string
        }
        Insert: {
          calls_by_destination?: Json | null
          calls_by_hour?: Json | null
          created_at?: string
          date: string
          doctor_calls?: number
          id?: string
          total_calls?: number
          triage_calls?: number
          unit_name: string
          updated_at?: string
        }
        Update: {
          calls_by_destination?: Json | null
          calls_by_hour?: Json | null
          created_at?: string
          date?: string
          doctor_calls?: number
          id?: string
          total_calls?: number
          triage_calls?: number
          unit_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_error_logs: {
        Row: {
          created_at: string
          error_message: string
          id: string
          label: string
          module: string
          unit_name: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          id?: string
          label: string
          module: string
          unit_name?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          id?: string
          label?: string
          module?: string
          unit_name?: string | null
        }
        Relationships: []
      }
      telegram_recipients: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          receives_alerts: boolean
          receives_daily_report: boolean
          receives_weekly_report: boolean
          unit_id: string
          updated_at: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          receives_alerts?: boolean
          receives_daily_report?: boolean
          receives_weekly_report?: boolean
          unit_id: string
          updated_at?: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          receives_alerts?: boolean
          receives_daily_report?: boolean
          receives_weekly_report?: boolean
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_recipients_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      test_history: {
        Row: {
          created_at: string
          duration_ms: number | null
          executed_at: string
          failed_tests: number
          id: string
          passed_tests: number
          results: Json
          total_tests: number
          unit_name: string
          warning_tests: number
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          executed_at?: string
          failed_tests?: number
          id?: string
          passed_tests?: number
          results?: Json
          total_tests?: number
          unit_name: string
          warning_tests?: number
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          executed_at?: string
          failed_tests?: number
          id?: string
          passed_tests?: number
          results?: Json
          total_tests?: number
          unit_name?: string
          warning_tests?: number
        }
        Relationships: []
      }
      tts_name_usage: {
        Row: {
          id: string
          name_hash: string
          name_text: string
          used_at: string
        }
        Insert: {
          id?: string
          name_hash: string
          name_text: string
          used_at?: string
        }
        Update: {
          id?: string
          name_hash?: string
          name_text?: string
          used_at?: string
        }
        Relationships: []
      }
      tts_phrases: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          module_id: string | null
          phrase_template: string
          phrase_type: string
          unit_id: string
          updated_at: string
          voice_id: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          module_id?: string | null
          phrase_template: string
          phrase_type?: string
          unit_id: string
          updated_at?: string
          voice_id?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          module_id?: string | null
          phrase_template?: string
          phrase_type?: string
          unit_id?: string
          updated_at?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tts_phrases_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tts_phrases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_settings: {
        Row: {
          commercial_phrase_1: string | null
          commercial_phrase_2: string | null
          commercial_phrase_3: string | null
          created_at: string
          patient_call_voice: string | null
          unit_name: string
          updated_at: string
        }
        Insert: {
          commercial_phrase_1?: string | null
          commercial_phrase_2?: string | null
          commercial_phrase_3?: string | null
          created_at?: string
          patient_call_voice?: string | null
          unit_name: string
          updated_at?: string
        }
        Update: {
          commercial_phrase_1?: string | null
          commercial_phrase_2?: string | null
          commercial_phrase_3?: string | null
          created_at?: string
          patient_call_voice?: string | null
          unit_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          name: string
          password: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          password?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          password?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          is_tv_mode: boolean | null
          last_activity_at: string
          login_at: string
          logout_at: string | null
          messages_sent: number | null
          registrations_count: number | null
          station: string
          tts_calls_count: number | null
          unit_name: string
          user_agent: string | null
          voice_calls_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          is_tv_mode?: boolean | null
          last_activity_at?: string
          login_at?: string
          logout_at?: string | null
          messages_sent?: number | null
          registrations_count?: number | null
          station?: string
          tts_calls_count?: number | null
          unit_name: string
          user_agent?: string | null
          voice_calls_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          is_tv_mode?: boolean | null
          last_activity_at?: string
          login_at?: string
          logout_at?: string | null
          messages_sent?: number | null
          registrations_count?: number | null
          station?: string
          tts_calls_count?: number | null
          unit_name?: string
          user_agent?: string | null
          voice_calls_count?: number | null
        }
        Relationships: []
      }
      weather_cache: {
        Row: {
          city_name: string
          id: string
          updated_at: string
          weather_data: Json
        }
        Insert: {
          city_name: string
          id?: string
          updated_at?: string
          weather_data: Json
        }
        Update: {
          city_name?: string
          id?: string
          updated_at?: string
          weather_data?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aggregate_daily_statistics: {
        Args: { target_date: string; target_unit: string }
        Returns: undefined
      }
      cleanup_duplicate_patients: { Args: never; Returns: number }
      compact_old_statistics: {
        Args: { days_to_keep?: number }
        Returns: number
      }
    }
    Enums: {
      user_role:
        | "admin"
        | "recepcao"
        | "triagem"
        | "medico"
        | "enfermagem"
        | "custom"
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
      user_role: [
        "admin",
        "recepcao",
        "triagem",
        "medico",
        "enfermagem",
        "custom",
      ],
    },
  },
} as const
