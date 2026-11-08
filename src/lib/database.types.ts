// Généré depuis le projet Supabase (MCP generate_typescript_types / `npm run db:types`).
// Ne pas modifier à la main : régénérer après chaque migration.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          created_at: string
          id: number
          item_id: string
          jour: string
          points: number
          resultat: Database["public"]["Enums"]["activity_result"]
          session_id: string | null
          type: Database["public"]["Enums"]["activity_mode"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          item_id: string
          jour?: string
          points?: number
          resultat: Database["public"]["Enums"]["activity_result"]
          session_id?: string | null
          type: Database["public"]["Enums"]["activity_mode"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          item_id?: string
          jour?: string
          points?: number
          resultat?: Database["public"]["Enums"]["activity_result"]
          session_id?: string | null
          type?: Database["public"]["Enums"]["activity_mode"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      card_states: {
        Row: {
          due_date: string
          flashcard_id: string
          last_reviewed: string
          palier: number
          user_id: string
        }
        Insert: {
          due_date: string
          flashcard_id: string
          last_reviewed?: string
          palier: number
          user_id: string
        }
        Update: {
          due_date?: string
          flashcard_id?: string
          last_reviewed?: string
          palier?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_states_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          id: string
          nom: string
          ordre: number
          subject_id: string
        }
        Insert: {
          id?: string
          nom: string
          ordre?: number
          subject_id: string
        }
        Update: {
          id?: string
          nom?: string
          ordre?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          date: string
          id: string
          nom: string
          subject_id: string
        }
        Insert: {
          date: string
          id?: string
          nom: string
          subject_id: string
        }
        Update: {
          date?: string
          id?: string
          nom?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_todo: {
        Row: {
          added_at: string
          exercise_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          exercise_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          exercise_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_todo_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_todo_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          chapter_id: string
          correction: string
          created_at: string
          duree_min: number
          enonce: string
          id: string
          ordre: number
          statut: Database["public"]["Enums"]["content_status"]
          titre: string
        }
        Insert: {
          chapter_id: string
          correction: string
          created_at?: string
          duree_min: number
          enonce: string
          id?: string
          ordre?: number
          statut?: Database["public"]["Enums"]["content_status"]
          titre: string
        }
        Update: {
          chapter_id?: string
          correction?: string
          created_at?: string
          duree_min?: number
          enonce?: string
          id?: string
          ordre?: number
          statut?: Database["public"]["Enums"]["content_status"]
          titre?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapter_progress"
            referencedColumns: ["chapter_id"]
          },
          {
            foreignKeyName: "exercises_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_items: {
        Row: {
          created_at: string
          event_data: Json | null
          id: string
          kind: Database["public"]["Enums"]["feed_kind"]
          parent_id: string | null
          texte: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          id?: string
          kind: Database["public"]["Enums"]["feed_kind"]
          parent_id?: string | null
          texte: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          id?: string
          kind?: Database["public"]["Enums"]["feed_kind"]
          parent_id?: string | null
          texte?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "feed_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          ordre: number
          recto: string
          statut: Database["public"]["Enums"]["content_status"]
          verso: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          ordre?: number
          recto: string
          statut?: Database["public"]["Enums"]["content_status"]
          verso: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          ordre?: number
          recto?: string
          statut?: Database["public"]["Enums"]["content_status"]
          verso?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapter_progress"
            referencedColumns: ["chapter_id"]
          },
          {
            foreignKeyName: "flashcards_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          emoji: string | null
          feed_item_id: string | null
          id: string
          kind: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          emoji?: string | null
          feed_item_id?: string | null
          id?: string
          kind: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          emoji?: string | null
          feed_item_id?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "feed_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          pp_id: string
          pseudo: string
        }
        Insert: {
          created_at?: string
          id: string
          is_admin?: boolean
          pp_id?: string
          pseudo: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          pp_id?: string
          pseudo?: string
        }
        Relationships: []
      }
      qcm_answers: {
        Row: {
          answered_at: string
          choix: string[]
          correct: boolean
          points: number
          question_id: string
          session_id: string
          user_id: string
        }
        Insert: {
          answered_at?: string
          choix: string[]
          correct: boolean
          points?: number
          question_id: string
          session_id: string
          user_id: string
        }
        Update: {
          answered_at?: string
          choix?: string[]
          correct?: boolean
          points?: number
          question_id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qcm_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qcm_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qcm_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_answers: {
        Row: {
          bonnes_reponses: string[]
          explication: string | null
          question_id: string
        }
        Insert: {
          bonnes_reponses: string[]
          explication?: string | null
          question_id: string
        }
        Update: {
          bonnes_reponses?: string[]
          explication?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          chapter_id: string
          choix: Json
          created_at: string
          enonce: string
          id: string
          ordre: number
          statut: Database["public"]["Enums"]["content_status"]
        }
        Insert: {
          chapter_id: string
          choix: Json
          created_at?: string
          enonce: string
          id?: string
          ordre?: number
          statut?: Database["public"]["Enums"]["content_status"]
        }
        Update: {
          chapter_id?: string
          choix?: Json
          created_at?: string
          enonce?: string
          id?: string
          ordre?: number
          statut?: Database["public"]["Enums"]["content_status"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapter_progress"
            referencedColumns: ["chapter_id"]
          },
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          feed_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          feed_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          feed_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "feed_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          chapter_id: string | null
          ended_at: string | null
          id: string
          mode: Database["public"]["Enums"]["activity_mode"]
          points: number
          score: number
          started_at: string
          user_id: string
          variante: Database["public"]["Enums"]["session_variant"] | null
        }
        Insert: {
          chapter_id?: string | null
          ended_at?: string | null
          id?: string
          mode: Database["public"]["Enums"]["activity_mode"]
          points?: number
          score?: number
          started_at?: string
          user_id: string
          variante?: Database["public"]["Enums"]["session_variant"] | null
        }
        Update: {
          chapter_id?: string | null
          ended_at?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["activity_mode"]
          points?: number
          score?: number
          started_at?: string
          user_id?: string
          variante?: Database["public"]["Enums"]["session_variant"] | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapter_progress"
            referencedColumns: ["chapter_id"]
          },
          {
            foreignKeyName: "sessions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          id: string
          nom: string
          ordre: number
        }
        Insert: {
          id?: string
          nom: string
          ordre?: number
        }
        Update: {
          id?: string
          nom?: string
          ordre?: number
        }
        Relationships: []
      }
    }
    Views: {
      chapter_progress: {
        Row: {
          chapter_id: string | null
          progression: number | null
          questions_reussies: number | null
          subject_id: string | null
          total_questions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      end_session: {
        Args: { p_session_id: string }
        Returns: {
          chapter_id: string | null
          ended_at: string | null
          id: string
          mode: Database["public"]["Enums"]["activity_mode"]
          points: number
          score: number
          started_at: string
          user_id: string
          variante: Database["public"]["Enums"]["session_variant"] | null
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      feed_page: {
        Args: { p_before?: string; p_limit?: number }
        Returns: {
          created_at: string
          event_data: Json
          id: string
          kind: Database["public"]["Enums"]["feed_kind"]
          pp_id: string
          pseudo: string
          reactions: Json
          replies: Json
          texte: string
          user_id: string
        }[]
      }
      flashcard_overview: {
        Args: never
        Returns: {
          chapter_id: string
          chapter_nom: string
          due_count: number
          new_count: number
          subject_id: string
          subject_nom: string
          total_count: number
        }[]
      }
      flashcard_queue: {
        Args: { p_chapter_id?: string; p_new_limit?: number }
        Returns: {
          chapter_id: string
          chapter_nom: string
          due_date: string
          flashcard_id: string
          is_new: boolean
          next_a_revoir: number
          next_bien: number
          next_facile: number
          palier: number
          recto: string
          subject_nom: string
          verso: string
        }[]
      }
      leaderboard: {
        Args: { p_scope?: string; p_week_of?: string }
        Returns: {
          points: number
          pp_id: string
          pseudo: string
          rang: number
          user_id: string
        }[]
      }
      leaderboard_moves: {
        Args: { p_scope?: string }
        Returns: {
          rang_veille: number
          user_id: string
        }[]
      }
      mark_notifications_read: { Args: { p_ids?: string[] }; Returns: number }
      my_notifications: {
        Args: { p_limit?: number }
        Returns: {
          actor_pp_id: string
          actor_pseudo: string
          created_at: string
          emoji: string
          id: string
          item_id: string
          item_texte: string
          kind: string
          post_id: string
          post_kind: Database["public"]["Enums"]["feed_kind"]
          post_texte: string
          read_at: string
        }[]
      }
      my_revision_time: {
        Args: never
        Returns: {
          jour: string
          minutes_exo: number
          nb_cartes: number
          nb_qcm: number
          subject_id: string
        }[]
      }
      my_session_history: {
        Args: { p_before?: string; p_limit?: number }
        Returns: {
          chapter_nom: string
          ended_at: string
          id: string
          minutes_exo: number
          mode: Database["public"]["Enums"]["activity_mode"]
          nb_items: number
          nb_reussis: number
          points: number
          resultat_exo: Database["public"]["Enums"]["activity_result"]
          started_at: string
          subject_nom: string
          variante: Database["public"]["Enums"]["session_variant"]
        }[]
      }
      paris_week_start: { Args: { p_at?: string }; Returns: string }
      qcm_questions: {
        Args: {
          p_chapter_id: string
          p_limit?: number
          p_question_ids?: string[]
        }
        Returns: {
          choix: Json
          enonce: string
          id: string
          multiple: boolean
        }[]
      }
      qcm_session_review: { Args: { p_session_id: string }; Returns: Json }
      review_flashcard: {
        Args: {
          p_flashcard_id: string
          p_note: Database["public"]["Enums"]["activity_result"]
          p_session_id: string
        }
        Returns: Json
      }
      start_session: {
        Args: {
          p_chapter_id: string
          p_mode: Database["public"]["Enums"]["activity_mode"]
          p_variante?: Database["public"]["Enums"]["session_variant"]
        }
        Returns: string
      }
      submit_exercise: {
        Args: {
          p_exercise_id: string
          p_resultat: Database["public"]["Enums"]["activity_result"]
          p_session_id: string
        }
        Returns: Json
      }
      submit_qcm_answer: {
        Args: { p_choix: string[]; p_question_id: string; p_session_id: string }
        Returns: Json
      }
    }
    Enums: {
      activity_mode: "qcm" | "flashcard" | "exo"
      activity_result:
        | "correct"
        | "incorrect"
        | "a_revoir"
        | "bien"
        | "facile"
        | "reussi"
        | "partiel"
        | "a_refaire"
      content_status: "brouillon" | "publie"
      feed_kind: "post" | "event" | "reponse"
      session_variant: "entrainement" | "examen"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_mode: ["qcm", "flashcard", "exo"],
      activity_result: [
        "correct",
        "incorrect",
        "a_revoir",
        "bien",
        "facile",
        "reussi",
        "partiel",
        "a_refaire",
      ],
      content_status: ["brouillon", "publie"],
      feed_kind: ["post", "event", "reponse"],
      session_variant: ["entrainement", "examen"],
    },
  },
} as const
