// 設定管理用Supabaseデータベースクラス
class SettingsSupabaseDB {
    constructor() {
        // Supabaseクライアントを初期化
        const supabaseClient = initializeSupabase();
        
        if (!supabaseClient) {
            console.error('Supabaseクライアントの初期化に失敗しました');
            this.client = null;
            return;
        }
        
        this.client = supabaseClient;
    }
    
    // 特定カテゴリの設定を取得
    async getSettings(category) {
        if (!this.client) {
            return { data: this.getDefaultSettings(category), error: 'Supabase not initialized' };
        }
        
        try {
            const { data, error } = await this.client
                .from('system_settings')
                .select('*')
                .eq('category', category)
                .single();
            
            if (error && error.code === 'PGRST116') {
                // データがない場合はデフォルト値を返す
                return { data: this.getDefaultSettings(category), error: null };
            }
            
            if (error) throw error;
            
            return { data: data?.settings || this.getDefaultSettings(category), error: null };
        } catch (error) {
            console.error(`${category}設定取得エラー:`, error);
            return { data: this.getDefaultSettings(category), error };
        }
    }
    
    // 設定を保存
    async saveSettings(category, settings) {
        if (!this.client) {
            return { data: null, error: 'Supabase not initialized' };
        }
        
        try {
            const { data: existingData, error: fetchError } = await this.client
                .from('system_settings')
                .select('*')
                .eq('category', category)
                .single();
            
            let result;
            if (existingData && !fetchError) {
                // 更新
                const { data, error } = await this.client
                    .from('system_settings')
                    .update({ settings, updated_at: new Date().toISOString() })
                    .eq('id', existingData.id)
                    .select();
                result = { data, error };
            } else {
                // 新規作成
                const { data, error } = await this.client
                    .from('system_settings')
                    .insert({ category, settings, created_at: new Date().toISOString() })
                    .select();
                result = { data, error };
            }
            
            if (result.error) throw result.error;
            
            // 履歴に保存
            await this.saveSettingsHistory(category, settings);
            
            return result;
        } catch (error) {
            console.error(`${category}設定保存エラー:`, error);
            return { data: null, error };
        }
    }
    
    // 全設定を取得
    async getAllSettings() {
        if (!this.client) {
            // デモモード用のデフォルト設定を返す
            return { 
                data: {
                    general: this.getDefaultSettings('general'),
                    commission: this.getDefaultSettings('commission'),
                    notification: this.getDefaultSettings('notification'),
                    security: this.getDefaultSettings('security'),
                    api: this.getDefaultSettings('api'),
                    backup: this.getDefaultSettings('backup')
                }, 
                error: null 
            };
        }
        
        try {
            const { data, error } = await this.client
                .from('system_settings')
                .select('*');
            
            if (error) throw error;
            
            // カテゴリごとにまとめる
            const settings = {};
            if (data && Array.isArray(data)) {
                data.forEach(item => {
                    settings[item.category] = item.settings;
                });
            }
            
            // 不足しているカテゴリはデフォルト値を使用
            const categories = ['general', 'commission', 'notification', 'security', 'api', 'backup'];
            categories.forEach(cat => {
                if (!settings[cat]) {
                    settings[cat] = this.getDefaultSettings(cat);
                }
            });
            
            return { data: settings, error: null };
        } catch (error) {
            console.error('全設定取得エラー:', error);
            return { data: null, error };
        }
    }

    // デフォルト設定を返す
    getDefaultSettings(category) {
        const defaults = {
            general: {
                systemName: '多段階営業代理店管理システム',
                companyName: '株式会社サンプル',
                adminEmail: 'admin@example.com',
                timezone: 'Asia/Tokyo',
                language: 'ja',
                dateFormat: 'YYYY-MM-DD'
            },
            commission: {
                tier1Rate: 30,
                tier2Rate: 20,
                tier3Rate: 15,
                tier4Rate: 10,
                bonusThreshold: 1000000,
                bonusRate: 5,
                calculateTiming: 'monthly',
                paymentTiming: 'next_month_end'
            },
            notification: {
                emailEnabled: true,
                smsEnabled: false,
                newSaleNotification: true,
                commissionNotification: true,
                paymentNotification: true,
                systemAlertNotification: true
            },
            security: {
                sessionTimeout: 3600,
                maxLoginAttempts: 5,
                lockDuration: 30,
                passwordMinLength: 8,
                requireUppercase: true,
                requireSpecialChar: true,
                requireNumber: true,
                twoFactorEnabled: false
            },
            api: {
                rateLimit: 100,
                rateLimitWindow: 60,
                apiKeyRequired: true,
                allowedOrigins: ['*'],
                debugMode: false
            },
            backup: {
                autoBackupEnabled: true,
                backupInterval: 'daily',
                backupTime: '03:00',
                backupRetention: 30,
                backupLocation: 'cloud'
            }
        };
        
        return defaults[category] || {};
    }
    
    // 設定履歴を保存
    async saveSettingsHistory(category, settings) {
        if (!this.client) return;
        
        try {
            await this.client
                .from('settings_history')
                .insert({
                    category,
                    settings,
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('設定履歴保存エラー:', error);
        }
    }
    
    // 設定履歴を取得
    async getSettingsHistory(category, limit = 10) {
        if (!this.client) {
            return { data: [], error: 'Supabase not initialized' };
        }
        
        try {
            const { data, error } = await this.client
                .from('settings_history')
                .select('*')
                .eq('category', category)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            console.error('設定履歴取得エラー:', error);
            return { data: [], error };
        }
    }
    
    // システム統計を取得
    async getSystemStats() {
        if (!this.client) {
            // デモデータを返す
            return {
                data: {
                    totalAgencies: 4,
                    activeAgencies: 3,
                    totalSales: 150,
                    totalRevenue: 15000000,
                    totalCommissions: 3000000,
                    averageCommissionRate: 20
                },
                error: null
            };
        }
        
        // 実際のデータベースから統計を取得
        // ここは簡略化のため、基本的な実装のみ
        return this.getSystemStats();
    }
    
    // API使用状況を取得
    async getApiUsageLogs(startDate) {
        if (!this.client) {
            return { data: [], error: 'Supabase not initialized' };
        }
        
        try {
            const { data, error } = await this.client
                .from('api_usage_logs')
                .select('*')
                .gte('date', startDate.toISOString())
                .order('date', { ascending: false });
            
            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            console.error('API使用状況取得エラー:', error);
            return { data: [], error };
        }
    }
    
    // バックアップ履歴を取得
    async getBackupHistory() {
        if (!this.client) {
            return { data: [], error: 'Supabase not initialized' };
        }
        
        try {
            const { data, error } = await this.client
                .from('backup_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            console.error('バックアップ履歴取得エラー:', error);
            return { data: [], error };
        }
    }
}

// エクスポート（モジュールとして使用する場合）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsSupabaseDB;
}