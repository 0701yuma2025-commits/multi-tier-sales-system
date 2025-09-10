// 売上管理用Supabaseデータベース操作
class SalesSupabaseDB {
    constructor() {
        this.client = null;
        this.initialize();
    }
    
    initialize() {
        this.client = initializeSupabase();
        if (!this.client) {
            throw new Error('Supabaseクライアントの初期化に失敗しました');
        }
    }
    
    // 売上データ取得
    async getSales(filters = {}) {
        try {
            let query = this.client
                .from('sales')
                .select(`
                    *,
                    agencies:agency_id (
                        id,
                        company_name,
                        tier_level
                    ),
                    products:product_id (
                        id,
                        name,
                        price
                    )
                `)
                .order('sale_date', { ascending: false });
            
            // フィルター適用
            if (filters.startDate && filters.endDate) {
                query = query
                    .gte('sale_date', filters.startDate)
                    .lte('sale_date', filters.endDate);
            }
            
            if (filters.agencyId) {
                query = query.eq('agency_id', filters.agencyId);
            }
            
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            // 各売上の報酬も取得
            for (let sale of data) {
                const { data: commissions } = await this.client
                    .from('commissions')
                    .select('amount')
                    .eq('sale_id', sale.id);
                
                sale.commissions = commissions || [];
            }
            
            return data;
        } catch (error) {
            console.error('売上データ取得エラー:', error);
            throw error;
        }
    }
    
    // 売上統計取得
    async getSalesStats() {
        try {
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
            
            // 今月のデータ
            const { data: thisMonth } = await this.client
                .from('sales')
                .select('amount')
                .gte('sale_date', thisMonthStart)
                .lte('sale_date', thisMonthEnd)
                .eq('status', 'confirmed');
            
            // 先月のデータ
            const { data: lastMonth } = await this.client
                .from('sales')
                .select('amount')
                .gte('sale_date', lastMonthStart)
                .lte('sale_date', lastMonthEnd)
                .eq('status', 'confirmed');
            
            const thisMonthTotal = thisMonth?.reduce((sum, sale) => sum + sale.amount, 0) || 0;
            const lastMonthTotal = lastMonth?.reduce((sum, sale) => sum + sale.amount, 0) || 0;
            const thisMonthCount = thisMonth?.length || 0;
            
            const growth = lastMonthTotal > 0 
                ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
                : 0;
            
            return {
                total: thisMonthTotal,
                count: thisMonthCount,
                average: thisMonthCount > 0 ? Math.round(thisMonthTotal / thisMonthCount) : 0,
                growth: growth
            };
        } catch (error) {
            console.error('統計取得エラー:', error);
            return {
                total: 0,
                count: 0,
                average: 0,
                growth: 0
            };
        }
    }
    
    // 売上登録
    async createSale(saleData) {
        try {
            // 売上番号を生成
            const saleId = 'S' + Date.now().toString().slice(-8);
            
            // 売上データを作成
            const sale = {
                id: saleId,
                sale_date: saleData.date,
                agency_id: saleData.agencyId,
                product_id: saleData.product,
                customer_name: saleData.customerName,
                amount: saleData.amount,
                status: saleData.status || 'confirmed',
                notes: saleData.notes || null
            };
            
            // 売上を登録
            const { data: newSale, error: saleError } = await this.client
                .from('sales')
                .insert([sale])
                .select()
                .single();
            
            if (saleError) throw saleError;
            
            // 報酬を自動計算して登録
            await this.calculateAndCreateCommissions(newSale);
            
            return newSale;
        } catch (error) {
            console.error('売上登録エラー:', error);
            throw error;
        }
    }
    
    // 報酬計算と登録
    async calculateAndCreateCommissions(sale) {
        try {
            // 代理店情報を取得
            const { data: agency } = await this.client
                .from('agencies')
                .select('*, parent_agency_id')
                .eq('id', sale.agency_id)
                .single();
            
            // 商品情報を取得
            const { data: product } = await this.client
                .from('products')
                .select('*')
                .eq('id', sale.product_id)
                .single();
            
            const commissions = [];
            
            // 直接販売報酬
            const directRate = product.tier_rates?.[agency.tier_level] || product.base_rate || 10;
            const saleDate = new Date(sale.sale_date);
            const period = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
            
            const directCommission = {
                sale_id: sale.id,
                agency_id: agency.id,
                amount: Math.floor(sale.amount * directRate / 100),
                rate: directRate,
                type: 'direct',
                status: 'unpaid',
                period: period  // period追加
            };
            commissions.push(directCommission);
            
            // 階層ボーナス計算
            let currentAgency = agency;
            let level = 1;
            const bonusRates = { 1: 10, 2: 8, 3: 6, 4: 4 };
            
            while (currentAgency.parent_agency_id && level <= 4) {
                const { data: parentAgency } = await this.client
                    .from('agencies')
                    .select('*')
                    .eq('id', currentAgency.parent_agency_id)
                    .single();
                
                if (!parentAgency) break;
                
                const bonusRate = bonusRates[level];
                const bonusCommission = {
                    sale_id: sale.id,
                    agency_id: parentAgency.id,
                    amount: Math.floor(sale.amount * bonusRate / 100),
                    rate: bonusRate,
                    type: `hierarchy_${level}`,
                    status: 'unpaid',
                    period: period  // period追加
                };
                commissions.push(bonusCommission);
                
                currentAgency = parentAgency;
                level++;
            }
            
            // 報酬を一括登録
            if (commissions.length > 0) {
                const { error } = await this.client
                    .from('commissions')
                    .insert(commissions);
                
                if (error) throw error;
            }
            
            return commissions;
        } catch (error) {
            console.error('報酬計算エラー:', error);
            throw error;
        }
    }
    
    // 売上更新
    async updateSale(saleId, updateData) {
        try {
            const { data, error } = await this.client
                .from('sales')
                .update(updateData)
                .eq('id', saleId)
                .select()
                .single();
            
            if (error) throw error;
            
            return { data, error: null };
        } catch (error) {
            console.error('売上更新エラー:', error);
            return { data: null, error };
        }
    }
    
    // 売上削除
    async deleteSale(saleId) {
        try {
            // 関連する報酬も削除（CASCADE設定されていない場合）
            await this.client
                .from('commissions')
                .delete()
                .eq('sale_id', saleId);
            
            // 売上を削除
            const { error } = await this.client
                .from('sales')
                .delete()
                .eq('id', saleId);
            
            if (error) throw error;
        } catch (error) {
            console.error('売上削除エラー:', error);
            throw error;
        }
    }
    
    // 代理店一覧取得
    async getAgencies() {
        try {
            const { data, error } = await this.client
                .from('agencies')
                .select('*')
                .eq('status', 'active')
                .order('tier_level', { ascending: true })
                .order('company_name', { ascending: true });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('代理店取得エラー:', error);
            return { data: null, error };
        }
    }
    
    // 商品一覧取得
    async getProducts() {
        try {
            const { data, error } = await this.client
                .from('products')
                .select('*')
                .order('id', { ascending: true });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('商品取得エラー:', error);
            return { data: null, error };
        }
    }
}