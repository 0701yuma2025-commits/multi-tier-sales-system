// 代理店管理用Supabaseデータベース操作
class AgenciesSupabaseDB {
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
    
    // 代理店一覧取得
    async getAgencies(filters = {}) {
        try {
            let query = this.client
                .from('agencies')
                .select(`
                    *,
                    parent_agency:parent_agency_id (
                        id,
                        company_name
                    )
                `)
                .order('created_at', { ascending: false });
            
            // フィルター適用
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            
            if (filters.tierLevel) {
                query = query.eq('tier_level', filters.tierLevel);
            }
            
            if (filters.search) {
                query = query.or(`company_name.ilike.%${filters.search}%,representative->>'email'.ilike.%${filters.search}%`);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            
            // 各代理店の売上合計を計算
            for (let agency of data) {
                const { data: sales } = await this.client
                    .from('sales')
                    .select('amount')
                    .eq('agency_id', agency.id)
                    .eq('status', 'confirmed');
                
                agency.total_sales = sales ? sales.reduce((sum, s) => sum + s.amount, 0) : 0;
                
                // 下位代理店数を取得
                const { data: subAgencies } = await this.client
                    .from('agencies')
                    .select('id')
                    .eq('parent_agency_id', agency.id);
                
                agency.sub_agency_count = subAgencies ? subAgencies.length : 0;
            }
            
            return data;
        } catch (error) {
            console.error('代理店データ取得エラー:', error);
            throw error;
        }
    }
    
    // 代理店詳細取得
    async getAgencyById(id) {
        try {
            const { data, error } = await this.client
                .from('agencies')
                .select(`
                    *,
                    parent_agency:parent_agency_id (
                        id,
                        company_name
                    )
                `)
                .eq('id', id)
                .single();
            
            if (error) throw error;
            
            // 売上履歴を取得
            const { data: sales } = await this.client
                .from('sales')
                .select(`
                    *,
                    products:product_id (
                        name
                    )
                `)
                .eq('agency_id', id)
                .order('sale_date', { ascending: false })
                .limit(10);
            
            data.recent_sales = sales || [];
            
            // 下位代理店を取得
            const { data: subAgencies } = await this.client
                .from('agencies')
                .select('id, company_name, tier_level, status')
                .eq('parent_agency_id', id);
            
            data.sub_agencies = subAgencies || [];
            
            return data;
        } catch (error) {
            console.error('代理店詳細取得エラー:', error);
            throw error;
        }
    }
    
    // 代理店登録
    async createAgency(agencyData) {
        try {
            // company_typeを日本語に変換
            const companyTypeMap = {
                'corporation': '法人',
                'individual': '個人'
            };
            
            const agency = {
                company_name: agencyData.companyName,
                company_type: companyTypeMap[agencyData.companyType] || agencyData.companyType || '法人',
                representative: {
                    name: agencyData.representativeName,
                    email: agencyData.email,
                    phone: agencyData.phone || '',
                    birth_date: agencyData.birthDate || null
                },
                tier_level: parseInt(agencyData.tierLevel) || 1,
                parent_agency_id: agencyData.parentAgencyId || null,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // 銀行口座情報（オプション）
            if (agencyData.bankName || agencyData.branchName) {
                agency.bank_account = {
                    bank_name: agencyData.bankName || '',
                    branch_name: agencyData.branchName || '',
                    account_type: agencyData.accountType || '',
                    account_number: agencyData.accountNumber || '',
                    account_holder: agencyData.accountHolder || ''
                };
            }
            
            // インボイス情報（オプション）
            if (agencyData.invoiceRegistered) {
                agency.invoice_info = {
                    registered: true,
                    number: agencyData.invoiceNumber || '',
                    company_name: agencyData.invoiceCompanyName || agencyData.companyName
                };
            }
            
            console.log('Creating agency with data:', agency);
            
            const { data, error } = await this.client
                .from('agencies')
                .insert([agency])
                .select()
                .single();
            
            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            
            console.log('Agency created successfully:', data);
            return data;
        } catch (error) {
            console.error('代理店登録エラー:', error);
            throw error;
        }
    }
    
    // 代理店更新
    async updateAgency(id, updates) {
        try {
            const updateData = {};
            
            if (updates.companyName !== undefined) updateData.company_name = updates.companyName;
            if (updates.companyType !== undefined) updateData.company_type = updates.companyType;
            if (updates.status !== undefined) updateData.status = updates.status;
            if (updates.tierLevel !== undefined) updateData.tier_level = parseInt(updates.tierLevel);
            
            if (updates.representative) {
                updateData.representative = {
                    name: updates.representative.name,
                    email: updates.representative.email,
                    phone: updates.representative.phone,
                    birth_date: updates.representative.birthDate
                };
            }
            
            updateData.updated_at = new Date().toISOString();
            
            const { data, error } = await this.client
                .from('agencies')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('代理店更新エラー:', error);
            throw error;
        }
    }
    
    // 代理店削除
    async deleteAgency(id) {
        try {
            // 下位代理店の確認
            const { data: subAgencies } = await this.client
                .from('agencies')
                .select('id')
                .eq('parent_agency_id', id);
            
            if (subAgencies && subAgencies.length > 0) {
                throw new Error('下位代理店が存在するため削除できません');
            }
            
            // 売上データの確認
            const { data: sales } = await this.client
                .from('sales')
                .select('id')
                .eq('agency_id', id);
            
            if (sales && sales.length > 0) {
                throw new Error('売上データが存在するため削除できません');
            }
            
            // 削除実行
            const { error } = await this.client
                .from('agencies')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
        } catch (error) {
            console.error('代理店削除エラー:', error);
            throw error;
        }
    }
    
    // 代理店承認
    async approveAgency(id, comment = '') {
        try {
            
            // まず更新を実行
            const { data: updateData, error: updateError } = await this.client
                .from('agencies')
                .update({ 
                    status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);
            
            if (updateError) {
                console.error('更新エラー:', updateError);
                throw updateError;
            }
            
            // 更新後のデータを取得
            const { data, error } = await this.client
                .from('agencies')
                .select()
                .eq('id', id)
                .single();
            
            if (error) {
                console.error('Supabase更新エラー詳細:', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    statusCode: error.statusCode
                });
                throw error;
            }
            
            // 配列の場合は最初の要素を返す
            return Array.isArray(data) ? data[0] : data;
        } catch (error) {
            console.error('代理店承認エラー:', error);
            throw error;
        }
    }
    
    // 代理店ステータス更新
    async updateAgencyStatus(id, status) {
        try {
            const { data: updateData, error: updateError } = await this.client
                .from('agencies')
                .update({ 
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);
            
            if (updateError) {
                console.error('ステータス更新エラー:', updateError);
                throw updateError;
            }
            
            // 更新後のデータを取得
            const { data, error } = await this.client
                .from('agencies')
                .select()
                .eq('id', id)
                .single();
            
            if (error) {
                console.error('データ取得エラー:', error);
                throw error;
            }
            
            return Array.isArray(data) ? data[0] : data;
        } catch (error) {
            console.error('代理店ステータス更新エラー:', error);
            throw error;
        }
    }
    
    // 統計情報取得
    async getAgencyStats() {
        try {
            const { data: agencies } = await this.client
                .from('agencies')
                .select('status, tier_level');
            
            const stats = {
                total: agencies ? agencies.length : 0,
                active: 0,
                pending: 0,
                suspended: 0,
                tierCounts: { 1: 0, 2: 0, 3: 0, 4: 0 }
            };
            
            if (agencies) {
                agencies.forEach(agency => {
                    if (agency.status === 'active') stats.active++;
                    else if (agency.status === 'pending') stats.pending++;
                    else if (agency.status === 'suspended') stats.suspended++;
                    
                    if (agency.tier_level >= 1 && agency.tier_level <= 4) {
                        stats.tierCounts[agency.tier_level]++;
                    }
                });
            }
            
            return stats;
        } catch (error) {
            console.error('統計情報取得エラー:', error);
            return {
                total: 0,
                active: 0,
                pending: 0,
                suspended: 0,
                tierCounts: { 1: 0, 2: 0, 3: 0, 4: 0 }
            };
        }
    }
}