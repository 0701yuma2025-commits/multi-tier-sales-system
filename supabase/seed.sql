-- 初期データ投入スクリプト

-- スーパー管理者ユーザー作成
INSERT INTO users (email, password_hash, role, is_active)
VALUES ('admin@system.com', '$2a$10$YourHashedPasswordHere', 'super_admin', true);

-- 商品マスタ初期データ
INSERT INTO products (product_code, product_name, description, unit_price, is_active) VALUES
('PRD001', '商品A', 'ベーシックプラン - 基本的な機能を提供', 10000.00, true),
('PRD002', '商品B', 'スタンダードプラン - 標準的な機能セット', 25000.00, true),
('PRD003', '商品C', 'プレミアムプラン - 全機能利用可能', 50000.00, true),
('PRD004', '商品D', 'エンタープライズプラン - 大規模組織向け', 100000.00, true);

-- 報酬率設定初期データ
INSERT INTO commission_settings (product_id, tier_level, commission_rate, is_active, valid_from) 
SELECT 
    p.id,
    t.tier,
    CASE t.tier
        WHEN 1 THEN 10.0
        WHEN 2 THEN 8.0
        WHEN 3 THEN 6.0
        WHEN 4 THEN 4.0
    END,
    true,
    CURRENT_DATE
FROM products p
CROSS JOIN (SELECT generate_series(1, 4) AS tier) t;

-- 階層ボーナス設定初期データ
INSERT INTO hierarchy_bonus_settings (from_tier, to_tier, bonus_rate, is_active, valid_from) VALUES
(2, 1, 2.0, true, CURRENT_DATE),
(3, 2, 1.5, true, CURRENT_DATE),
(4, 3, 1.0, true, CURRENT_DATE);

-- テスト用代理店データ（開発環境のみ）
-- 注意: 本番環境では以下のINSERT文をコメントアウトしてください

-- Tier1代理店
INSERT INTO agencies (
    user_id,
    parent_agency_id,
    agency_code,
    company_name,
    company_type,
    tier_level,
    status,
    representative_name,
    representative_email,
    representative_phone,
    representative_birth_date,
    bank_account,
    tax_info,
    approved_at
) VALUES
(
    (SELECT id FROM users WHERE email = 'admin@system.com'),
    NULL,
    'AGN202401001',
    '株式会社サンプル商事',
    'corporation',
    1,
    'active',
    '山田太郎',
    'yamada@sample.com',
    '03-1234-5678',
    '1980-01-01',
    '{
        "bank_name": "みずほ銀行",
        "branch_name": "東京営業部",
        "account_type": "普通",
        "account_number": "1234567",
        "account_holder": "カ）サンプルショウジ"
    }'::jsonb,
    '{
        "invoice_registered": true,
        "invoice_number": "T1234567890123",
        "withholding_tax": false
    }'::jsonb,
    CURRENT_TIMESTAMP
);

-- キャンペーン初期データ（サンプル）
INSERT INTO campaigns (
    name,
    description,
    start_date,
    end_date,
    bonus_rate,
    target_products,
    target_tiers,
    is_active
) VALUES (
    '新春キャンペーン2024',
    '新年度スタートダッシュキャンペーン。対象商品の報酬率を2%アップ！',
    '2024-01-01',
    '2024-03-31',
    2.0,
    ARRAY[(SELECT id FROM products WHERE product_code = 'PRD001')::uuid, 
          (SELECT id FROM products WHERE product_code = 'PRD002')::uuid],
    ARRAY[1, 2, 3, 4],
    true
);

-- システム設定用のテーブル（オプション）
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- システム設定初期データ
INSERT INTO system_settings (key, value, description) VALUES
('minimum_payment_amount', '10000', '最低支払金額（円）'),
('payment_cycle', '"monthly"', '支払いサイクル'),
('payment_date', '25', '支払日（毎月）'),
('max_login_attempts', '5', '最大ログイン試行回数'),
('lockout_duration', '3600', 'アカウントロック時間（秒）'),
('invitation_link_expiry', '604800', '招待リンク有効期限（秒）= 7日間'),
('max_invitations_per_hour', '10', '1時間あたりの最大招待数'),
('max_invitations_per_day', '50', '1日あたりの最大招待数');