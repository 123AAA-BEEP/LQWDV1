// =============================================================================
// AUTO-GENERATED database types — DO NOT EDIT BY HAND.
// -----------------------------------------------------------------------------
// Source of truth: the live Supabase project "LIQWD DB V1"
// (project ref mzdqlhopxfknwqxxuonn). This reflects the FULL live schema, which
// is ahead of supabase/migrations/ in this repo. Regenerate with the Supabase
// MCP generate_typescript_types or `supabase gen types typescript`.
// Last generated: 2026-06-19.
//
// The hand-written src/lib/types.ts remains for app-facing view/DTO shapes;
// prefer THIS file's Database types for table row/insert/update typing.
// =============================================================================

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      brokerages: {
        Row: {
          brokerage_logo_url: string | null
          brokerage_name: string
          brokerage_slug: string
          city: string | null
          created_at: string
          id: string
          is_verified: boolean
          phone: string | null
          province: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          brokerage_logo_url?: string | null
          brokerage_name: string
          brokerage_slug: string
          city?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          phone?: string | null
          province?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          brokerage_logo_url?: string | null
          brokerage_name?: string
          brokerage_slug?: string
          city?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          phone?: string | null
          province?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      buyer_mandates: {
        Row: {
          baths_min: number | null
          beds_min: number | null
          buyer_label: string | null
          condition: string | null
          created_at: string
          deposit_ready: boolean
          financing_type: string | null
          id: string
          id_verified: boolean
          lender: string | null
          location_areas: string | null
          location_radius_km: number | null
          lot_notes: string | null
          must_haves: string | null
          nice_to_haves: string | null
          pre_approval_amount: number | null
          pre_approval_expiry: string | null
          pre_approval_status: string
          price_max: number | null
          price_min: number | null
          proof_of_funds: boolean
          property_type: string | null
          rep_agreement_signed: boolean
          size_sqft_max: number | null
          size_sqft_min: number | null
          status: string
          submitted_by_user_id: string
          timeline: string | null
          updated_at: string
        }
        Insert: {
          baths_min?: number | null
          beds_min?: number | null
          buyer_label?: string | null
          condition?: string | null
          created_at?: string
          deposit_ready?: boolean
          financing_type?: string | null
          id?: string
          id_verified?: boolean
          lender?: string | null
          location_areas?: string | null
          location_radius_km?: number | null
          lot_notes?: string | null
          must_haves?: string | null
          nice_to_haves?: string | null
          pre_approval_amount?: number | null
          pre_approval_expiry?: string | null
          pre_approval_status?: string
          price_max?: number | null
          price_min?: number | null
          proof_of_funds?: boolean
          property_type?: string | null
          rep_agreement_signed?: boolean
          size_sqft_max?: number | null
          size_sqft_min?: number | null
          status?: string
          submitted_by_user_id: string
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          baths_min?: number | null
          beds_min?: number | null
          buyer_label?: string | null
          condition?: string | null
          created_at?: string
          deposit_ready?: boolean
          financing_type?: string | null
          id?: string
          id_verified?: boolean
          lender?: string | null
          location_areas?: string | null
          location_radius_km?: number | null
          lot_notes?: string | null
          must_haves?: string | null
          nice_to_haves?: string | null
          pre_approval_amount?: number | null
          pre_approval_expiry?: string | null
          pre_approval_status?: string
          price_max?: number | null
          price_min?: number | null
          proof_of_funds?: boolean
          property_type?: string | null
          rep_agreement_signed?: boolean
          size_sqft_max?: number | null
          size_sqft_min?: number | null
          status?: string
          submitted_by_user_id?: string
          timeline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_mandates_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "buyer_mandates_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_mandates_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      deal_rfp_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by_user_id: string | null
          profile_id: string
          rfp_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by_user_id?: string | null
          profile_id: string
          rfp_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by_user_id?: string | null
          profile_id?: string
          rfp_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_rfp_invitations_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "deal_rfp_invitations_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rfp_invitations_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "deal_rfp_invitations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "deal_rfp_invitations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rfp_invitations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "deal_rfp_invitations_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "deal_rfps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rfp_invitations_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "deal_rfps_realtor_view"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_rfp_proposals: {
        Row: {
          admin_notes: string | null
          conditions: string | null
          created_at: string
          id: string
          narrative: string | null
          price_offer: number | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          rfp_id: string
          status: string
          submitted_by_user_id: string
          units: number | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          conditions?: string | null
          created_at?: string
          id?: string
          narrative?: string | null
          price_offer?: number | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          rfp_id: string
          status?: string
          submitted_by_user_id: string
          units?: number | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          conditions?: string | null
          created_at?: string
          id?: string
          narrative?: string | null
          price_offer?: number | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          rfp_id?: string
          status?: string
          submitted_by_user_id?: string
          units?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_rfp_proposals_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "deal_rfp_proposals_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rfp_proposals_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "deal_rfp_proposals_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "deal_rfps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rfp_proposals_rfp_id_fkey"
            columns: ["rfp_id"]
            isOneToOne: false
            referencedRelation: "deal_rfps_realtor_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rfp_proposals_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "deal_rfp_proposals_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rfp_proposals_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      deal_rfps: {
        Row: {
          brief: string | null
          created_at: string
          created_by_user_id: string
          deadline_at: string | null
          deal_side: string
          hidden_fields: string[]
          id: string
          project_id: string | null
          reveal_identity: boolean
          rfp_type: string
          status: string
          target_price: number | null
          target_units: number | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          brief?: string | null
          created_at?: string
          created_by_user_id: string
          deadline_at?: string | null
          deal_side: string
          hidden_fields?: string[]
          id?: string
          project_id?: string | null
          reveal_identity?: boolean
          rfp_type: string
          status?: string
          target_price?: number | null
          target_units?: number | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          brief?: string | null
          created_at?: string
          created_by_user_id?: string
          deadline_at?: string | null
          deal_side?: string
          hidden_fields?: string[]
          id?: string
          project_id?: string | null
          reveal_identity?: boolean
          rfp_type?: string
          status?: string
          target_price?: number | null
          target_units?: number | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_rfps_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "deal_rfps_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rfps_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "deal_rfps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rfps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rfps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "deal_rfps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
        ]
      }
      mandate_connect_requests: {
        Row: {
          created_at: string
          developer_user_id: string
          id: string
          mandate_id: string
          message: string | null
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          developer_user_id: string
          id?: string
          mandate_id: string
          message?: string | null
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          developer_user_id?: string
          id?: string
          mandate_id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mandate_connect_requests_developer_user_id_fkey"
            columns: ["developer_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "mandate_connect_requests_developer_user_id_fkey"
            columns: ["developer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mandate_connect_requests_developer_user_id_fkey"
            columns: ["developer_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "mandate_connect_requests_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mandate_connect_requests_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          bid_id: string | null
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          opportunity_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          bid_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          opportunity_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          bid_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          opportunity_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "opportunity_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_market_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      opportunities: {
        Row: {
          address_full: string | null
          admin_notes: string | null
          asking_price: number | null
          city: string | null
          commission_percent: number | null
          created_at: string
          deal_type: string
          developer_id: string
          hidden_fields: string[]
          id: string
          incentive_amount: number | null
          incentive_notes: string | null
          internal_notes: string | null
          price_basis: string
          province: string | null
          published_at: string | null
          status: string
          summary: string | null
          title: string
          unit_count: number | null
          updated_at: string
        }
        Insert: {
          address_full?: string | null
          admin_notes?: string | null
          asking_price?: number | null
          city?: string | null
          commission_percent?: number | null
          created_at?: string
          deal_type?: string
          developer_id: string
          hidden_fields?: string[]
          id?: string
          incentive_amount?: number | null
          incentive_notes?: string | null
          internal_notes?: string | null
          price_basis?: string
          province?: string | null
          published_at?: string | null
          status?: string
          summary?: string | null
          title: string
          unit_count?: number | null
          updated_at?: string
        }
        Update: {
          address_full?: string | null
          admin_notes?: string | null
          asking_price?: number | null
          city?: string | null
          commission_percent?: number | null
          created_at?: string
          deal_type?: string
          developer_id?: string
          hidden_fields?: string[]
          id?: string
          incentive_amount?: number | null
          incentive_notes?: string | null
          internal_notes?: string | null
          price_basis?: string
          province?: string | null
          published_at?: string | null
          status?: string
          summary?: string | null
          title?: string
          unit_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "opportunities_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      opportunity_bids: {
        Row: {
          bid_commission_percent: number | null
          bid_incentive_amount: number | null
          bid_price: number | null
          created_at: string
          developer_response: string | null
          id: string
          message: string | null
          opportunity_id: string
          realtor_id: string
          responded_at: string | null
          responded_by_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          bid_commission_percent?: number | null
          bid_incentive_amount?: number | null
          bid_price?: number | null
          created_at?: string
          developer_response?: string | null
          id?: string
          message?: string | null
          opportunity_id: string
          realtor_id: string
          responded_at?: string | null
          responded_by_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          bid_commission_percent?: number | null
          bid_incentive_amount?: number | null
          bid_price?: number | null
          created_at?: string
          developer_response?: string | null
          id?: string
          message?: string | null
          opportunity_id?: string
          realtor_id?: string
          responded_at?: string | null
          responded_by_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_bids_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_bids_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_market_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_bids_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "opportunity_bids_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_bids_realtor_id_fkey"
            columns: ["realtor_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "opportunity_bids_responded_by_user_id_fkey"
            columns: ["responded_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "opportunity_bids_responded_by_user_id_fkey"
            columns: ["responded_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_bids_responded_by_user_id_fkey"
            columns: ["responded_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      opportunity_units: {
        Row: {
          address_full: string | null
          asking_price: number | null
          baths: number | null
          beds: number | null
          created_at: string
          id: string
          internal_notes: string | null
          label: string
          opportunity_id: string
          sort_order: number
          sqft: number | null
          status: string
          unit_type: string | null
          updated_at: string
        }
        Insert: {
          address_full?: string | null
          asking_price?: number | null
          baths?: number | null
          beds?: number | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          label: string
          opportunity_id: string
          sort_order?: number
          sqft?: number | null
          status?: string
          unit_type?: string | null
          updated_at?: string
        }
        Update: {
          address_full?: string | null
          asking_price?: number | null
          baths?: number | null
          beds?: number | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          label?: string
          opportunity_id?: string
          sort_order?: number
          sqft?: number | null
          status?: string
          unit_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_units_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_units_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_market_view"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_suggestions: {
        Row: {
          admin_notes: string | null
          body: string | null
          category: string
          contact_ok: boolean
          created_at: string
          id: string
          open_to_collaborate: boolean
          public_response: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          submitted_by_profile_id: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          body?: string | null
          category?: string
          contact_ok?: boolean
          created_at?: string
          id?: string
          open_to_collaborate?: boolean
          public_response?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          submitted_by_profile_id: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          body?: string | null
          category?: string
          contact_ok?: boolean
          created_at?: string
          id?: string
          open_to_collaborate?: boolean
          public_response?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          submitted_by_profile_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_suggestions_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "platform_suggestions_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_suggestions_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "platform_suggestions_submitted_by_profile_id_fkey"
            columns: ["submitted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "platform_suggestions_submitted_by_profile_id_fkey"
            columns: ["submitted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_suggestions_submitted_by_profile_id_fkey"
            columns: ["submitted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio_short: string | null
          brokerage_id: string | null
          brokerage_name: string | null
          created_at: string
          developer_mandate_access: boolean
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          is_public_profile_enabled: boolean
          last_name: string | null
          logo_url: string | null
          mandate_connect_credits: number
          phone: string | null
          plan: string
          pro_until: string | null
          realtor_tier: string
          reco_expiry: string | null
          reco_registration_number: string | null
          reco_verification_method: string | null
          reco_verified_at: string | null
          referral_code: string | null
          referred_by_profile_id: string | null
          role: string
          service_area: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          title: string | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          avatar_url?: string | null
          bio_short?: string | null
          brokerage_id?: string | null
          brokerage_name?: string | null
          created_at?: string
          developer_mandate_access?: boolean
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          is_public_profile_enabled?: boolean
          last_name?: string | null
          logo_url?: string | null
          mandate_connect_credits?: number
          phone?: string | null
          plan?: string
          pro_until?: string | null
          realtor_tier?: string
          reco_expiry?: string | null
          reco_registration_number?: string | null
          reco_verification_method?: string | null
          reco_verified_at?: string | null
          referral_code?: string | null
          referred_by_profile_id?: string | null
          role?: string
          service_area?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          title?: string | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          avatar_url?: string | null
          bio_short?: string | null
          brokerage_id?: string | null
          brokerage_name?: string | null
          created_at?: string
          developer_mandate_access?: boolean
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_public_profile_enabled?: boolean
          last_name?: string | null
          logo_url?: string | null
          mandate_connect_credits?: number
          phone?: string | null
          plan?: string
          pro_until?: string | null
          realtor_tier?: string
          reco_expiry?: string | null
          reco_registration_number?: string | null
          reco_verification_method?: string | null
          reco_verified_at?: string | null
          referral_code?: string | null
          referred_by_profile_id?: string | null
          role?: string
          service_area?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          title?: string | null
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_brokerage_id_fkey"
            columns: ["brokerage_id"]
            isOneToOne: false
            referencedRelation: "brokerages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_profile_id_fkey"
            columns: ["referred_by_profile_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_profile_id_fkey"
            columns: ["referred_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_profile_id_fkey"
            columns: ["referred_by_profile_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      project_access_grants: {
        Row: {
          access_role: string
          expires_at: string | null
          granted_at: string
          granted_by_user_id: string | null
          id: string
          is_active: boolean
          project_id: string
          user_id: string
        }
        Insert: {
          access_role: string
          expires_at?: string | null
          granted_at?: string
          granted_by_user_id?: string | null
          id?: string
          is_active?: boolean
          project_id: string
          user_id: string
        }
        Update: {
          access_role?: string
          expires_at?: string | null
          granted_at?: string
          granted_by_user_id?: string | null
          id?: string
          is_active?: boolean
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_access_grants_granted_by_user_id_fkey"
            columns: ["granted_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "project_access_grants_granted_by_user_id_fkey"
            columns: ["granted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_access_grants_granted_by_user_id_fkey"
            columns: ["granted_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "project_access_grants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_access_grants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_access_grants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_access_grants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "project_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_access_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      project_broker_portals: {
        Row: {
          access_notes: string | null
          added_by_user_id: string | null
          approved_by_user_id: string | null
          created_at: string
          file_url: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          portal_name: string
          portal_type: string
          project_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          access_notes?: string | null
          added_by_user_id?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          portal_name: string
          portal_type: string
          project_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          access_notes?: string | null
          added_by_user_id?: string | null
          approved_by_user_id?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          portal_name?: string
          portal_type?: string
          project_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_broker_portals_added_by_user_id_fkey"
            columns: ["added_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "project_broker_portals_added_by_user_id_fkey"
            columns: ["added_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_broker_portals_added_by_user_id_fkey"
            columns: ["added_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "project_broker_portals_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "project_broker_portals_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_broker_portals_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "project_broker_portals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_broker_portals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_broker_portals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_broker_portals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_documents: {
        Row: {
          created_at: string
          document_type: string
          file_url: string
          id: string
          is_public: boolean
          notes: string | null
          project_id: string
          public_url: string | null
          snapshot_date: string | null
          source_type: string
          title: string
          uploaded_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_url: string
          id?: string
          is_public?: boolean
          notes?: string | null
          project_id: string
          public_url?: string | null
          snapshot_date?: string | null
          source_type: string
          title: string
          uploaded_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_url?: string
          id?: string
          is_public?: boolean
          notes?: string | null
          project_id?: string
          public_url?: string | null
          snapshot_date?: string | null
          source_type?: string
          title?: string
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_documents_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "project_documents_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      project_floorplans: {
        Row: {
          availability_status: string | null
          baths: number | null
          beds: number | null
          created_at: string
          floorplan_image_url: string | null
          id: string
          is_featured: boolean
          occupancy_text: string | null
          plan_name: string | null
          powder_rooms: number | null
          price_internal: number | null
          price_notes: string | null
          price_public: number | null
          project_id: string
          sqft_exterior: number | null
          sqft_interior: number | null
          unit_type: string | null
          updated_at: string
        }
        Insert: {
          availability_status?: string | null
          baths?: number | null
          beds?: number | null
          created_at?: string
          floorplan_image_url?: string | null
          id?: string
          is_featured?: boolean
          occupancy_text?: string | null
          plan_name?: string | null
          powder_rooms?: number | null
          price_internal?: number | null
          price_notes?: string | null
          price_public?: number | null
          project_id: string
          sqft_exterior?: number | null
          sqft_interior?: number | null
          unit_type?: string | null
          updated_at?: string
        }
        Update: {
          availability_status?: string | null
          baths?: number | null
          beds?: number | null
          created_at?: string
          floorplan_image_url?: string | null
          id?: string
          is_featured?: boolean
          occupancy_text?: string | null
          plan_name?: string | null
          powder_rooms?: number | null
          price_internal?: number | null
          price_notes?: string | null
          price_public?: number | null
          project_id?: string
          sqft_exterior?: number | null
          sqft_interior?: number | null
          unit_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_floorplans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_floorplans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_floorplans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_floorplans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_incentives: {
        Row: {
          created_at: string
          description_private: string | null
          description_public: string | null
          effective_end_date: string | null
          effective_start_date: string | null
          id: string
          is_active: boolean
          is_negotiable: boolean | null
          project_id: string
          source_snapshot_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_private?: string | null
          description_public?: string | null
          effective_end_date?: string | null
          effective_start_date?: string | null
          id?: string
          is_active?: boolean
          is_negotiable?: boolean | null
          project_id: string
          source_snapshot_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_private?: string | null
          description_public?: string | null
          effective_end_date?: string | null
          effective_start_date?: string | null
          id?: string
          is_active?: boolean
          is_negotiable?: boolean | null
          project_id?: string
          source_snapshot_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_incentives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_incentives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_incentives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_incentives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_leads: {
        Row: {
          assigned_realtor_profile_id: string | null
          created_at: string
          id: string
          is_realtor: boolean | null
          lead_email: string
          lead_name: string
          lead_phone: string | null
          message: string | null
          project_id: string
          public_project_page_id: string | null
          source_url: string | null
          status: string
        }
        Insert: {
          assigned_realtor_profile_id?: string | null
          created_at?: string
          id?: string
          is_realtor?: boolean | null
          lead_email: string
          lead_name: string
          lead_phone?: string | null
          message?: string | null
          project_id: string
          public_project_page_id?: string | null
          source_url?: string | null
          status?: string
        }
        Update: {
          assigned_realtor_profile_id?: string | null
          created_at?: string
          id?: string
          is_realtor?: boolean | null
          lead_email?: string
          lead_name?: string
          lead_phone?: string | null
          message?: string | null
          project_id?: string
          public_project_page_id?: string | null
          source_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_leads_assigned_realtor_profile_id_fkey"
            columns: ["assigned_realtor_profile_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "project_leads_assigned_realtor_profile_id_fkey"
            columns: ["assigned_realtor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_leads_assigned_realtor_profile_id_fkey"
            columns: ["assigned_realtor_profile_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "project_leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_leads_public_project_page_id_fkey"
            columns: ["public_project_page_id"]
            isOneToOne: false
            referencedRelation: "public_project_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_leads_public_project_page_id_fkey"
            columns: ["public_project_page_id"]
            isOneToOne: false
            referencedRelation: "public_projects_view"
            referencedColumns: ["public_page_id"]
          },
        ]
      }
      project_media: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          id: string
          is_public: boolean
          media_type: string
          project_id: string
          sort_order: number
          source_url: string | null
          url: string
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          media_type: string
          project_id: string
          sort_order?: number
          source_url?: string | null
          url: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          media_type?: string
          project_id?: string
          sort_order?: number
          source_url?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_media_candidates: {
        Row: {
          created_at: string
          height: number | null
          id: string
          image_url: string
          project_id: string
          provider: string
          rank: number
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          source_title: string | null
          source_url: string | null
          status: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          image_url: string
          project_id: string
          provider?: string
          rank?: number
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          source_title?: string | null
          source_url?: string | null
          status?: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          image_url?: string
          project_id?: string
          provider?: string
          rank?: number
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          source_title?: string | null
          source_url?: string | null
          status?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_media_candidates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_media_candidates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_media_candidates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_media_candidates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_media_candidates_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "project_media_candidates_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_media_candidates_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      project_private_commercials: {
        Row: {
          commission_is_negotiable: boolean | null
          commission_percent: number | null
          commission_summary: string | null
          created_at: string
          id: string
          incentives_are_negotiable: boolean | null
          internal_pricing_notes: string | null
          negotiability_notes: string | null
          price_is_negotiable: boolean | null
          private_incentive_notes: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          commission_is_negotiable?: boolean | null
          commission_percent?: number | null
          commission_summary?: string | null
          created_at?: string
          id?: string
          incentives_are_negotiable?: boolean | null
          internal_pricing_notes?: string | null
          negotiability_notes?: string | null
          price_is_negotiable?: boolean | null
          private_incentive_notes?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          commission_is_negotiable?: boolean | null
          commission_percent?: number | null
          commission_summary?: string | null
          created_at?: string
          id?: string
          incentives_are_negotiable?: boolean | null
          internal_pricing_notes?: string | null
          negotiability_notes?: string | null
          price_is_negotiable?: boolean | null
          private_incentive_notes?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_private_commercials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_private_commercials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_private_commercials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_private_commercials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_proposals: {
        Row: {
          admin_notes: string | null
          commission_ask_percent: number | null
          consideration: string | null
          created_at: string
          id: string
          incentive_ask: string | null
          narrative: string | null
          price_reduction_ask: number | null
          project_id: string
          proposal_format: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          submitted_by_user_id: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          admin_notes?: string | null
          commission_ask_percent?: number | null
          consideration?: string | null
          created_at?: string
          id?: string
          incentive_ask?: string | null
          narrative?: string | null
          price_reduction_ask?: number | null
          project_id: string
          proposal_format?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          submitted_by_user_id: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          admin_notes?: string | null
          commission_ask_percent?: number | null
          consideration?: string | null
          created_at?: string
          id?: string
          incentive_ask?: string | null
          narrative?: string | null
          price_reduction_ask?: number | null
          project_id?: string
          proposal_format?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          submitted_by_user_id?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_proposals_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "project_proposals_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_proposals_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "project_proposals_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "project_proposals_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_proposals_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      project_rental_referral_terms: {
        Row: {
          accepts_referrals: boolean
          created_at: string
          earliest_move_in: string | null
          id: string
          is_active: boolean
          latest_move_in: string | null
          min_credit_band: string | null
          min_household_income: number | null
          min_lease_term_months: number | null
          payout_terms: string | null
          pets_allowed: boolean | null
          project_id: string
          referral_fee_notes: string | null
          referral_fee_type: string | null
          referral_fee_value: number | null
          required_fields: string[] | null
          routes_to_profile_id: string | null
          service_mode: string
          updated_at: string
        }
        Insert: {
          accepts_referrals?: boolean
          created_at?: string
          earliest_move_in?: string | null
          id?: string
          is_active?: boolean
          latest_move_in?: string | null
          min_credit_band?: string | null
          min_household_income?: number | null
          min_lease_term_months?: number | null
          payout_terms?: string | null
          pets_allowed?: boolean | null
          project_id: string
          referral_fee_notes?: string | null
          referral_fee_type?: string | null
          referral_fee_value?: number | null
          required_fields?: string[] | null
          routes_to_profile_id?: string | null
          service_mode?: string
          updated_at?: string
        }
        Update: {
          accepts_referrals?: boolean
          created_at?: string
          earliest_move_in?: string | null
          id?: string
          is_active?: boolean
          latest_move_in?: string | null
          min_credit_band?: string | null
          min_household_income?: number | null
          min_lease_term_months?: number | null
          payout_terms?: string | null
          pets_allowed?: boolean | null
          project_id?: string
          referral_fee_notes?: string | null
          referral_fee_type?: string | null
          referral_fee_value?: number | null
          required_fields?: string[] | null
          routes_to_profile_id?: string | null
          service_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_rental_referral_terms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_rental_referral_terms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_rental_referral_terms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_rental_referral_terms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_rental_referral_terms_routes_to_profile_id_fkey"
            columns: ["routes_to_profile_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "project_rental_referral_terms_routes_to_profile_id_fkey"
            columns: ["routes_to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_rental_referral_terms_routes_to_profile_id_fkey"
            columns: ["routes_to_profile_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      projects: {
        Row: {
          address_full: string | null
          address_line_1: string | null
          address_line_2: string | null
          architect_name: string | null
          bathrooms_summary: string | null
          bedrooms_summary: string | null
          builder_name: string | null
          builder_names_raw: string | null
          city: string
          construction_status: string | null
          cover_image_url: string | null
          created_at: string
          description_ai_draft: string | null
          description_long: string | null
          description_short: string | null
          external_source: string | null
          external_source_url: string | null
          headline: string | null
          hero_image_alt: string | null
          hero_image_url: string | null
          id: string
          import_notes: string | null
          interior_designer_name: string | null
          intersection_primary: string | null
          intersection_secondary: string | null
          is_advertiser: boolean
          is_featured: boolean
          is_seeded: boolean
          last_verified_at: string | null
          latitude: number | null
          listing_type: string
          longitude: number | null
          municipality: string | null
          neighbourhood: string | null
          occupancy_end_date: string | null
          occupancy_estimate_text: string | null
          occupancy_start_date: string | null
          ownership_type: string | null
          postal_code: string | null
          price_currency: string | null
          price_from_public: number | null
          price_period: string
          price_to_public: number | null
          project_name: string
          project_name_alt: string | null
          project_type: string | null
          province: string
          public_page_enabled: boolean
          published_at: string | null
          record_status: string
          sales_centre_address: string | null
          sales_centre_email: string | null
          sales_centre_hours: string | null
          sales_centre_name: string | null
          sales_centre_phone: string | null
          sales_status: string | null
          show_similar_override: boolean | null
          size_range_sqft_max: number | null
          size_range_sqft_min: number | null
          slug: string
          storeys: number | null
          total_units: number | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address_full?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          architect_name?: string | null
          bathrooms_summary?: string | null
          bedrooms_summary?: string | null
          builder_name?: string | null
          builder_names_raw?: string | null
          city: string
          construction_status?: string | null
          cover_image_url?: string | null
          created_at?: string
          description_ai_draft?: string | null
          description_long?: string | null
          description_short?: string | null
          external_source?: string | null
          external_source_url?: string | null
          headline?: string | null
          hero_image_alt?: string | null
          hero_image_url?: string | null
          id?: string
          import_notes?: string | null
          interior_designer_name?: string | null
          intersection_primary?: string | null
          intersection_secondary?: string | null
          is_advertiser?: boolean
          is_featured?: boolean
          is_seeded?: boolean
          last_verified_at?: string | null
          latitude?: number | null
          listing_type?: string
          longitude?: number | null
          municipality?: string | null
          neighbourhood?: string | null
          occupancy_end_date?: string | null
          occupancy_estimate_text?: string | null
          occupancy_start_date?: string | null
          ownership_type?: string | null
          postal_code?: string | null
          price_currency?: string | null
          price_from_public?: number | null
          price_period?: string
          price_to_public?: number | null
          project_name: string
          project_name_alt?: string | null
          project_type?: string | null
          province?: string
          public_page_enabled?: boolean
          published_at?: string | null
          record_status?: string
          sales_centre_address?: string | null
          sales_centre_email?: string | null
          sales_centre_hours?: string | null
          sales_centre_name?: string | null
          sales_centre_phone?: string | null
          sales_status?: string | null
          show_similar_override?: boolean | null
          size_range_sqft_max?: number | null
          size_range_sqft_min?: number | null
          slug: string
          storeys?: number | null
          total_units?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address_full?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          architect_name?: string | null
          bathrooms_summary?: string | null
          bedrooms_summary?: string | null
          builder_name?: string | null
          builder_names_raw?: string | null
          city?: string
          construction_status?: string | null
          cover_image_url?: string | null
          created_at?: string
          description_ai_draft?: string | null
          description_long?: string | null
          description_short?: string | null
          external_source?: string | null
          external_source_url?: string | null
          headline?: string | null
          hero_image_alt?: string | null
          hero_image_url?: string | null
          id?: string
          import_notes?: string | null
          interior_designer_name?: string | null
          intersection_primary?: string | null
          intersection_secondary?: string | null
          is_advertiser?: boolean
          is_featured?: boolean
          is_seeded?: boolean
          last_verified_at?: string | null
          latitude?: number | null
          listing_type?: string
          longitude?: number | null
          municipality?: string | null
          neighbourhood?: string | null
          occupancy_end_date?: string | null
          occupancy_estimate_text?: string | null
          occupancy_start_date?: string | null
          ownership_type?: string | null
          postal_code?: string | null
          price_currency?: string | null
          price_from_public?: number | null
          price_period?: string
          price_to_public?: number | null
          project_name?: string
          project_name_alt?: string | null
          project_type?: string | null
          province?: string
          public_page_enabled?: boolean
          published_at?: string | null
          record_status?: string
          sales_centre_address?: string | null
          sales_centre_email?: string | null
          sales_centre_hours?: string | null
          sales_centre_name?: string | null
          sales_centre_phone?: string | null
          sales_status?: string | null
          show_similar_override?: boolean | null
          size_range_sqft_max?: number | null
          size_range_sqft_min?: number | null
          slug?: string
          storeys?: number | null
          total_units?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      property_submissions: {
        Row: {
          address_text: string | null
          admin_notes: string | null
          builder_name: string | null
          city: string | null
          created_at: string
          id: string
          project_name: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          submission_payload: Json
          submitted_by_user_id: string
          updated_at: string
        }
        Insert: {
          address_text?: string | null
          admin_notes?: string | null
          builder_name?: string | null
          city?: string | null
          created_at?: string
          id?: string
          project_name: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          submission_payload?: Json
          submitted_by_user_id: string
          updated_at?: string
        }
        Update: {
          address_text?: string | null
          admin_notes?: string | null
          builder_name?: string | null
          city?: string | null
          created_at?: string
          id?: string
          project_name?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          submission_payload?: Json
          submitted_by_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_submissions_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "property_submissions_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_submissions_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "property_submissions_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "property_submissions_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_submissions_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      property_update_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          project_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          submitted_by_user_id: string
          update_payload: Json
          update_type: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          project_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          submitted_by_user_id: string
          update_payload?: Json
          update_type: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          project_id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          submitted_by_user_id?: string
          update_payload?: Json
          update_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_update_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_update_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_update_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "property_update_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "property_update_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "property_update_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_update_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "property_update_requests_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "property_update_requests_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_update_requests_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      public_project_pages: {
        Row: {
          assigned_realtor_profile_id: string | null
          assigned_realtor_until: string | null
          canonical_url: string | null
          created_at: string
          custom_cta_text: string | null
          hero_image_url_override: string | null
          id: string
          indexable: boolean
          is_active: boolean
          lead_routing_mode: string
          page_description: string | null
          page_summary: string | null
          page_title: string | null
          project_id: string
          published_at: string | null
          seo_meta_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          assigned_realtor_profile_id?: string | null
          assigned_realtor_until?: string | null
          canonical_url?: string | null
          created_at?: string
          custom_cta_text?: string | null
          hero_image_url_override?: string | null
          id?: string
          indexable?: boolean
          is_active?: boolean
          lead_routing_mode?: string
          page_description?: string | null
          page_summary?: string | null
          page_title?: string | null
          project_id: string
          published_at?: string | null
          seo_meta_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          assigned_realtor_profile_id?: string | null
          assigned_realtor_until?: string | null
          canonical_url?: string | null
          created_at?: string
          custom_cta_text?: string | null
          hero_image_url_override?: string | null
          id?: string
          indexable?: boolean
          is_active?: boolean
          lead_routing_mode?: string
          page_description?: string | null
          page_summary?: string | null
          page_title?: string | null
          project_id?: string
          published_at?: string | null
          seo_meta_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_project_pages_assigned_realtor_profile_id_fkey"
            columns: ["assigned_realtor_profile_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "public_project_pages_assigned_realtor_profile_id_fkey"
            columns: ["assigned_realtor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_project_pages_assigned_realtor_profile_id_fkey"
            columns: ["assigned_realtor_profile_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "public_project_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_project_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_project_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "public_project_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
        ]
      }
      reco_verification_audits: {
        Row: {
          created_at: string
          extracted_expiry: string | null
          extracted_name: string | null
          extracted_reco_number: string | null
          extracted_status: string | null
          id: string
          matched: boolean
          method: string
          profile_id: string
          profile_name: string | null
          profile_reco: string | null
        }
        Insert: {
          created_at?: string
          extracted_expiry?: string | null
          extracted_name?: string | null
          extracted_reco_number?: string | null
          extracted_status?: string | null
          id?: string
          matched: boolean
          method?: string
          profile_id: string
          profile_name?: string | null
          profile_reco?: string | null
        }
        Update: {
          created_at?: string
          extracted_expiry?: string | null
          extracted_name?: string | null
          extracted_reco_number?: string | null
          extracted_status?: string | null
          id?: string
          matched?: boolean
          method?: string
          profile_id?: string
          profile_name?: string | null
          profile_reco?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reco_verification_audits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "reco_verification_audits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reco_verification_audits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          qualified_at: string | null
          referred_profile_id: string
          referrer_profile_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          qualified_at?: string | null
          referred_profile_id: string
          referrer_profile_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          qualified_at?: string | null
          referred_profile_id?: string
          referrer_profile_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_profile_id_fkey"
            columns: ["referred_profile_id"]
            isOneToOne: true
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "referrals_referred_profile_id_fkey"
            columns: ["referred_profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_profile_id_fkey"
            columns: ["referred_profile_id"]
            isOneToOne: true
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "referrals_referrer_profile_id_fkey"
            columns: ["referrer_profile_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "referrals_referrer_profile_id_fkey"
            columns: ["referrer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_profile_id_fkey"
            columns: ["referrer_profile_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      rewards_ledger: {
        Row: {
          created_at: string
          days_granted: number
          id: string
          metadata: Json
          profile_id: string
          reason: string
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          created_at?: string
          days_granted?: number
          id?: string
          metadata?: Json
          profile_id: string
          reason: string
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          created_at?: string
          days_granted?: number
          id?: string
          metadata?: Json
          profile_id?: string
          reason?: string
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "rewards_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      seo_prompt_settings: {
        Row: {
          id: number
          overall_instructions: string | null
          page_description_instructions: string | null
          page_summary_instructions: string | null
          seo_meta_description_instructions: string | null
          seo_title_instructions: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          overall_instructions?: string | null
          page_description_instructions?: string | null
          page_summary_instructions?: string | null
          seo_meta_description_instructions?: string | null
          seo_title_instructions?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          overall_instructions?: string | null
          page_description_instructions?: string | null
          page_summary_instructions?: string | null
          seo_meta_description_instructions?: string | null
          seo_title_instructions?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_prompt_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "seo_prompt_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_prompt_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          brokerage_name_submitted: string | null
          created_at: string
          id: string
          notes: string | null
          profile_id: string
          reco_registration_number: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          brokerage_name_submitted?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          profile_id: string
          reco_registration_number: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          brokerage_name_submitted?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          profile_id?: string
          reco_registration_number?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "verification_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "verification_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "verification_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
    }
    Views: {
      broker_projects_view: {
        Row: {
          address_full: string | null
          address_line_1: string | null
          address_line_2: string | null
          architect_name: string | null
          bathrooms_summary: string | null
          bedrooms_summary: string | null
          builder_name: string | null
          city: string | null
          construction_status: string | null
          cover_image_url: string | null
          created_at: string | null
          description_long: string | null
          description_short: string | null
          headline: string | null
          hero_image_alt: string | null
          hero_image_url: string | null
          id: string | null
          interior_designer_name: string | null
          intersection_primary: string | null
          intersection_secondary: string | null
          is_featured: boolean | null
          is_seeded: boolean | null
          last_verified_at: string | null
          latitude: number | null
          longitude: number | null
          municipality: string | null
          neighbourhood: string | null
          occupancy_end_date: string | null
          occupancy_estimate_text: string | null
          occupancy_start_date: string | null
          ownership_type: string | null
          postal_code: string | null
          price_currency: string | null
          price_from_public: number | null
          price_to_public: number | null
          project_name: string | null
          project_name_alt: string | null
          project_type: string | null
          province: string | null
          public_page_enabled: boolean | null
          published_at: string | null
          record_status: string | null
          sales_centre_address: string | null
          sales_centre_email: string | null
          sales_centre_hours: string | null
          sales_centre_name: string | null
          sales_centre_phone: string | null
          sales_status: string | null
          size_range_sqft_max: number | null
          size_range_sqft_min: number | null
          slug: string | null
          storeys: number | null
          total_units: number | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          address_full?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          architect_name?: string | null
          bathrooms_summary?: string | null
          bedrooms_summary?: string | null
          builder_name?: string | null
          city?: string | null
          construction_status?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description_long?: string | null
          description_short?: string | null
          headline?: string | null
          hero_image_alt?: string | null
          hero_image_url?: string | null
          id?: string | null
          interior_designer_name?: string | null
          intersection_primary?: string | null
          intersection_secondary?: string | null
          is_featured?: boolean | null
          is_seeded?: boolean | null
          last_verified_at?: string | null
          latitude?: number | null
          longitude?: number | null
          municipality?: string | null
          neighbourhood?: string | null
          occupancy_end_date?: string | null
          occupancy_estimate_text?: string | null
          occupancy_start_date?: string | null
          ownership_type?: string | null
          postal_code?: string | null
          price_currency?: string | null
          price_from_public?: number | null
          price_to_public?: number | null
          project_name?: string | null
          project_name_alt?: string | null
          project_type?: string | null
          province?: string | null
          public_page_enabled?: boolean | null
          published_at?: string | null
          record_status?: string | null
          sales_centre_address?: string | null
          sales_centre_email?: string | null
          sales_centre_hours?: string | null
          sales_centre_name?: string | null
          sales_centre_phone?: string | null
          sales_status?: string | null
          size_range_sqft_max?: number | null
          size_range_sqft_min?: number | null
          slug?: string | null
          storeys?: number | null
          total_units?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          address_full?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          architect_name?: string | null
          bathrooms_summary?: string | null
          bedrooms_summary?: string | null
          builder_name?: string | null
          city?: string | null
          construction_status?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description_long?: string | null
          description_short?: string | null
          headline?: string | null
          hero_image_alt?: string | null
          hero_image_url?: string | null
          id?: string | null
          interior_designer_name?: string | null
          intersection_primary?: string | null
          intersection_secondary?: string | null
          is_featured?: boolean | null
          is_seeded?: boolean | null
          last_verified_at?: string | null
          latitude?: number | null
          longitude?: number | null
          municipality?: string | null
          neighbourhood?: string | null
          occupancy_end_date?: string | null
          occupancy_estimate_text?: string | null
          occupancy_start_date?: string | null
          ownership_type?: string | null
          postal_code?: string | null
          price_currency?: string | null
          price_from_public?: number | null
          price_to_public?: number | null
          project_name?: string | null
          project_name_alt?: string | null
          project_type?: string | null
          province?: string | null
          public_page_enabled?: boolean | null
          published_at?: string | null
          record_status?: string | null
          sales_centre_address?: string | null
          sales_centre_email?: string | null
          sales_centre_hours?: string | null
          sales_centre_name?: string | null
          sales_centre_phone?: string | null
          sales_status?: string | null
          size_range_sqft_max?: number | null
          size_range_sqft_min?: number | null
          slug?: string | null
          storeys?: number | null
          total_units?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      buyer_mandates_developer_view: {
        Row: {
          baths_min: number | null
          beds_min: number | null
          broker_brokerage: string | null
          broker_first_name: string | null
          broker_id: string | null
          broker_last_name: string | null
          condition: string | null
          created_at: string | null
          deposit_ready: boolean | null
          financing_type: string | null
          id: string | null
          id_verified: boolean | null
          location_areas: string | null
          location_radius_km: number | null
          lot_notes: string | null
          must_haves: string | null
          nice_to_haves: string | null
          pre_approval_status: string | null
          price_max: number | null
          price_min: number | null
          proof_of_funds: boolean | null
          property_type: string | null
          rep_agreement_signed: boolean | null
          size_sqft_max: number | null
          size_sqft_min: number | null
          status: string | null
          timeline: string | null
          verified: boolean | null
        }
        Relationships: []
      }
      deal_rfps_realtor_view: {
        Row: {
          brief: string | null
          created_at: string | null
          deadline_at: string | null
          deal_side: string | null
          developer_company: string | null
          developer_name: string | null
          hidden_fields: string[] | null
          id: string | null
          project_id: string | null
          reveal_identity: boolean | null
          rfp_type: string | null
          status: string | null
          target_price: number | null
          target_units: number | null
          title: string | null
          updated_at: string | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_rfps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "broker_projects_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rfps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_rfps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects_view"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "deal_rfps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "referral_opportunities_view"
            referencedColumns: ["project_id"]
          },
        ]
      }
      opportunities_market_view: {
        Row: {
          address_full: string | null
          asking_price: number | null
          bid_count: number | null
          city: string | null
          commission_percent: number | null
          created_at: string | null
          deal_type: string | null
          developer_name: string | null
          hidden_fields: string[] | null
          id: string | null
          incentive_amount: number | null
          incentive_notes: string | null
          price_basis: string | null
          province: string | null
          published_at: string | null
          status: string | null
          summary: string | null
          title: string | null
          unit_count: number | null
        }
        Relationships: []
      }
      opportunity_units_market_view: {
        Row: {
          address_full: string | null
          asking_price: number | null
          baths: number | null
          beds: number | null
          id: string | null
          label: string | null
          opportunity_id: string | null
          sort_order: number | null
          sqft: number | null
          status: string | null
          unit_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_units_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_units_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities_market_view"
            referencedColumns: ["id"]
          },
        ]
      }
      public_projects_view: {
        Row: {
          address_full: string | null
          architect_name: string | null
          assigned_realtor_profile_id: string | null
          bathrooms_summary: string | null
          bedrooms_summary: string | null
          builder_name: string | null
          canonical_url: string | null
          city: string | null
          construction_status: string | null
          cover_image_url: string | null
          custom_cta_text: string | null
          description_long: string | null
          description_short: string | null
          headline: string | null
          hero_image_alt: string | null
          hero_image_url: string | null
          indexable: boolean | null
          interior_designer_name: string | null
          intersection_primary: string | null
          intersection_secondary: string | null
          is_advertiser: boolean | null
          is_featured: boolean | null
          latitude: number | null
          longitude: number | null
          municipality: string | null
          neighbourhood: string | null
          occupancy_end_date: string | null
          occupancy_estimate_text: string | null
          occupancy_start_date: string | null
          ownership_type: string | null
          page_description: string | null
          page_summary: string | null
          page_title: string | null
          postal_code: string | null
          price_currency: string | null
          price_from_public: number | null
          price_to_public: number | null
          project_id: string | null
          project_name: string | null
          project_name_alt: string | null
          project_type: string | null
          province: string | null
          public_page_id: string | null
          published_at: string | null
          sales_centre_address: string | null
          sales_centre_email: string | null
          sales_centre_hours: string | null
          sales_centre_name: string | null
          sales_centre_phone: string | null
          sales_status: string | null
          seo_meta_description: string | null
          seo_title: string | null
          show_similar_block: boolean | null
          size_range_sqft_max: number | null
          size_range_sqft_min: number | null
          slug: string | null
          storeys: number | null
          total_units: number | null
          website_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_project_pages_assigned_realtor_profile_id_fkey"
            columns: ["assigned_realtor_profile_id"]
            isOneToOne: false
            referencedRelation: "buyer_mandates_developer_view"
            referencedColumns: ["broker_id"]
          },
          {
            foreignKeyName: "public_project_pages_assigned_realtor_profile_id_fkey"
            columns: ["assigned_realtor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_project_pages_assigned_realtor_profile_id_fkey"
            columns: ["assigned_realtor_profile_id"]
            isOneToOne: false
            referencedRelation: "public_realtor_cards"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      public_realtor_cards: {
        Row: {
          brokerage: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          profile_id: string | null
          title: string | null
        }
        Relationships: []
      }
      referral_opportunities_view: {
        Row: {
          city: string | null
          hero_image_url: string | null
          min_credit_band: string | null
          min_lease_term_months: number | null
          neighbourhood: string | null
          pets_allowed: boolean | null
          price_period: string | null
          project_id: string | null
          project_name: string | null
          referral_fee_notes: string | null
          referral_fee_type: string | null
          referral_fee_value: number | null
          rent_from: number | null
          rent_to: number | null
          service_mode: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_respond_to_rfp: { Args: { p_rfp_id: string }; Returns: boolean }
      gen_referral_code: { Args: never; Returns: string }
      has_project_access: {
        Args: { p_project_id: string; p_role: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_approved: { Args: never; Returns: boolean }
      is_developer: { Args: never; Returns: boolean }
      is_invited_to_rfp: { Args: { p_rfp_id: string }; Returns: boolean }
      is_opportunity_owner: {
        Args: { p_opportunity_id: string }
        Returns: boolean
      }
      is_pro: { Args: never; Returns: boolean }
      is_ultra: { Args: never; Returns: boolean }
      owns_mandate: { Args: { p_mandate_id: string }; Returns: boolean }
      owns_rfp: { Args: { p_rfp_id: string }; Returns: boolean }
      safe_uuid: { Args: { p: string }; Returns: string }
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
