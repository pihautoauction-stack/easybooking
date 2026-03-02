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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          client_id: string | null
          client_name: string
          client_phone: string
          client_tg_id: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          master_id: string
          materials_cost: number | null
          materials_retail: number | null
          photo_notes: Json | null
          photos_before_after: Json | null
          preferences: Json | null
          service_id: string | null
          start_time: string
          status: string | null
        }
        Insert: {
          client_id?: string | null
          client_name: string
          client_phone: string
          client_tg_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          master_id: string
          materials_cost?: number | null
          materials_retail?: number | null
          photo_notes?: Json | null
          photos_before_after?: Json | null
          preferences?: Json | null
          service_id?: string | null
          start_time: string
          status?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string
          client_phone?: string
          client_tg_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          master_id?: string
          materials_cost?: number | null
          materials_retail?: number | null
          photo_notes?: Json | null
          photos_before_after?: Json | null
          preferences?: Json | null
          service_id?: string | null
          start_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          is_blacklisted: boolean | null
          master_id: string | null
          name: string
          notes: string | null
          phone: string
          tags: Json | null
          telegram_id: string | null
          total_revenue: number | null
          visits_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_blacklisted?: boolean | null
          master_id?: string | null
          name: string
          notes?: string | null
          phone: string
          tags?: Json | null
          telegram_id?: string | null
          total_revenue?: number | null
          visits_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_blacklisted?: boolean | null
          master_id?: string | null
          name?: string
          notes?: string | null
          phone?: string
          tags?: Json | null
          telegram_id?: string | null
          total_revenue?: number | null
          visits_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_master_id_fkey"
            columns: ["master_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          commission_rate: number | null
          created_at: string
          id: string
          name: string
          salon_id: string | null
          specialty: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string
          id?: string
          name: string
          salon_id?: string | null
          specialty?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string
          id?: string
          name?: string
          salon_id?: string | null
          specialty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string | null
          critical_level: number | null
          id: string
          name: string
          quantity: number | null
          retail_price: number | null
          sku: string | null
          unit: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          critical_level?: number | null
          id?: string
          name: string
          quantity?: number | null
          retail_price?: number | null
          sku?: string | null
          unit?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          critical_level?: number | null
          id?: string
          name?: string
          quantity?: number | null
          retail_price?: number | null
          sku?: string | null
          unit?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      inventory_documents: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          status: string
          total_amount: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          total_amount?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          total_amount?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          appointment_id: string | null
          change_amount: number
          created_at: string | null
          document_id: string | null
          id: string
          inventory_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          change_amount: number
          created_at?: string | null
          document_id?: string | null
          id?: string
          inventory_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          change_amount?: number
          created_at?: string | null
          document_id?: string | null
          id?: string
          inventory_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "inventory_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          breaks: Json | null
          business_name: string | null
          created_at: string | null
          disabled_days: string | null
          id: string
          modules_config: Json | null
          owner_id: string | null
          portfolio_urls: Json | null
          role: string | null
          schedule_step: number | null
          social_links: Json | null
          telegram_chat_id: string | null
          updated_at: string | null
          username: string | null
          weekly_settings: Json | null
          work_end_hour: number | null
          work_end_time: string | null
          work_start_hour: number | null
          work_start_time: string | null
        }
        Insert: {
          breaks?: Json | null
          business_name?: string | null
          created_at?: string | null
          disabled_days?: string | null
          id: string
          modules_config?: Json | null
          owner_id?: string | null
          portfolio_urls?: Json | null
          role?: string | null
          schedule_step?: number | null
          social_links?: Json | null
          telegram_chat_id?: string | null
          updated_at?: string | null
          username?: string | null
          weekly_settings?: Json | null
          work_end_hour?: number | null
          work_end_time?: string | null
          work_start_hour?: number | null
          work_start_time?: string | null
        }
        Update: {
          breaks?: Json | null
          business_name?: string | null
          created_at?: string | null
          disabled_days?: string | null
          id?: string
          modules_config?: Json | null
          owner_id?: string | null
          portfolio_urls?: Json | null
          role?: string | null
          schedule_step?: number | null
          social_links?: Json | null
          telegram_chat_id?: string | null
          updated_at?: string | null
          username?: string | null
          weekly_settings?: Json | null
          work_end_hour?: number | null
          work_end_time?: string | null
          work_start_hour?: number | null
          work_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_materials: {
        Row: {
          created_at: string
          default_quantity: number
          id: string
          inventory_id: string | null
          service_id: string | null
        }
        Insert: {
          created_at?: string
          default_quantity?: number
          id?: string
          inventory_id?: string | null
          service_id?: string | null
        }
        Update: {
          created_at?: string
          default_quantity?: number
          id?: string
          inventory_id?: string | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_materials_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_materials_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          created_at: string | null
          duration: number | null
          employee_id: string | null
          id: string
          image_urls: string[] | null
          name: string
          price: number
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          duration?: number | null
          employee_id?: string | null
          id?: string
          image_urls?: string[] | null
          name: string
          price: number
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          duration?: number | null
          employee_id?: string | null
          id?: string
          image_urls?: string[] | null
          name?: string
          price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          client_name: string
          client_phone: string
          created_at: string
          desired_date: string
          id: string
          master_id: string | null
          telegram_id: string | null
        }
        Insert: {
          client_name: string
          client_phone: string
          created_at?: string
          desired_date: string
          id?: string
          master_id?: string | null
          telegram_id?: string | null
        }
        Update: {
          client_name?: string
          client_phone?: string
          created_at?: string
          desired_date?: string
          id?: string
          master_id?: string | null
          telegram_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_master_id_fkey"
            columns: ["master_id"]
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
      [_ in never]: never
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
