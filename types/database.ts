export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'super_admin' | 'admin' | 'agency' | 'viewer'
export type AgencyStatus = 'pending' | 'active' | 'suspended' | 'terminated'
export type CompanyType = 'corporation' | 'individual'
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type CommissionStatus = 'pending' | 'confirmed' | 'paid'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          role: UserRole
          is_active: boolean
          last_login_at: string | null
          failed_login_attempts: number
          locked_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          role?: UserRole
          is_active?: boolean
          last_login_at?: string | null
          failed_login_attempts?: number
          locked_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          role?: UserRole
          is_active?: boolean
          last_login_at?: string | null
          failed_login_attempts?: number
          locked_until?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agencies: {
        Row: {
          id: string
          user_id: string | null
          parent_agency_id: string | null
          agency_code: string
          company_name: string
          company_type: CompanyType
          tier_level: number
          status: AgencyStatus
          representative_name: string
          representative_email: string
          representative_phone: string
          representative_birth_date: string
          bank_account: Json
          tax_info: Json
          total_sales: number
          total_commission: number
          active_sub_agencies: number
          invitation_code: string | null
          invited_by: string | null
          approved_at: string | null
          approved_by: string | null
          suspended_at: string | null
          terminated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          parent_agency_id?: string | null
          agency_code?: string
          company_name: string
          company_type: CompanyType
          tier_level: number
          status?: AgencyStatus
          representative_name: string
          representative_email: string
          representative_phone: string
          representative_birth_date: string
          bank_account: Json
          tax_info?: Json
          total_sales?: number
          total_commission?: number
          active_sub_agencies?: number
          invitation_code?: string | null
          invited_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          suspended_at?: string | null
          terminated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          parent_agency_id?: string | null
          agency_code?: string
          company_name?: string
          company_type?: CompanyType
          tier_level?: number
          status?: AgencyStatus
          representative_name?: string
          representative_email?: string
          representative_phone?: string
          representative_birth_date?: string
          bank_account?: Json
          tax_info?: Json
          total_sales?: number
          total_commission?: number
          active_sub_agencies?: number
          invitation_code?: string | null
          invited_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          suspended_at?: string | null
          terminated_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          product_code: string
          product_name: string
          description: string | null
          unit_price: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_code: string
          product_name: string
          description?: string | null
          unit_price: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_code?: string
          product_name?: string
          description?: string | null
          unit_price?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          agency_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_amount: number
          sold_at: string
          notes: string | null
          is_cancelled: boolean
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_amount: number
          sold_at: string
          notes?: string | null
          is_cancelled?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          total_amount?: number
          sold_at?: string
          notes?: string | null
          is_cancelled?: boolean
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      commissions: {
        Row: {
          id: string
          agency_id: string
          sales_id: string | null
          commission_type: string
          base_amount: number
          commission_rate: number
          commission_amount: number
          invoice_deduction: number
          withholding_tax: number
          other_deductions: number
          final_amount: number
          month: string
          status: CommissionStatus
          related_agency_id: string | null
          campaign_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          sales_id?: string | null
          commission_type: string
          base_amount: number
          commission_rate: number
          commission_amount: number
          invoice_deduction?: number
          withholding_tax?: number
          other_deductions?: number
          final_amount: number
          month: string
          status?: CommissionStatus
          related_agency_id?: string | null
          campaign_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          sales_id?: string | null
          commission_type?: string
          base_amount?: number
          commission_rate?: number
          commission_amount?: number
          invoice_deduction?: number
          withholding_tax?: number
          other_deductions?: number
          final_amount?: number
          month?: string
          status?: CommissionStatus
          related_agency_id?: string | null
          campaign_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          agency_id: string
          payment_month: string
          total_sales: number
          total_commission: number
          total_deductions: number
          payment_amount: number
          payment_date: string
          payment_method: string
          payment_reference: string | null
          status: PaymentStatus
          processed_at: string | null
          processed_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          payment_month: string
          total_sales: number
          total_commission: number
          total_deductions: number
          payment_amount: number
          payment_date: string
          payment_method?: string
          payment_reference?: string | null
          status?: PaymentStatus
          processed_at?: string | null
          processed_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          payment_month?: string
          total_sales?: number
          total_commission?: number
          total_deductions?: number
          payment_amount?: number
          payment_date?: string
          payment_method?: string
          payment_reference?: string | null
          status?: PaymentStatus
          processed_at?: string | null
          processed_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invitation_links: {
        Row: {
          id: string
          invitation_code: string
          inviter_agency_id: string
          invited_email: string
          tier_level: number
          message: string | null
          is_used: boolean
          used_at: string | null
          used_by_agency_id: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          invitation_code: string
          inviter_agency_id: string
          invited_email: string
          tier_level: number
          message?: string | null
          is_used?: boolean
          used_at?: string | null
          used_by_agency_id?: string | null
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          invitation_code?: string
          inviter_agency_id?: string
          invited_email?: string
          tier_level?: number
          message?: string | null
          is_used?: boolean
          used_at?: string | null
          used_by_agency_id?: string | null
          expires_at?: string
          created_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string | null
          agency_id: string | null
          action_type: string
          action_details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          agency_id?: string | null
          action_type: string
          action_details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          agency_id?: string | null
          action_type?: string
          action_details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          name: string
          description: string | null
          start_date: string
          end_date: string
          bonus_rate: number
          target_products: string[]
          target_tiers: number[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          start_date: string
          end_date: string
          bonus_rate: number
          target_products?: string[]
          target_tiers?: number[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          start_date?: string
          end_date?: string
          bonus_rate?: number
          target_products?: string[]
          target_tiers?: number[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      commission_settings: {
        Row: {
          id: string
          product_id: string
          tier_level: number
          commission_rate: number
          is_active: boolean
          valid_from: string
          valid_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          tier_level: number
          commission_rate: number
          is_active?: boolean
          valid_from?: string
          valid_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          tier_level?: number
          commission_rate?: number
          is_active?: boolean
          valid_from?: string
          valid_until?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      hierarchy_bonus_settings: {
        Row: {
          id: string
          from_tier: number
          to_tier: number
          bonus_rate: number
          is_active: boolean
          valid_from: string
          valid_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          from_tier: number
          to_tier: number
          bonus_rate: number
          is_active?: boolean
          valid_from?: string
          valid_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          from_tier?: number
          to_tier?: number
          bonus_rate?: number
          is_active?: boolean
          valid_from?: string
          valid_until?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      agency_hierarchy: {
        Row: {
          id: string
          agency_code: string
          company_name: string
          tier_level: number
          parent_agency_id: string | null
          status: AgencyStatus
          path: string[]
          depth: number
        }
      }
    }
    Functions: {
      generate_agency_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_commission_rate: {
        Args: {
          p_product_id: string
          p_tier_level: number
          p_date?: string
        }
        Returns: number
      }
      get_hierarchy_bonus_rate: {
        Args: {
          p_from_tier: number
          p_to_tier: number
          p_date?: string
        }
        Returns: number
      }
      process_monthly_payment: {
        Args: {
          p_target_month: string
          p_processed_by: string
        }
        Returns: {
          agency_id: string
          payment_amount: number
          status: string
        }[]
      }
      check_spam_activity: {
        Args: {
          p_ip_address: string
          p_action_type: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      agency_status: AgencyStatus
      company_type: CompanyType
      payment_status: PaymentStatus
      commission_status: CommissionStatus
    }
  }
}