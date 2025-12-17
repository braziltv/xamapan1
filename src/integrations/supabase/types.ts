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
      patient_calls: {
        Row: {
          call_type: string
          completed_at: string | null
          created_at: string
          destination: string | null
          id: string
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
          patient_name?: string
          priority?: string
          status?: string
          unit_name?: string
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
      compact_old_statistics: {
        Args: { days_to_keep?: number }
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
