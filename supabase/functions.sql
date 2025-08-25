-- 多段階営業代理店管理システム データベース関数
-- 報酬計算、階層管理などのビジネスロジック

-- 代理店コード生成関数
CREATE OR REPLACE FUNCTION generate_agency_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- AGN + 年(2桁) + 月(2桁) + ランダム4桁
        new_code := 'AGN' || TO_CHAR(CURRENT_DATE, 'YYMM') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- 重複チェック
        SELECT EXISTS(SELECT 1 FROM agencies WHERE agency_code = new_code) INTO code_exists;
        
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 階層レベルの妥当性チェック関数
CREATE OR REPLACE FUNCTION check_tier_level_validity()
RETURNS TRIGGER AS $$
DECLARE
    parent_tier INTEGER;
BEGIN
    -- 親代理店が指定されている場合
    IF NEW.parent_agency_id IS NOT NULL THEN
        SELECT tier_level INTO parent_tier 
        FROM agencies 
        WHERE id = NEW.parent_agency_id;
        
        -- 親の階層+1でなければエラー
        IF NEW.tier_level != parent_tier + 1 THEN
            RAISE EXCEPTION '階層レベルが不正です。親代理店の階層は%、設定しようとした階層は%です。', parent_tier, NEW.tier_level;
        END IF;
        
        -- 階層4を超える場合はエラー
        IF NEW.tier_level > 4 THEN
            RAISE EXCEPTION '階層レベルは4までです。';
        END IF;
    ELSE
        -- 親代理店が指定されていない場合は必ずTier1
        IF NEW.tier_level != 1 THEN
            RAISE EXCEPTION '親代理店が指定されていない場合、階層レベルは1である必要があります。';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 階層レベルチェックトリガー
CREATE TRIGGER check_agency_tier_level
    BEFORE INSERT OR UPDATE ON agencies
    FOR EACH ROW
    EXECUTE FUNCTION check_tier_level_validity();

-- 報酬率取得関数
CREATE OR REPLACE FUNCTION get_commission_rate(
    p_product_id UUID,
    p_tier_level INTEGER,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL AS $$
DECLARE
    v_rate DECIMAL;
BEGIN
    SELECT commission_rate INTO v_rate
    FROM commission_settings
    WHERE product_id = p_product_id
        AND tier_level = p_tier_level
        AND is_active = true
        AND valid_from <= p_date
        AND (valid_until IS NULL OR valid_until >= p_date)
    ORDER BY valid_from DESC
    LIMIT 1;
    
    -- デフォルト値
    IF v_rate IS NULL THEN
        v_rate := CASE p_tier_level
            WHEN 1 THEN 10.0
            WHEN 2 THEN 8.0
            WHEN 3 THEN 6.0
            WHEN 4 THEN 4.0
            ELSE 0.0
        END;
    END IF;
    
    RETURN v_rate;
END;
$$ LANGUAGE plpgsql;

-- 階層ボーナス率取得関数
CREATE OR REPLACE FUNCTION get_hierarchy_bonus_rate(
    p_from_tier INTEGER,
    p_to_tier INTEGER,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL AS $$
DECLARE
    v_rate DECIMAL;
BEGIN
    SELECT bonus_rate INTO v_rate
    FROM hierarchy_bonus_settings
    WHERE from_tier = p_from_tier
        AND to_tier = p_to_tier
        AND is_active = true
        AND valid_from <= p_date
        AND (valid_until IS NULL OR valid_until >= p_date)
    ORDER BY valid_from DESC
    LIMIT 1;
    
    -- デフォルト値
    IF v_rate IS NULL THEN
        v_rate := CASE
            WHEN p_from_tier = 2 AND p_to_tier = 1 THEN 2.0
            WHEN p_from_tier = 3 AND p_to_tier = 2 THEN 1.5
            WHEN p_from_tier = 4 AND p_to_tier = 3 THEN 1.0
            ELSE 0.0
        END;
    END IF;
    
    RETURN v_rate;
END;
$$ LANGUAGE plpgsql;

-- 売上登録時の報酬自動計算関数
CREATE OR REPLACE FUNCTION calculate_commission_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    v_agency RECORD;
    v_commission_rate DECIMAL;
    v_commission_amount DECIMAL;
    v_final_amount DECIMAL;
    v_parent_agency_id UUID;
    v_hierarchy_bonus_rate DECIMAL;
    v_hierarchy_bonus_amount DECIMAL;
    v_withholding_tax DECIMAL;
    v_invoice_deduction DECIMAL;
BEGIN
    -- 売上を登録した代理店の情報を取得
    SELECT * INTO v_agency
    FROM agencies
    WHERE id = NEW.agency_id;
    
    -- 報酬率を取得
    v_commission_rate := get_commission_rate(NEW.product_id, v_agency.tier_level, NEW.sold_at);
    
    -- 基本報酬額を計算
    v_commission_amount := NEW.total_amount * (v_commission_rate / 100);
    
    -- 控除計算
    -- インボイス制度対応
    IF v_agency.tax_info->>'invoice_registered' = 'false' THEN
        v_invoice_deduction := v_commission_amount * 0.02; -- 2%控除
    ELSE
        v_invoice_deduction := 0;
    END IF;
    
    -- 源泉徴収税計算（個人事業主の場合）
    IF v_agency.company_type = 'individual' THEN
        v_withholding_tax := FLOOR(v_commission_amount * 0.1021);
    ELSE
        v_withholding_tax := 0;
    END IF;
    
    -- 最終金額計算
    v_final_amount := v_commission_amount - v_invoice_deduction - v_withholding_tax;
    
    -- 直接報酬を登録
    INSERT INTO commissions (
        agency_id,
        sales_id,
        commission_type,
        base_amount,
        commission_rate,
        commission_amount,
        invoice_deduction,
        withholding_tax,
        final_amount,
        month,
        status
    ) VALUES (
        NEW.agency_id,
        NEW.id,
        'direct',
        NEW.total_amount,
        v_commission_rate,
        v_commission_amount,
        v_invoice_deduction,
        v_withholding_tax,
        v_final_amount,
        DATE_TRUNC('month', NEW.sold_at)::DATE,
        'pending'
    );
    
    -- 階層ボーナスの計算（親代理店がいる場合）
    v_parent_agency_id := v_agency.parent_agency_id;
    WHILE v_parent_agency_id IS NOT NULL LOOP
        SELECT * INTO v_agency
        FROM agencies
        WHERE id = v_parent_agency_id;
        
        -- 階層ボーナス率を取得
        v_hierarchy_bonus_rate := get_hierarchy_bonus_rate(
            (SELECT tier_level FROM agencies WHERE id = NEW.agency_id),
            v_agency.tier_level,
            NEW.sold_at
        );
        
        IF v_hierarchy_bonus_rate > 0 THEN
            v_hierarchy_bonus_amount := NEW.total_amount * (v_hierarchy_bonus_rate / 100);
            
            -- 階層ボーナスの控除計算
            IF v_agency.tax_info->>'invoice_registered' = 'false' THEN
                v_invoice_deduction := v_hierarchy_bonus_amount * 0.02;
            ELSE
                v_invoice_deduction := 0;
            END IF;
            
            IF v_agency.company_type = 'individual' THEN
                v_withholding_tax := FLOOR(v_hierarchy_bonus_amount * 0.1021);
            ELSE
                v_withholding_tax := 0;
            END IF;
            
            v_final_amount := v_hierarchy_bonus_amount - v_invoice_deduction - v_withholding_tax;
            
            -- 階層ボーナスを登録
            INSERT INTO commissions (
                agency_id,
                sales_id,
                commission_type,
                base_amount,
                commission_rate,
                commission_amount,
                invoice_deduction,
                withholding_tax,
                final_amount,
                month,
                status,
                related_agency_id
            ) VALUES (
                v_parent_agency_id,
                NEW.id,
                'hierarchy',
                NEW.total_amount,
                v_hierarchy_bonus_rate,
                v_hierarchy_bonus_amount,
                v_invoice_deduction,
                v_withholding_tax,
                v_final_amount,
                DATE_TRUNC('month', NEW.sold_at)::DATE,
                'pending',
                NEW.agency_id
            );
        END IF;
        
        -- 次の親代理店へ
        v_parent_agency_id := v_agency.parent_agency_id;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 売上登録時の報酬計算トリガー
CREATE TRIGGER trigger_calculate_commission
    AFTER INSERT ON sales
    FOR EACH ROW
    WHEN (NEW.is_cancelled = false)
    EXECUTE FUNCTION calculate_commission_on_sale();

-- 代理店統計更新関数
CREATE OR REPLACE FUNCTION update_agency_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- 売上統計を更新
    UPDATE agencies
    SET total_sales = (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM sales
        WHERE agency_id = COALESCE(NEW.agency_id, OLD.agency_id)
            AND is_cancelled = false
    )
    WHERE id = COALESCE(NEW.agency_id, OLD.agency_id);
    
    -- 報酬統計を更新
    UPDATE agencies
    SET total_commission = (
        SELECT COALESCE(SUM(final_amount), 0)
        FROM commissions
        WHERE agency_id = COALESCE(NEW.agency_id, OLD.agency_id)
            AND status = 'confirmed'
    )
    WHERE id = COALESCE(NEW.agency_id, OLD.agency_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 売上変更時の統計更新トリガー
CREATE TRIGGER update_agency_stats_on_sale
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_agency_statistics();

-- アクティブな子代理店数を更新する関数
CREATE OR REPLACE FUNCTION update_active_sub_agencies_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 親代理店のアクティブな子代理店数を更新
    IF NEW.parent_agency_id IS NOT NULL THEN
        UPDATE agencies
        SET active_sub_agencies = (
            SELECT COUNT(*)
            FROM agencies
            WHERE parent_agency_id = NEW.parent_agency_id
                AND status = 'active'
        )
        WHERE id = NEW.parent_agency_id;
    END IF;
    
    -- 旧親代理店の数も更新（親が変更された場合）
    IF OLD.parent_agency_id IS NOT NULL AND OLD.parent_agency_id != NEW.parent_agency_id THEN
        UPDATE agencies
        SET active_sub_agencies = (
            SELECT COUNT(*)
            FROM agencies
            WHERE parent_agency_id = OLD.parent_agency_id
                AND status = 'active'
        )
        WHERE id = OLD.parent_agency_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 代理店ステータス変更時のトリガー
CREATE TRIGGER update_sub_agencies_count
    AFTER INSERT OR UPDATE OR DELETE ON agencies
    FOR EACH ROW
    EXECUTE FUNCTION update_active_sub_agencies_count();

-- 月次締め処理関数
CREATE OR REPLACE FUNCTION process_monthly_payment(
    p_target_month DATE,
    p_processed_by UUID
)
RETURNS TABLE (
    agency_id UUID,
    payment_amount DECIMAL,
    status TEXT
) AS $$
DECLARE
    v_agency RECORD;
    v_total_commission DECIMAL;
    v_total_deductions DECIMAL;
    v_payment_amount DECIMAL;
    v_payment_id UUID;
BEGIN
    -- 対象月の報酬を確定
    UPDATE commissions
    SET status = 'confirmed',
        confirmed_at = CURRENT_TIMESTAMP,
        confirmed_by = p_processed_by
    WHERE month = p_target_month
        AND status = 'pending';
    
    -- 代理店ごとに支払いデータを作成
    FOR v_agency IN
        SELECT DISTINCT c.agency_id, a.company_name
        FROM commissions c
        JOIN agencies a ON c.agency_id = a.id
        WHERE c.month = p_target_month
            AND c.status = 'confirmed'
            AND a.status = 'active'
    LOOP
        -- 報酬合計を計算
        SELECT 
            SUM(commission_amount) as total_commission,
            SUM(invoice_deduction + withholding_tax + other_deductions) as total_deductions,
            SUM(final_amount) as payment_amount
        INTO v_total_commission, v_total_deductions, v_payment_amount
        FROM commissions
        WHERE agency_id = v_agency.agency_id
            AND month = p_target_month
            AND status = 'confirmed';
        
        -- 最低支払額チェック（10,000円）
        IF v_payment_amount >= 10000 THEN
            -- 支払いデータを作成
            INSERT INTO payments (
                agency_id,
                payment_month,
                total_sales,
                total_commission,
                total_deductions,
                payment_amount,
                payment_date,
                status,
                processed_by
            ) VALUES (
                v_agency.agency_id,
                p_target_month,
                (SELECT SUM(base_amount) FROM commissions 
                 WHERE agency_id = v_agency.agency_id 
                    AND month = p_target_month 
                    AND commission_type = 'direct'),
                v_total_commission,
                v_total_deductions,
                v_payment_amount,
                p_target_month + INTERVAL '1 month' + INTERVAL '24 days', -- 翌月25日
                'pending',
                p_processed_by
            )
            RETURNING id INTO v_payment_id;
            
            RETURN QUERY SELECT v_agency.agency_id, v_payment_amount, 'created'::TEXT;
        ELSE
            -- 最低支払額未満の場合は翌月に繰り越し
            UPDATE commissions
            SET month = month + INTERVAL '1 month'
            WHERE agency_id = v_agency.agency_id
                AND month = p_target_month
                AND status = 'confirmed';
            
            RETURN QUERY SELECT v_agency.agency_id, v_payment_amount, 'carried_forward'::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- スパム検知関数
CREATE OR REPLACE FUNCTION check_spam_activity(
    p_ip_address INET,
    p_action_type VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_is_spam BOOLEAN := false;
BEGIN
    -- IPアドレスベースの制限チェック
    CASE p_action_type
        WHEN 'login' THEN
            SELECT COUNT(*) INTO v_count
            FROM activity_logs
            WHERE ip_address = p_ip_address
                AND action_type = 'login_attempt'
                AND created_at > CURRENT_TIMESTAMP - INTERVAL '15 minutes';
            
            IF v_count >= 5 THEN
                v_is_spam := true;
            END IF;
            
        WHEN 'registration' THEN
            SELECT COUNT(*) INTO v_count
            FROM activity_logs
            WHERE ip_address = p_ip_address
                AND action_type = 'agency_registration'
                AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 day';
            
            IF v_count >= 5 THEN
                v_is_spam := true;
            END IF;
            
        WHEN 'invitation' THEN
            SELECT COUNT(*) INTO v_count
            FROM invitation_links
            WHERE inviter_agency_id IN (
                SELECT agency_id 
                FROM activity_logs 
                WHERE ip_address = p_ip_address
            )
            AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour';
            
            IF v_count >= 10 THEN
                v_is_spam := true;
            END IF;
    END CASE;
    
    RETURN v_is_spam;
END;
$$ LANGUAGE plpgsql;