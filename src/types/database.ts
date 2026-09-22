export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      club_sessions: {
        Row: {
          auto_requeue: boolean
          closed_at: string | null
          created_at: string
          default_match_duration_seconds: number
          id: string
          name: string
          opened_at: string | null
          status: Database['public']['Enums']['club_session_status']
          timezone: string
          updated_at: string
        }
        Insert: {
          auto_requeue?: boolean
          closed_at?: string | null
          created_at?: string
          default_match_duration_seconds?: number
          id?: string
          name: string
          opened_at?: string | null
          status?: Database['public']['Enums']['club_session_status']
          timezone?: string
          updated_at?: string
        }
        Update: {
          auto_requeue?: boolean
          closed_at?: string | null
          created_at?: string
          default_match_duration_seconds?: number
          id?: string
          name?: string
          opened_at?: string | null
          status?: Database['public']['Enums']['club_session_status']
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      courts: {
        Row: {
          name: string
          number: number
          status: Database['public']['Enums']['court_status']
          updated_at: string
        }
        Insert: {
          name: string
          number: number
          status?: Database['public']['Enums']['court_status']
          updated_at?: string
        }
        Update: {
          name?: string
          number?: number
          status?: Database['public']['Enums']['court_status']
          updated_at?: string
        }
        Relationships: []
      }
      match_players: {
        Row: {
          created_at: string
          match_id: string
          player_id: string
          queue_entry_id: string
          released_at: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          match_id: string
          player_id: string
          queue_entry_id: string
          released_at?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          match_id?: string
          player_id?: string
          queue_entry_id?: string
          released_at?: string | null
          session_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          called_at: string
          court_number: number
          created_at: string
          duration_seconds: number
          ended_at: string | null
          id: string
          requeued_on_completion: boolean | null
          session_id: string
          started_at: string | null
          status: Database['public']['Enums']['match_status']
          updated_at: string
        }
        Insert: {
          called_at?: string
          court_number: number
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          requeued_on_completion?: boolean | null
          session_id: string
          started_at?: string | null
          status?: Database['public']['Enums']['match_status']
          updated_at?: string
        }
        Update: {
          called_at?: string
          court_number?: number
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          requeued_on_completion?: boolean | null
          session_id?: string
          started_at?: string | null
          status?: Database['public']['Enums']['match_status']
          updated_at?: string
        }
        Relationships: []
      }
      player_identities: {
        Row: {
          auth_user_id: string
          created_at: string
          player_id: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          player_id: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          player_id?: string
        }
        Relationships: []
      }
      profile_link_requests: {
        Row: {
          created_at: string
          id: string
          requester_auth_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_player_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_auth_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_player_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_auth_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_player_id?: string
        }
        Relationships: []
      }
      member_payment_statuses: {
        Row: {
          is_paid: boolean
          player_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          is_paid?: boolean
          player_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          is_paid?: boolean
          player_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      member_requests: {
        Row: {
          auth_user_id: string
          created_at: string
          display_name: string | null
          drexel_user_id: string
          id: string
          player_id: string | null
          rejection_reason: string | null
          request_type: Database['public']['Enums']['member_request_type']
          requested_skill_level: Database['public']['Enums']['skill_level'] | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database['public']['Enums']['member_request_status']
        }
        Insert: {
          auth_user_id: string
          display_name?: string | null
          drexel_user_id: string
          id?: string
          player_id?: string | null
          rejection_reason?: string | null
          request_type: Database['public']['Enums']['member_request_type']
          requested_skill_level?: Database['public']['Enums']['skill_level'] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database['public']['Enums']['member_request_status']
        }
        Update: {
          auth_user_id?: string
          display_name?: string | null
          drexel_user_id?: string
          id?: string
          player_id?: string | null
          rejection_reason?: string | null
          request_type?: Database['public']['Enums']['member_request_type']
          requested_skill_level?: Database['public']['Enums']['skill_level'] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database['public']['Enums']['member_request_status']
        }
        Relationships: []
      }
      players: {
        Row: {
          created_at: string
          display_name: string
          drexel_user_id: string | null
          id: string
          is_archived: boolean
          skill_level: Database['public']['Enums']['skill_level']
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          drexel_user_id?: string | null
          id?: string
          is_archived?: boolean
          skill_level: Database['public']['Enums']['skill_level']
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          drexel_user_id?: string | null
          id?: string
          is_archived?: boolean
          skill_level?: Database['public']['Enums']['skill_level']
          updated_at?: string
        }
        Relationships: []
      }
      queue_entries: {
        Row: {
          called_at: string | null
          created_at: string
          ended_at: string | null
          id: string
          player_id: string
          queued_at: string
          session_id: string
          started_at: string | null
          status: Database['public']['Enums']['queue_status']
          updated_at: string
        }
        Insert: {
          called_at?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          player_id: string
          queued_at?: string
          session_id: string
          started_at?: string | null
          status?: Database['public']['Enums']['queue_status']
          updated_at?: string
        }
        Update: {
          called_at?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          player_id?: string
          queued_at?: string
          session_id?: string
          started_at?: string | null
          status?: Database['public']['Enums']['queue_status']
          updated_at?: string
        }
        Relationships: []
      }
      session_players: {
        Row: {
          games_played: number
          is_active: boolean
          joined_at: string
          last_match_ended_at: string | null
          player_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          games_played?: number
          is_active?: boolean
          joined_at?: string
          last_match_ended_at?: string | null
          player_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          games_played?: number
          is_active?: boolean
          joined_at?: string
          last_match_ended_at?: string | null
          player_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_remove_player: {
        Args: { p_player_id: string; p_session_id: string }
        Returns: string
      }
      admin_update_player: {
        Args: {
          p_display_name: string
          p_player_id: string
          p_skill_level: Database['public']['Enums']['skill_level']
        }
        Returns: undefined
      }
      assign_players_to_court: {
        Args: { p_court_number: number; p_player_ids: string[] }
        Returns: string
      }
      cancel_called_match: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      close_club_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      create_club_session: {
        Args: { p_auto_requeue?: boolean; p_name: string }
        Returns: string
      }
      end_playing_match: {
        Args: { p_match_id: string; p_requeue_players?: boolean }
        Returns: undefined
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      join_current_queue: {
        Args: {
          p_display_name: string
          p_skill_level: Database['public']['Enums']['skill_level']
        }
        Returns: {
          player_id: string
          queue_entry_id: string
          session_id: string
          status: Database['public']['Enums']['queue_status']
        }[]
      }
      leave_current_queue: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      list_members_for_admin: {
        Args: { p_search?: string | null }
        Returns: {
          created_at: string
          display_name: string
          is_archived: boolean
          is_paid: boolean
          last_joined_at: string | null
          player_id: string
          skill_level: Database['public']['Enums']['skill_level']
        }[]
      }
      open_club_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      set_court_enabled: {
        Args: { p_court_number: number; p_enabled: boolean }
        Returns: Database['public']['Enums']['court_status']
      }
      search_member_profiles: {
        Args: { p_query: string }
        Returns: {
          display_name: string
          last_joined_at: string | null
          player_id: string
          skill_level: Database['public']['Enums']['skill_level']
        }[]
      }
      set_member_payment_status: {
        Args: { p_is_paid: boolean; p_player_id: string }
        Returns: undefined
      }
      set_session_match_duration: {
        Args: { p_duration_seconds: number; p_session_id: string }
        Returns: undefined
      }
      request_profile_link: {
        Args: { p_player_id: string }
        Returns: string
      }
      get_my_profile_link_request: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          reviewed_at: string | null
          status: string
          target_player_id: string
        }[]
      }
      get_my_member_request: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          display_name: string | null
          drexel_user_id: string
          id: string
          rejection_reason: string | null
          request_type: Database['public']['Enums']['member_request_type']
          requested_skill_level: Database['public']['Enums']['skill_level'] | null
          status: Database['public']['Enums']['member_request_status']
        }[]
      }
      find_member_by_drexel_user_id: {
        Args: { p_drexel_user_id: string }
        Returns: { display_name: string; player_id: string; skill_level: Database['public']['Enums']['skill_level'] }[]
      }
      submit_create_profile_request: {
        Args: { p_display_name: string; p_drexel_user_id: string; p_skill_level: Database['public']['Enums']['skill_level'] }
        Returns: string
      }
      submit_device_link_request: { Args: { p_drexel_user_id: string }; Returns: string }
      submit_skill_change_request: { Args: { p_skill_level: Database['public']['Enums']['skill_level'] }; Returns: string }
      list_member_requests_for_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string; current_skill_level: Database['public']['Enums']['skill_level'] | null; display_name: string | null;
          drexel_user_id: string; id: string; player_id: string | null; request_type: Database['public']['Enums']['member_request_type']; requested_skill_level: Database['public']['Enums']['skill_level'] | null
        }[]
      }
      admin_review_member_request: { Args: { p_approve: boolean; p_rejection_reason?: string | null; p_request_id: string }; Returns: undefined }
      list_profile_link_requests: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          status: string
          target_display_name: string
          target_player_id: string
          target_skill_level: Database['public']['Enums']['skill_level']
        }[]
      }
      review_profile_link_request: {
        Args: { p_approve: boolean; p_request_id: string }
        Returns: undefined
      }
      admin_delete_member: {
        Args: { p_player_id: string }
        Returns: undefined
      }
      admin_set_member_archived: {
        Args: { p_archived: boolean; p_player_id: string }
        Returns: undefined
      }
      start_called_match: {
        Args: { p_match_id: string }
        Returns: undefined
      }
    }
    Enums: {
      club_session_status: 'draft' | 'open' | 'closed'
      court_status: 'disabled' | 'available' | 'called' | 'playing'
      match_status: 'called' | 'playing' | 'completed' | 'cancelled'
      queue_status: 'waiting' | 'called' | 'playing' | 'completed' | 'left' | 'removed'
      skill_level: 'beginner' | 'intermediate' | 'advanced'
      member_request_status: 'pending' | 'approved' | 'rejected'
      member_request_type: 'create_profile' | 'link_new_device' | 'change_skill_level'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer Row
    }
    ? Row
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer Row
      }
      ? Row
      : never
    : never

export type Enums<PublicEnumName extends keyof PublicSchema['Enums']> =
  PublicSchema['Enums'][PublicEnumName]
