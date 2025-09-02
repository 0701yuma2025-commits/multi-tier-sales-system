// キャンペーン管理用Supabaseデータベースクラス
class CampaignsSupabaseDB {
    constructor() {
        this.client = initializeSupabase();
        if (!this.client) {
            throw new Error('Supabaseクライアントの初期化に失敗しました');
        }
    }

    // キャンペーン一覧取得
    async getCampaigns(filters = {}) {
        try {
            let query = this.client.from('campaigns').select('*');
            
            // フィルタリング
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.type) {
                query = query.eq('type', filters.type);
            }
            if (filters.active) {
                const today = new Date().toISOString().split('T')[0];
                query = query.lte('start_date', today).gte('end_date', today);
            }
            
            const { data, error } = await query.order('created_at', { ascending: false });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('キャンペーン取得エラー:', error);
            return { data: null, error };
        }
    }

    // キャンペーン作成
    async createCampaign(campaignData) {
        try {
            const { data, error } = await this.client
                .from('campaigns')
                .insert(campaignData)
                .select()
                .single();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('キャンペーン作成エラー:', error);
            return { data: null, error };
        }
    }

    // キャンペーン更新
    async updateCampaign(id, updates) {
        try {
            const { data, error } = await this.client
                .from('campaigns')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('キャンペーン更新エラー:', error);
            return { data: null, error };
        }
    }

    // キャンペーン削除
    async deleteCampaign(id) {
        try {
            const { error } = await this.client
                .from('campaigns')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { error: null };
        } catch (error) {
            console.error('キャンペーン削除エラー:', error);
            return { error };
        }
    }

    // キャンペーン終了
    async endCampaign(id) {
        return this.updateCampaign(id, { status: 'ended' });
    }

    // アクティブなキャンペーン取得
    async getActiveCampaigns() {
        const today = new Date().toISOString().split('T')[0];
        
        try {
            const { data, error } = await this.client
                .from('campaigns')
                .select('*')
                .eq('status', 'active')
                .lte('start_date', today)
                .gte('end_date', today)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('アクティブキャンペーン取得エラー:', error);
            return { data: null, error };
        }
    }

    // 特定の商品に適用されるキャンペーン取得
    async getCampaignsForProduct(productId) {
        try {
            const { data, error } = await this.getActiveCampaigns();
            if (error) throw error;
            
            // 商品に適用されるキャンペーンをフィルタ
            const applicableCampaigns = data.filter(campaign => {
                if (!campaign.target_products || campaign.target_products.length === 0) {
                    return true; // 全商品対象
                }
                return campaign.target_products.includes(productId);
            });
            
            return { data: applicableCampaigns, error: null };
        } catch (error) {
            console.error('商品別キャンペーン取得エラー:', error);
            return { data: null, error };
        }
    }

    // 特定の代理店に適用されるキャンペーン取得
    async getCampaignsForAgency(agencyId, tierLevel) {
        try {
            const { data, error } = await this.getActiveCampaigns();
            if (error) throw error;
            
            // 代理店に適用されるキャンペーンをフィルタ
            const applicableCampaigns = data.filter(campaign => {
                if (campaign.target_type === 'all') {
                    return true; // 全代理店対象
                }
                if (campaign.target_type === 'tier' && campaign.target_agencies) {
                    return campaign.target_agencies.includes(tierLevel);
                }
                if (campaign.target_type === 'specific' && campaign.target_agencies) {
                    return campaign.target_agencies.includes(agencyId);
                }
                return false;
            });
            
            return { data: applicableCampaigns, error: null };
        } catch (error) {
            console.error('代理店別キャンペーン取得エラー:', error);
            return { data: null, error };
        }
    }

    // キャンペーンボーナス計算
    calculateBonus(amount, campaign) {
        if (!campaign) return 0;
        
        let bonus = 0;
        if (campaign.bonus_type === 'percentage') {
            bonus = Math.floor(amount * (campaign.bonus_rate / 100));
        } else if (campaign.bonus_type === 'fixed') {
            bonus = campaign.bonus_rate;
        }
        
        // 最小・最大ボーナスの適用
        if (campaign.min_bonus && bonus < campaign.min_bonus) {
            bonus = campaign.min_bonus;
        }
        if (campaign.max_bonus && bonus > campaign.max_bonus) {
            bonus = campaign.max_bonus;
        }
        
        return bonus;
    }

    // 期限切れキャンペーンの自動終了
    async updateExpiredCampaigns() {
        const today = new Date().toISOString().split('T')[0];
        
        try {
            const { data, error } = await this.client
                .from('campaigns')
                .update({ status: 'ended' })
                .eq('status', 'active')
                .lt('end_date', today)
                .select();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('期限切れキャンペーン更新エラー:', error);
            return { data: null, error };
        }
    }
}