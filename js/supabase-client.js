// Supabaseクライアント
class SupabaseDatabase {
    constructor() {
        // 環境変数（実際の値はHTMLファイルで設定）
        this.supabaseUrl = window.SUPABASE_URL || '';
        this.supabaseAnonKey = window.SUPABASE_ANON_KEY || '';
        
        // 初期化チェック
        if (!this.supabaseUrl || !this.supabaseAnonKey) {
            throw new Error('Supabase環境変数が設定されていません。');
        }
        this.headers = {
            'apikey': this.supabaseAnonKey,
            'Authorization': `Bearer ${this.supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }
    
    // APIリクエスト共通処理
    async request(endpoint, options = {}) {
        
        const url = `${this.supabaseUrl}/rest/v1/${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.headers,
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Supabase Error: ${error}`);
        }
        
        return response.json();
    }
    
    // 代理店一覧取得
    async getAgencies() {
        try {
            const agencies = await this.request('agencies?select=*');
            return agencies;
        } catch (error) {
            console.error('代理店取得エラー:', error);
            throw error;
        }
    }
    
    // 商品一覧取得
    async getProducts() {
        try {
            const products = await this.request('products?select=*');
            return products;
        } catch (error) {
            console.error('商品取得エラー:', error);
            throw error;
        }
    }
    
    // 売上一覧取得
    async getSales(filters = {}) {
        try {
            let endpoint = 'sales?select=*,agencies(company_name),products(name),commissions(*)';
            
            // フィルター適用
            const params = [];
            if (filters.dateFrom) {
                params.push(`sale_date.gte.${filters.dateFrom}`);
            }
            if (filters.dateTo) {
                params.push(`sale_date.lte.${filters.dateTo}`);
            }
            if (filters.status) {
                params.push(`status.eq.${filters.status}`);
            }
            if (filters.agencyId) {
                params.push(`agency_id.eq.${filters.agencyId}`);
            }
            
            if (params.length > 0) {
                endpoint += '&' + params.join('&');
            }
            
            // 日付順にソート
            endpoint += '&order=sale_date.desc';
            
            const sales = await this.request(endpoint);
            return sales;
        } catch (error) {
            console.error('売上取得エラー:', error);
            throw error;
        }
    }
    
    // 売上追加
    async addSale(saleData) {
        try {
            // 売上ID生成
            const saleId = this.generateSaleId();
            
            // 売上データ作成
            const sale = {
                id: saleId,
                agency_id: saleData.agencyId,
                product_id: saleData.product,
                customer_name: saleData.customerName,
                quantity: saleData.quantity || 1,
                unit_price: saleData.unitPrice || saleData.amount,
                amount: saleData.amount,
                status: saleData.status || 'confirmed',
                sale_date: saleData.date,
                notes: saleData.notes || null
            };
            
            // 売上を保存
            const savedSale = await this.request('sales', {
                method: 'POST',
                body: JSON.stringify(sale)
            });
            
            // 報酬計算と保存
            const commissions = await this.calculateCommissions(savedSale[0]);
            for (const commission of commissions) {
                await this.request('commissions', {
                    method: 'POST',
                    body: JSON.stringify({
                        ...commission,
                        sale_id: savedSale[0].id
                    })
                });
            }
            
            return savedSale[0];
        } catch (error) {
            console.error('売上追加エラー:', error);
            throw error;
        }
    }
    
    // 売上ID生成
    generateSaleId() {
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 10000);
        return `S-${year}-${String(random).padStart(4, '0')}`;
    }
    
    // 報酬計算
    async calculateCommissions(saleData) {
        // 代理店と商品情報を取得
        const agencies = await this.getAgencies();
        const products = await this.getProducts();
        
        const agency = agencies.find(a => a.id === saleData.agency_id);
        const product = products.find(p => p.id === saleData.product_id);
        
        if (!agency || !product) return [];
        
        const commissions = [];
        
        // 商品別の報酬率を使用
        const tierRates = typeof product.tier_rates === 'string' 
            ? JSON.parse(product.tier_rates) 
            : product.tier_rates;
        const commissionRate = (tierRates[agency.tier_level] || 0) / 100;
        
        // 階層ボーナス
        const hierarchyBonus = {
            tier1_from_tier2: 0.02,
            tier2_from_tier3: 0.015,
            tier3_from_tier4: 0.01
        };
        
        // 現在の代理店の基本報酬
        commissions.push({
            agency_id: agency.id,
            amount: Math.floor(saleData.amount * commissionRate),
            rate: commissionRate,
            type: 'base'
        });
        
        // 上位代理店への階層ボーナス
        let currentAgency = agency;
        
        while (currentAgency.parent_agency_id) {
            const parentAgency = agencies.find(a => a.id === currentAgency.parent_agency_id);
            if (parentAgency) {
                let bonusRate = 0;
                
                if (currentAgency.tier_level === 2 && parentAgency.tier_level === 1) {
                    bonusRate = hierarchyBonus.tier1_from_tier2;
                } else if (currentAgency.tier_level === 3 && parentAgency.tier_level === 2) {
                    bonusRate = hierarchyBonus.tier2_from_tier3;
                } else if (currentAgency.tier_level === 4 && parentAgency.tier_level === 3) {
                    bonusRate = hierarchyBonus.tier3_from_tier4;
                }
                
                if (bonusRate > 0) {
                    commissions.push({
                        agency_id: parentAgency.id,
                        amount: Math.floor(saleData.amount * bonusRate),
                        rate: bonusRate,
                        type: 'hierarchy_bonus'
                    });
                }
                
                currentAgency = parentAgency;
            } else {
                break;
            }
        }
        
        return commissions;
    }
    
    // 売上削除
    async deleteSale(saleId) {
        try {
            // まず報酬を削除
            await this.request(`commissions?sale_id=eq.${saleId}`, {
                method: 'DELETE'
            });
            
            // 次に売上を削除
            await this.request(`sales?id=eq.${saleId}`, {
                method: 'DELETE'
            });
            
            return true;
        } catch (error) {
            console.error('売上削除エラー:', error);
            throw error;
        }
    }
    
    // 売上統計取得
    async getSalesStats() {
        try {
            const sales = await this.getSales();
            
            // 今月の売上
            const now = new Date();
            const thisMonth = sales.filter(s => {
                const saleDate = new Date(s.sale_date);
                return saleDate.getMonth() === now.getMonth() && 
                       saleDate.getFullYear() === now.getFullYear() &&
                       s.status !== 'cancelled';
            });
            
            const totalAmount = thisMonth.reduce((sum, s) => sum + Number(s.amount), 0);
            const count = thisMonth.length;
            const average = count > 0 ? totalAmount / count : 0;
            
            // 前月の売上（簡易計算）
            const growth = 15.3; // デモ用の固定値
            
            return {
                total: totalAmount,
                count: count,
                average: Math.floor(average),
                growth: growth
            };
        } catch (error) {
            console.error('統計取得エラー:', error);
            return { total: 0, count: 0, average: 0, growth: 0 };
        }
    }
    
    // 認証: ログイン
    async login(email, password) {
        // Supabase認証
        try {
            const response = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });
            
            if (!response.ok) {
                throw new Error('ログイン失敗');
            }
            
            const data = await response.json();
            return { success: true, data: data };
        } catch (error) {
            console.error('ログインエラー:', error);
            return { success: false, error: error.message };
        }
    }
}

// Supabaseクライアントの初期化関数
function initializeSupabase() {
    try {
        const db = new SupabaseDatabase();
        return db;
    } catch (error) {
        console.error('Supabase初期化エラー:', error);
        return null;
    }
}

// グローバルにSupabaseクライアントを作成（遅延初期化）
window.initializeSupabaseDb = function() {
    if (!window.supabaseDb) {
        try {
            window.supabaseDb = new SupabaseDatabase();
        } catch (error) {
            console.error('Supabaseデータベース初期化エラー:', error);
            window.supabaseDb = null;
        }
    }
    return window.supabaseDb;
};

// DOMContentLoadedで初期化を試みる
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initializeSupabaseDb);
} else {
    // 既に読み込み済みの場合
    window.initializeSupabaseDb();
}