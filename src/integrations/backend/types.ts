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
      ai_results_cache: {
        Row: {
          created_at: string
          id: string
          result_data: Json
          result_type: string
          scholarship_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          result_data?: Json
          result_type: string
          scholarship_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          result_data?: Json
          result_type?: string
          scholarship_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      application_checklist: {
        Row: {
          created_at: string | null
          id: string
          is_done: boolean
          label: string
          position: number
          scholarship_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_done?: boolean
          label: string
          position?: number
          scholarship_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_done?: boolean
          label?: string
          position?: number
          scholarship_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_checklist_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "public_shared_scholarships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_checklist_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          scholarship_id: string | null
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          scholarship_id?: string | null
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          scholarship_id?: string | null
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "public_shared_scholarships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
        ]
      }
      community_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_email: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_email: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      essay_library_items: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          kind?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_post_votes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_post_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          achievements: string[] | null
          activity_streak: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          cv_raw_text: string | null
          display_name: string | null
          education: Json | null
          education_level: string | null
          experience: Json | null
          gpa: string | null
          id: string
          interests: string[] | null
          last_active_at: string | null
          major: string | null
          monthly_goal: number | null
          quick_notes: string | null
          skills: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements?: string[] | null
          activity_streak?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          cv_raw_text?: string | null
          display_name?: string | null
          education?: Json | null
          education_level?: string | null
          experience?: Json | null
          gpa?: string | null
          id?: string
          interests?: string[] | null
          last_active_at?: string | null
          major?: string | null
          monthly_goal?: number | null
          quick_notes?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements?: string[] | null
          activity_streak?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          cv_raw_text?: string | null
          display_name?: string | null
          education?: Json | null
          education_level?: string | null
          experience?: Json | null
          gpa?: string | null
          id?: string
          interests?: string[] | null
          last_active_at?: string | null
          major?: string | null
          monthly_goal?: number | null
          quick_notes?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scholarship_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          scholarship_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          scholarship_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          scholarship_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_files_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "public_shared_scholarships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_files_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarships: {
        Row: {
          amount: number | null
          application_type: string
          created_at: string
          deadline: string | null
          eligibility_notes: string | null
          id: string
          is_favorited: boolean | null
          is_shared: boolean
          link: string | null
          name: string
          notes: string | null
          organization: string | null
          position: number | null
          share_token: string | null
          status: Database["public"]["Enums"]["scholarship_status"]
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          application_type?: string
          created_at?: string
          deadline?: string | null
          eligibility_notes?: string | null
          id?: string
          is_favorited?: boolean | null
          is_shared?: boolean
          link?: string | null
          name: string
          notes?: string | null
          organization?: string | null
          position?: number | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["scholarship_status"]
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          application_type?: string
          created_at?: string
          deadline?: string | null
          eligibility_notes?: string | null
          id?: string
          is_favorited?: boolean | null
          is_shared?: boolean
          link?: string | null
          name?: string
          notes?: string | null
          organization?: string | null
          position?: number | null
          share_token?: string | null
          status?: Database["public"]["Enums"]["scholarship_status"]
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_scholarships: {
        Row: {
          created_at: string
          id: string
          scholarship_id: string
          shared_by: string
          shared_with: string
        }
        Insert: {
          created_at?: string
          id?: string
          scholarship_id: string
          shared_by: string
          shared_with: string
        }
        Update: {
          created_at?: string
          id?: string
          scholarship_id?: string
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_scholarships_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "public_shared_scholarships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_scholarships_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_shared_scholarships: {
        Row: {
          amount: number | null
          created_at: string | null
          deadline: string | null
          eligibility_notes: string | null
          id: string | null
          is_shared: boolean | null
          link: string | null
          name: string | null
          notes: string | null
          organization: string | null
          status: Database["public"]["Enums"]["scholarship_status"] | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          deadline?: string | null
          eligibility_notes?: string | null
          id?: string | null
          is_shared?: boolean | null
          link?: string | null
          name?: string | null
          notes?: string | null
          organization?: string | null
          status?: Database["public"]["Enums"]["scholarship_status"] | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          deadline?: string | null
          eligibility_notes?: string | null
          id?: string | null
          is_shared?: boolean | null
          link?: string | null
          name?: string | null
          notes?: string | null
          organization?: string | null
          status?: Database["public"]["Enums"]["scholarship_status"] | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_recent_public_posts: {
        Args: never
        Returns: {
          content: string
          created_at: string
          display_name: string
          id: string
        }[]
      }
      get_shared_scholarship: {
        Args: { _token: string }
        Returns: {
          amount: number
          created_at: string
          deadline: string
          eligibility_notes: string
          id: string
          is_shared: boolean
          link: string
          name: string
          notes: string
          organization: string
          status: Database["public"]["Enums"]["scholarship_status"]
          tags: string[]
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      scholarship_status:
        | "saved"
        | "in_progress"
        | "submitted"
        | "awarded"
        | "rejected"
        | "archived"
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
      app_role: ["admin", "user"],
      scholarship_status: [
        "saved",
        "in_progress",
        "submitted",
        "awarded",
        "rejected",
        "archived",
      ],
    },
  },
} as const

