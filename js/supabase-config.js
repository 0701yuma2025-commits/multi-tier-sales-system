// Supabase設定ファイル
// 本番環境用の設定（プロジェクト作成後に値を更新してください）

// LocalStorageから設定を読み込む
function loadSupabaseConfig() {
    // 新形式の設定を優先
    const savedUrl = localStorage.getItem('supabase_url');
    const savedKey = localStorage.getItem('supabase_anon_key');
    
    if (savedUrl && savedKey) {
        return {
            url: savedUrl,
            anonKey: savedKey
        };
    }
    
    // 旧形式の設定も確認
    const savedConfig = localStorage.getItem('supabaseConfig');
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            // 新形式に移行
            if (config.url && config.key) {
                localStorage.setItem('supabase_url', config.url);
                localStorage.setItem('supabase_anon_key', config.key);
                return {
                    url: config.url,
                    anonKey: config.key
                };
            }
        } catch (e) {
            console.error('Supabase設定の読み込みエラー:', e);
        }
    }
    
    return {
        url: 'YOUR_SUPABASE_PROJECT_URL',
        anonKey: 'YOUR_SUPABASE_ANON_KEY'
    };
}

// 設定を読み込んで初期化
const loadedConfig = loadSupabaseConfig();

const SUPABASE_CONFIG = {
    // SupabaseプロジェクトのURL（Settings → APIから取得）
    url: loadedConfig.url,
    
    // Supabase匿名キー（Settings → APIから取得）
    anonKey: loadedConfig.anonKey,
    
    // デバッグモード（本番環境ではfalseに設定）
    debug: true,
    
    // 認証設定
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
};

// Supabaseクライアントの初期化関数
function initializeSupabase() {
    // 既存のクライアントがある場合は再利用
    if (window.supabaseClient) {
        return window.supabaseClient;
    }
    
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase JavaScript client library not loaded');
        return null;
    }
    
    try {
        const supabaseClient = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey,
            {
                auth: SUPABASE_CONFIG.auth
            }
        );
        
        // グローバルに保存
        window.supabaseClient = supabaseClient;
        
        if (SUPABASE_CONFIG.debug) {
            console.log('Supabase client initialized');
        }
        
        return supabaseClient;
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        return null;
    }
}

// データベース操作のヘルパー関数
const supabaseDB = {
    // 代理店データの取得
    async getAgencies(filters = {}) {
        const client = initializeSupabase();
        if (!client) return { data: null, error: 'Supabase client not initialized' };
        
        let query = client.from('agencies').select('*');
        
        // フィルタの適用
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.tierLevel) {
            query = query.eq('tier_level', filters.tierLevel);
        }
        if (filters.parentAgencyId) {
            query = query.eq('parent_agency_id', filters.parentAgencyId);
        }
        
        return await query;
    },
    
    // 商品データの取得
    async getProducts() {
        const client = initializeSupabase();
        if (!client) return { data: null, error: 'Supabase client not initialized' };
        
        return await client.from('products').select('*').order('created_at', { ascending: false });
    },
    
    // 売上データの取得
    async getSales(filters = {}) {
        const client = initializeSupabase();
        if (!client) return { data: null, error: 'Supabase client not initialized' };
        
        let query = client.from('sales').select(`
            *,
            agencies (company_name, company_type),
            products (name, price)
        `);
        
        // フィルタの適用
        if (filters.agencyId) {
            query = query.eq('agency_id', filters.agencyId);
        }
        if (filters.startDate && filters.endDate) {
            query = query.gte('sale_date', filters.startDate).lte('sale_date', filters.endDate);
        }
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        
        return await query.order('sale_date', { ascending: false });
    },
    
    // 報酬データの取得
    async getCommissions(filters = {}) {
        const client = initializeSupabase();
        if (!client) return { data: null, error: 'Supabase client not initialized' };
        
        let query = client.from('commissions').select(`
            *,
            sales (id, customer_name, amount),
            agencies (company_name)
        `);
        
        // フィルタの適用
        if (filters.agencyId) {
            query = query.eq('agency_id', filters.agencyId);
        }
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        
        return await query.order('created_at', { ascending: false });
    },
    
    // 代理店の作成
    async createAgency(agencyData) {
        const client = initializeSupabase();
        if (!client) return { data: null, error: 'Supabase client not initialized' };
        
        return await client.from('agencies').insert([agencyData]).select();
    },
    
    // 売上の記録
    async createSale(saleData) {
        const client = initializeSupabase();
        if (!client) return { data: null, error: 'Supabase client not initialized' };
        
        // 売上を記録
        const { data: sale, error: saleError } = await client
            .from('sales')
            .insert([saleData])
            .select();
        
        if (saleError) return { data: null, error: saleError };
        
        // 報酬を自動計算して記録（実際の実装では、より複雑なロジックが必要）
        // ここは簡略化された例
        
        return { data: sale, error: null };
    },
    
    // 代理店情報の更新
    async updateAgency(agencyId, updates) {
        const client = initializeSupabase();
        if (!client) return { data: null, error: 'Supabase client not initialized' };
        
        return await client
            .from('agencies')
            .update(updates)
            .eq('id', agencyId)
            .select();
    },
    
    // 売上ステータスの更新
    async updateSaleStatus(saleId, status) {
        const client = initializeSupabase();
        if (!client) return { data: null, error: 'Supabase client not initialized' };
        
        return await client
            .from('sales')
            .update({ status })
            .eq('id', saleId)
            .select();
    },
    
    // 報酬ステータスの更新
    async updateCommissionStatus(commissionId, status) {
        const client = initializeSupabase();
        if (!client) return { data: null, error: 'Supabase client not initialized' };
        
        return await client
            .from('commissions')
            .update({ status })
            .eq('id', commissionId)
            .select();
    }
};

// 認証関連のヘルパー関数
const supabaseAuth = {
    // ログイン
    async signIn(email, password) {
        const client = initializeSupabase();
        if (!client) return { data: null, error: 'Supabase client not initialized' };
        
        return await client.auth.signInWithPassword({
            email,
            password
        });
    },
    
    // ログアウト
    async signOut() {
        const client = initializeSupabase();
        if (!client) return { error: 'Supabase client not initialized' };
        
        return await client.auth.signOut();
    },
    
    // 現在のユーザー取得
    async getCurrentUser() {
        const client = initializeSupabase();
        if (!client) return null;
        
        const { data: { user } } = await client.auth.getUser();
        return user;
    },
    
    // セッションの確認
    async getSession() {
        const client = initializeSupabase();
        if (!client) return null;
        
        const { data: { session } } = await client.auth.getSession();
        return session;
    }
};

// リアルタイム更新の設定
const supabaseRealtime = {
    // 売上の変更を監視
    subscribeSalesChanges(callback) {
        const client = initializeSupabase();
        if (!client) return null;
        
        return client
            .channel('sales-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'sales' },
                callback
            )
            .subscribe();
    },
    
    // 代理店の変更を監視
    subscribeAgencyChanges(callback) {
        const client = initializeSupabase();
        if (!client) return null;
        
        return client
            .channel('agency-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'agencies' },
                callback
            )
            .subscribe();
    }
};

// エクスポート（モジュールとして使用する場合）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        initializeSupabase,
        supabaseDB,
        supabaseAuth,
        supabaseRealtime
    };
}