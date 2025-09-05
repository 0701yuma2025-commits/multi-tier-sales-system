// 設定管理用Supabaseデータベースクラス
class SettingsSupabaseDB {
    constructor() {
        // グローバルのSupabaseインスタンスを使用
        if (window.supabaseDb) {
            this.client = window.supabaseDb;
        } else {
            // フォールバック：新規作成を試みる
            this.client = initializeSupabase();
        }
        
        if (!this.client) {
            console.error('Supabaseクライアントの初期化に失敗しました');
            this.client = null;
        }
    }

    // 設定取得
    async getSettings(category) {
        if (!this.client) {
            return { data: this.getDefaultSettings(category), error: null };
        }
        
        try {
            const data = await this.client.request(`system_settings?category=eq.${category}`);
            
            // データがない場合はデフォルト値を返す
            if (!data || data.length === 0) {
                return { data: this.getDefaultSettings(category), error: null };
            }
            
            return { data: data[0].settings, error: null };
        } catch (error) {
            console.error('設定取得エラー:', error);
            return { data: this.getDefaultSettings(category), error };
        }
    }

    // 設定保存
    async saveSettings(category, settings) {
        if (!this.client) {
            console.warn('Supabaseクライアントが利用できません');
            return { data: null, error: new Error('設定の保存にはSupabaseの設定が必要です') };
        }
        
        try {
            // 既存の設定を確認
            const existingData = await this.client.request(`system_settings?category=eq.${category}`);
            
            let result;
            if (existingData && existingData.length > 0) {
                // 更新
                result = await this.client.request(`system_settings?id=eq.${existingData[0].id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        settings: settings,
                        updated_at: new Date().toISOString()
                    })
                });
            } else {
                // 新規作成
                result = await this.client.request('system_settings', {
                    method: 'POST',
                    body: JSON.stringify({
                        category: category,
                        settings: settings
                    })
                });
            }
            
            return { data: result, error: null };
        } catch (error) {
            console.error('設定保存エラー:', error);
            return { data: null, error };
        }
    }

    // すべての設定を取得
    async getAllSettings() {
        if (!this.client) {
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
            const data = await this.client.request('system_settings?select=*');
            
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
                language: 'ja'
            },
            commission: {
                tier1: { rate: 30, bonus: 10 },
                tier2: { rate: 25, bonus: 8 },
                tier3: { rate: 20, bonus: 6 },
                tier4: { rate: 15, bonus: 4 },
                autoApprove: false,
                hierarchyBonus: true,
                campaignBonus: false
            },
            notification: {
                newAgency: true,
                newSale: true,
                payment: true,
                monthlyReport: false,
                method: 'email',
                frequency: 'realtime'
            },
            security: {
                minPasswordLength: 8,
                requireUppercase: true,
                requireNumbers: true,
                requireSpecial: false,
                maxLoginAttempts: 5,
                lockDuration: 30,
                require2FA: false,
                ipRestriction: false
            },
            api: {
                publicKey: 'pk_test_default123456789',
                secretKey: 'sk_test_default123456789',
                webhookUrl: 'https://api.example.com/webhook'
            },
            backup: {
                autoBackup: true,
                backupRetention: 30,
                backupTime: '03:00'
            }
        };
        
        return defaults[category] || {};
    }

    // 設定履歴を取得
    async getSettingsHistory(category, limit = 10) {
        if (!this.client) {
            return { data: [], error: null };
        }
        
        try {
            const data = await this.client.request(`settings_history?category=eq.${category}&order=created_at.desc&limit=${limit}`);
            
            return { data: data || [], error: null };
        } catch (error) {
            console.error('設定履歴取得エラー:', error);
            return { data: [], error };
        }
    }

    // 設定をリセット
    async resetSettings(category) {
        const defaultSettings = this.getDefaultSettings(category);
        return await this.saveSettings(category, defaultSettings);
    }

    // API使用状況を取得
    async getApiUsageStats(days = 7) {
        if (!this.client) {
            // デモデータ
            return { 
                data: [
                    { date: '2024-03-15', requests: 1234, success_rate: 99.2, avg_response_time: 124 },
                    { date: '2024-03-14', requests: 1189, success_rate: 99.5, avg_response_time: 118 },
                    { date: '2024-03-13', requests: 1302, success_rate: 98.9, avg_response_time: 132 }
                ],
                error: null 
            };
        }
        
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const data = await this.client.request(`api_usage_logs?date=gte.${startDate.toISOString()}&order=date.desc`);
            
            return { data: data || [], error: null };
        } catch (error) {
            console.error('API使用状況取得エラー:', error);
            return { data: [], error };
        }
    }

    // バックアップ履歴を取得
    async getBackupHistory() {
        if (!this.client) {
            // デモデータ
            return {
                data: [
                    { id: 1, created_at: '2024-03-15T03:00:00Z', size: '125MB', status: 'completed' },
                    { id: 2, created_at: '2024-03-14T03:00:00Z', size: '124MB', status: 'completed' },
                    { id: 3, created_at: '2024-03-13T03:00:00Z', size: '123MB', status: 'completed' }
                ],
                error: null
            };
        }
        
        try {
            const data = await this.client.request('backup_history?order=created_at.desc&limit=20');
            
            return { data: data || [], error: null };
        } catch (error) {
            console.error('バックアップ履歴取得エラー:', error);
            return { data: [], error };
        }
    }
}