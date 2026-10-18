export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "super_admin" | "club_admin";
export type ClubStatus = "pending" | "approved" | "rejected";
export type PlayType = "singles" | "doubles" | "mixed_doubles" | "open_doubles";
export type DoublesCategory = "mens" | "womens" | null;
export type PartnerMode = "fixed" | "rotating";
export type Gender = "male" | "female" | "other";
export type SessionStatus = "scheduled" | "active" | "completed" | "cancelled";
export type TournamentStatus = "draft" | "registration" | "active" | "completed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          full_name?: string | null;
          updated_at?: string;
        };
      };
      clubs: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          location: string | null;
          contact_email: string;
          contact_phone: string | null;
          status: ClubStatus;
          admin_id: string;
          approved_at: string | null;
          approved_by: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          location?: string | null;
          contact_email: string;
          contact_phone?: string | null;
          status?: ClubStatus;
          admin_id: string;
          approved_at?: string | null;
          approved_by?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          location?: string | null;
          contact_email?: string;
          contact_phone?: string | null;
          status?: ClubStatus;
          approved_at?: string | null;
          approved_by?: string | null;
          rejection_reason?: string | null;
          updated_at?: string;
        };
      };
      members: {
        Row: {
          id: string;
          club_id: string;
          full_name: string;
          nickname: string | null;
          phone: string | null;
          gender: Gender;
          is_guest: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          full_name: string;
          nickname?: string | null;
          phone?: string | null;
          gender: Gender;
          is_guest?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          nickname?: string | null;
          phone?: string | null;
          gender?: Gender;
          is_guest?: boolean;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      open_plays: {
        Row: {
          id: string;
          club_id: string;
          name: string;
          play_type: PlayType;
          doubles_category: DoublesCategory;
          partner_mode: PartnerMode | null;
          date_time: string;
          location: string;
          num_courts: number;
          status: SessionStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          name: string;
          play_type: PlayType;
          doubles_category?: DoublesCategory;
          partner_mode?: PartnerMode | null;
          date_time: string;
          location: string;
          num_courts: number;
          status?: SessionStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          play_type?: PlayType;
          doubles_category?: DoublesCategory;
          partner_mode?: PartnerMode | null;
          date_time?: string;
          location?: string;
          num_courts?: number;
          status?: SessionStatus;
          updated_at?: string;
        };
      };
      open_play_participants: {
        Row: {
          id: string;
          open_play_id: string;
          member_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          open_play_id: string;
          member_id: string;
          joined_at?: string;
        };
        Update: {
          joined_at?: string;
        };
      };
      open_play_matches: {
        Row: {
          id: string;
          open_play_id: string;
          court_number: number;
          round_number: number;
          team1_player1: string;
          team1_player2: string | null;
          team2_player1: string;
          team2_player2: string | null;
          team1_score: number | null;
          team2_score: number | null;
          winner_team: 1 | 2 | null;
          played_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          open_play_id: string;
          court_number: number;
          round_number: number;
          team1_player1: string;
          team1_player2?: string | null;
          team2_player1: string;
          team2_player2?: string | null;
          team1_score?: number | null;
          team2_score?: number | null;
          winner_team?: 1 | 2 | null;
          played_at?: string | null;
          created_at?: string;
        };
        Update: {
          team1_score?: number | null;
          team2_score?: number | null;
          winner_team?: 1 | 2 | null;
          played_at?: string | null;
        };
      };
      tournaments: {
        Row: {
          id: string;
          club_id: string;
          name: string;
          status: TournamentStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          name: string;
          status?: TournamentStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          status?: TournamentStatus;
          updated_at?: string;
        };
      };
      tournament_events: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          play_type: PlayType;
          doubles_category: DoublesCategory;
          date_time: string;
          location: string;
          num_courts: number;
          num_pools: number;
          status: SessionStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name: string;
          play_type: PlayType;
          doubles_category?: DoublesCategory;
          date_time: string;
          location: string;
          num_courts: number;
          num_pools: number;
          status?: SessionStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          play_type?: PlayType;
          doubles_category?: DoublesCategory;
          date_time?: string;
          location?: string;
          num_courts?: number;
          num_pools?: number;
          status?: SessionStatus;
          updated_at?: string;
        };
      };
      tournament_registrations: {
        Row: {
          id: string;
          event_id: string;
          member_id: string;
          partner_id: string | null;
          pool_number: number | null;
          registered_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          member_id: string;
          partner_id?: string | null;
          pool_number?: number | null;
          registered_at?: string;
        };
        Update: {
          partner_id?: string | null;
          pool_number?: number | null;
        };
      };
      tournament_matches: {
        Row: {
          id: string;
          event_id: string;
          pool_number: number | null;
          court_number: number;
          round_number: number;
          team1_player1: string;
          team1_player2: string | null;
          team2_player1: string;
          team2_player2: string | null;
          team1_score: number | null;
          team2_score: number | null;
          winner_team: 1 | 2 | null;
          is_playoff: boolean;
          played_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          pool_number?: number | null;
          court_number: number;
          round_number: number;
          team1_player1: string;
          team1_player2?: string | null;
          team2_player1: string;
          team2_player2?: string | null;
          team1_score?: number | null;
          team2_score?: number | null;
          winner_team?: 1 | 2 | null;
          is_playoff?: boolean;
          played_at?: string | null;
          created_at?: string;
        };
        Update: {
          team1_score?: number | null;
          team2_score?: number | null;
          winner_team?: 1 | 2 | null;
          played_at?: string | null;
        };
      };
      player_stats: {
        Row: {
          id: string;
          member_id: string;
          play_type: PlayType;
          wins: number;
          losses: number;
          points_earned: number;
          points_lost: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          play_type: PlayType;
          wins?: number;
          losses?: number;
          points_earned?: number;
          points_lost?: number;
          updated_at?: string;
        };
        Update: {
          wins?: number;
          losses?: number;
          points_earned?: number;
          points_lost?: number;
          updated_at?: string;
        };
      };
      titles: {
        Row: {
          id: string;
          member_id: string;
          tournament_event_id: string;
          title_name: string;
          awarded_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          tournament_event_id: string;
          title_name: string;
          awarded_at?: string;
        };
        Update: {
          title_name?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      club_status: ClubStatus;
      play_type: PlayType;
      doubles_category: "mens" | "womens";
      partner_mode: PartnerMode;
      gender: Gender;
      session_status: SessionStatus;
      tournament_status: TournamentStatus;
    };
  };
}
