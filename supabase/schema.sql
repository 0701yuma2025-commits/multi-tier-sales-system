-- 多段階営業代理店管理システム データベーススキーマ
-- Supabase (PostgreSQL) 用

-- UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMタイプの定義
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'agency', 'viewer');
CREATE TYPE agency_status AS ENUM ('pending', 'active', 'suspended', 'terminated');
CREATE TYPE company_type AS ENUM ('corporation', 'individual');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE commission_status AS ENUM ('pending', 'confirmed', 'paid');

-- ユーザーテーブル
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'agency',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 代理店テーブル
CREATE TABLE agencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
    agency_code VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_type company_type NOT NULL,
    tier_level INTEGER NOT NULL CHECK (tier_level >= 1 AND tier_level <= 4),
    status agency_status NOT NULL DEFAULT 'pending',
    
    -- 代表者情報
    representative_name VARCHAR(100) NOT NULL,
    representative_email VARCHAR(255) NOT NULL,
    representative_phone VARCHAR(20) NOT NULL,
    representative_birth_date DATE NOT NULL,
    
    -- 銀行口座情報（JSON形式で保存）
    bank_account JSONB NOT NULL,
    
    -- 税務情報（JSON形式で保存）
    tax_info JSONB NOT NULL DEFAULT '{}',
    
    -- 統計情報
    total_sales DECIMAL(15, 2) DEFAULT 0,
    total_commission DECIMAL(15, 2) DEFAULT 0,
    active_sub_agencies INTEGER DEFAULT 0,
    
    -- メタ情報
    invitation_code VARCHAR(100),
    invited_by UUID REFERENCES agencies(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    suspended_at TIMESTAMP WITH TIME ZONE,
    terminated_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_birth_date CHECK (representative_birth_date <= CURRENT_DATE - INTERVAL '18 years')
);

-- 商品マスタテーブル
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 報酬率設定テーブル
CREATE TABLE commission_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    tier_level INTEGER NOT NULL CHECK (tier_level >= 1 AND tier_level <= 4),
    commission_rate DECIMAL(5, 2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
    is_active BOOLEAN DEFAULT true,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, tier_level, valid_from)
);

-- 階層ボーナス設定テーブル
CREATE TABLE hierarchy_bonus_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_tier INTEGER NOT NULL CHECK (from_tier >= 2 AND from_tier <= 4),
    to_tier INTEGER NOT NULL CHECK (to_tier >= 1 AND to_tier <= 3),
    bonus_rate DECIMAL(5, 2) NOT NULL CHECK (bonus_rate >= 0 AND bonus_rate <= 100),
    is_active BOOLEAN DEFAULT true,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_tier_relation CHECK (to_tier = from_tier - 1)
);

-- 売上テーブル
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    sold_at DATE NOT NULL,
    notes TEXT,
    is_cancelled BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 報酬テーブル
CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
    sales_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    commission_type VARCHAR(50) NOT NULL, -- 'direct', 'hierarchy', 'campaign'
    
    -- 金額情報
    base_amount DECIMAL(15, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL,
    commission_amount DECIMAL(15, 2) NOT NULL,
    
    -- 控除情報
    invoice_deduction DECIMAL(15, 2) DEFAULT 0,
    withholding_tax DECIMAL(15, 2) DEFAULT 0,
    other_deductions DECIMAL(15, 2) DEFAULT 0,
    final_amount DECIMAL(15, 2) NOT NULL,
    
    -- 期間情報
    month DATE NOT NULL,
    status commission_status NOT NULL DEFAULT 'pending',
    
    -- 関連情報
    related_agency_id UUID REFERENCES agencies(id), -- 階層ボーナスの場合の子代理店
    campaign_id UUID, -- キャンペーン報酬の場合
    
    confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 支払いテーブル
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
    payment_month DATE NOT NULL,
    
    -- 金額情報
    total_sales DECIMAL(15, 2) NOT NULL,
    total_commission DECIMAL(15, 2) NOT NULL,
    total_deductions DECIMAL(15, 2) NOT NULL,
    payment_amount DECIMAL(15, 2) NOT NULL,
    
    -- 支払い情報
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',
    payment_reference VARCHAR(100),
    status payment_status NOT NULL DEFAULT 'pending',
    
    -- 処理情報
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id),
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(agency_id, payment_month)
);

-- 招待リンクテーブル
CREATE TABLE invitation_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_code VARCHAR(100) UNIQUE NOT NULL,
    inviter_agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    tier_level INTEGER NOT NULL,
    message TEXT,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by_agency_id UUID REFERENCES agencies(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- アクティビティログテーブル
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- キャンペーンテーブル
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    bonus_rate DECIMAL(5, 2) NOT NULL,
    target_products UUID[] NOT NULL DEFAULT '{}',
    target_tiers INTEGER[] NOT NULL DEFAULT '{1,2,3,4}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_campaign_period CHECK (end_date >= start_date)
);

-- インデックスの作成
CREATE INDEX idx_agencies_user_id ON agencies(user_id);
CREATE INDEX idx_agencies_parent_id ON agencies(parent_agency_id);
CREATE INDEX idx_agencies_status ON agencies(status);
CREATE INDEX idx_agencies_tier_level ON agencies(tier_level);
CREATE INDEX idx_sales_agency_id ON sales(agency_id);
CREATE INDEX idx_sales_product_id ON sales(product_id);
CREATE INDEX idx_sales_sold_at ON sales(sold_at);
CREATE INDEX idx_commissions_agency_id ON commissions(agency_id);
CREATE INDEX idx_commissions_month ON commissions(month);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_payments_agency_id ON payments(agency_id);
CREATE INDEX idx_payments_payment_month ON payments(payment_month);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_invitation_links_code ON invitation_links(invitation_code);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- 複合インデックス
CREATE INDEX idx_sales_agency_date ON sales(agency_id, sold_at DESC);
CREATE INDEX idx_commissions_agency_month ON commissions(agency_id, month);
CREATE INDEX idx_agencies_parent_status ON agencies(parent_agency_id, status);

-- トリガー関数：更新時刻の自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルに更新時刻トリガーを設定
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON agencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_settings_updated_at BEFORE UPDATE ON commission_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) ポリシー
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ビュー：代理店階層構造
CREATE OR REPLACE VIEW agency_hierarchy AS
WITH RECURSIVE agency_tree AS (
    SELECT 
        a.id,
        a.agency_code,
        a.company_name,
        a.tier_level,
        a.parent_agency_id,
        a.status,
        ARRAY[a.id] as path,
        0 as depth
    FROM agencies a
    WHERE a.parent_agency_id IS NULL
    
    UNION ALL
    
    SELECT 
        a.id,
        a.agency_code,
        a.company_name,
        a.tier_level,
        a.parent_agency_id,
        a.status,
        at.path || a.id,
        at.depth + 1
    FROM agencies a
    INNER JOIN agency_tree at ON a.parent_agency_id = at.id
)
SELECT * FROM agency_tree;