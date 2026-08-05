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
      allergies: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          reaction: string | null
          severity: string
          substance: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          reaction?: string | null
          severity?: string
          substance: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          reaction?: string | null
          severity?: string
          substance?: string
        }
        Relationships: [
          {
            foreignKeyName: "allergies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          booked_by_label: string | null
          created_at: string
          department_id: string | null
          hospital_id: string
          id: string
          patient_id: string
          reason: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          booked_by_label?: string | null
          created_at?: string
          department_id?: string | null
          hospital_id: string
          id?: string
          patient_id: string
          reason?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          booked_by_label?: string | null
          created_at?: string
          department_id?: string | null
          hospital_id?: string
          id?: string
          patient_id?: string
          reason?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          entity_id: string | null
          entity_type: string | null
          hospital_id: string | null
          id: number
          new_value: Json | null
          occurred_at: string
          old_value: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          entity_id?: string | null
          entity_type?: string | null
          hospital_id?: string | null
          id?: number
          new_value?: Json | null
          occurred_at?: string
          old_value?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          entity_id?: string | null
          entity_type?: string | null
          hospital_id?: string | null
          id?: number
          new_value?: Json | null
          occurred_at?: string
          old_value?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      beds: {
        Row: {
          id: string
          label: string
          patient_id: string | null
          room_id: string
          status: Database["public"]["Enums"]["bed_status"]
          updated_at: string
        }
        Insert: {
          id?: string
          label: string
          patient_id?: string | null
          room_id: string
          status?: Database["public"]["Enums"]["bed_status"]
          updated_at?: string
        }
        Update: {
          id?: string
          label?: string
          patient_id?: string | null
          room_id?: string
          status?: Database["public"]["Enums"]["bed_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_notes: {
        Row: {
          assessment: string | null
          author_id: string | null
          author_label: string | null
          created_at: string
          encounter_id: string | null
          id: string
          note_type: string
          objective: string | null
          patient_id: string
          plan: string | null
          signed_at: string | null
          subjective: string | null
          updated_at: string
        }
        Insert: {
          assessment?: string | null
          author_id?: string | null
          author_label?: string | null
          created_at?: string
          encounter_id?: string | null
          id?: string
          note_type?: string
          objective?: string | null
          patient_id: string
          plan?: string | null
          signed_at?: string | null
          subjective?: string | null
          updated_at?: string
        }
        Update: {
          assessment?: string | null
          author_id?: string | null
          author_label?: string | null
          created_at?: string
          encounter_id?: string | null
          id?: string
          note_type?: string
          objective?: string | null
          patient_id?: string
          plan?: string | null
          signed_at?: string | null
          subjective?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      conditions: {
        Row: {
          created_at: string
          icd10: string | null
          id: string
          name: string
          onset_date: string | null
          patient_id: string
          status: string
        }
        Insert: {
          created_at?: string
          icd10?: string | null
          id?: string
          name: string
          onset_date?: string | null
          patient_id: string
          status?: string
        }
        Update: {
          created_at?: string
          icd10?: string | null
          id?: string
          name?: string
          onset_date?: string | null
          patient_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conditions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      data_provenance: {
        Row: {
          confidence: string
          created_at: string
          entered_by: string | null
          entity_id: string
          entity_type: string
          field_name: string
          id: string
          source: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          confidence?: string
          created_at?: string
          entered_by?: string | null
          entity_id: string
          entity_type: string
          field_name: string
          id?: string
          source: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          confidence?: string
          created_at?: string
          entered_by?: string | null
          entity_id?: string
          entity_type?: string
          field_name?: string
          id?: string
          source?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          colour: string
          created_at: string
          hospital_id: string
          id: string
          location: string | null
          name: string
          sort_order: number
          status: Database["public"]["Enums"]["op_status"]
        }
        Insert: {
          code: string
          colour?: string
          created_at?: string
          hospital_id: string
          id?: string
          location?: string | null
          name: string
          sort_order?: number
          status?: Database["public"]["Enums"]["op_status"]
        }
        Update: {
          code?: string
          colour?: string
          created_at?: string
          hospital_id?: string
          id?: string
          location?: string | null
          name?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["op_status"]
        }
        Relationships: [
          {
            foreignKeyName: "departments_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      encounters: {
        Row: {
          chief_complaint: string | null
          department_id: string | null
          ended_at: string | null
          hospital_id: string
          id: string
          patient_id: string
          priority: string
          stage: string
          started_at: string
        }
        Insert: {
          chief_complaint?: string | null
          department_id?: string | null
          ended_at?: string | null
          hospital_id: string
          id?: string
          patient_id: string
          priority?: string
          stage?: string
          started_at?: string
        }
        Update: {
          chief_complaint?: string | null
          department_id?: string | null
          ended_at?: string | null
          hospital_id?: string
          id?: string
          patient_id?: string
          priority?: string
          stage?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encounters_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actor_id: string | null
          actor_label: string | null
          department_code: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          hospital_id: string | null
          id: number
          occurred_at: string
          payload: Json
          severity: string
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string | null
          department_code?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          hospital_id?: string | null
          id?: number
          occurred_at?: string
          payload?: Json
          severity?: string
        }
        Update: {
          actor_id?: string | null
          actor_label?: string | null
          department_code?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          hospital_id?: string | null
          id?: number
          occurred_at?: string
          payload?: Json
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          code: string
          created_at: string
          currency: string
          id: string
          name: string
          timezone: string
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string
          id?: string
          name: string
          timezone?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          id?: string
          name?: string
          timezone?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          category: Database["public"]["Enums"]["order_category"]
          code: string | null
          completed_at: string | null
          created_at: string
          encounter_id: string | null
          hospital_id: string
          id: string
          instructions: string | null
          name: string
          patient_id: string
          priority: string
          requested_at: string
          requested_by_id: string | null
          requested_by_label: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["order_category"]
          code?: string | null
          completed_at?: string | null
          created_at?: string
          encounter_id?: string | null
          hospital_id: string
          id?: string
          instructions?: string | null
          name: string
          patient_id: string
          priority?: string
          requested_at?: string
          requested_by_id?: string | null
          requested_by_label?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["order_category"]
          code?: string | null
          completed_at?: string | null
          created_at?: string
          encounter_id?: string | null
          hospital_id?: string
          id?: string
          instructions?: string | null
          name?: string
          patient_id?: string
          priority?: string
          requested_at?: string
          requested_by_id?: string | null
          requested_by_label?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: false
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          blood_group: string | null
          created_at: string
          date_of_birth: string
          egfr: number | null
          full_name: string
          hospital_id: string
          id: string
          insurance_coverage_pct: number | null
          insurance_number: string | null
          insurance_provider: string | null
          mrn: string
          phone: string | null
          photo_url: string | null
          pregnancy_status: string | null
          sex: string
        }
        Insert: {
          blood_group?: string | null
          created_at?: string
          date_of_birth: string
          egfr?: number | null
          full_name: string
          hospital_id: string
          id?: string
          insurance_coverage_pct?: number | null
          insurance_number?: string | null
          insurance_provider?: string | null
          mrn: string
          phone?: string | null
          photo_url?: string | null
          pregnancy_status?: string | null
          sex?: string
        }
        Update: {
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string
          egfr?: number | null
          full_name?: string
          hospital_id?: string
          id?: string
          insurance_coverage_pct?: number | null
          insurance_number?: string | null
          insurance_provider?: string | null
          mrn?: string
          phone?: string | null
          photo_url?: string | null
          pregnancy_status?: string | null
          sex?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          email: string | null
          full_name: string
          hospital_id: string | null
          id: string
          job_title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string
          hospital_id?: string | null
          id?: string
          job_title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string
          hospital_id?: string | null
          id?: string
          job_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          id: string
          name: string
          ward_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          ward_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          availability: string
          created_at: string
          department_id: string | null
          full_name: string
          hospital_id: string
          id: string
          job_title: string
          last_seen_at: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          availability?: string
          created_at?: string
          department_id?: string | null
          full_name: string
          hospital_id: string
          id?: string
          job_title: string
          last_seen_at?: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          availability?: string
          created_at?: string
          department_id?: string | null
          full_name?: string
          hospital_id?: string
          id?: string
          job_title?: string
          last_seen_at?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          expires_at: string | null
          granted_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vitals: {
        Row: {
          diastolic: number | null
          heart_rate: number | null
          id: string
          news2: number | null
          patient_id: string
          recorded_at: string
          respiratory_rate: number | null
          spo2: number | null
          systolic: number | null
          temperature_c: number | null
        }
        Insert: {
          diastolic?: number | null
          heart_rate?: number | null
          id?: string
          news2?: number | null
          patient_id: string
          recorded_at?: string
          respiratory_rate?: number | null
          spo2?: number | null
          systolic?: number | null
          temperature_c?: number | null
        }
        Update: {
          diastolic?: number | null
          heart_rate?: number | null
          id?: string
          news2?: number | null
          patient_id?: string
          recorded_at?: string
          respiratory_rate?: number | null
          spo2?: number | null
          systolic?: number | null
          temperature_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      wards: {
        Row: {
          created_at: string
          department_id: string | null
          floor: number
          hospital_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          floor?: number
          hospital_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          floor?: number
          hospital_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "wards_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wards_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      emit_event: {
        Args: {
          _department_code?: string
          _entity_id?: string
          _entity_type?: string
          _event_type: string
          _payload?: Json
          _severity?: string
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "ceo"
        | "medical_director"
        | "doctor"
        | "nurse"
        | "receptionist"
        | "lab_tech"
        | "radiologist"
        | "pharmacist"
        | "cashier"
        | "patient"
      appointment_status:
        | "booked"
        | "arrived"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      bed_status:
        | "available"
        | "occupied"
        | "cleaning"
        | "reserved"
        | "maintenance"
      op_status: "healthy" | "busy" | "critical" | "offline"
      order_category: "laboratory" | "imaging" | "medication" | "procedure"
      order_status:
        | "draft"
        | "requested"
        | "in_progress"
        | "resulted"
        | "completed"
        | "cancelled"
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
      app_role: [
        "super_admin",
        "ceo",
        "medical_director",
        "doctor",
        "nurse",
        "receptionist",
        "lab_tech",
        "radiologist",
        "pharmacist",
        "cashier",
        "patient",
      ],
      appointment_status: [
        "booked",
        "arrived",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      bed_status: [
        "available",
        "occupied",
        "cleaning",
        "reserved",
        "maintenance",
      ],
      op_status: ["healthy", "busy", "critical", "offline"],
      order_category: ["laboratory", "imaging", "medication", "procedure"],
      order_status: [
        "draft",
        "requested",
        "in_progress",
        "resulted",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
