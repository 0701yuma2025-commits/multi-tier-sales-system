// 報酬管理用Supabaseデータベースクラス
class CommissionsSupabaseDB {
    constructor() {
        this.client = initializeSupabase();
        if (!this.client) {
            throw new Error('Supabaseクライアントの初期化に失敗しました');
        }
    }

    // 報酬一覧取得
    async getCommissions(period, filters = {}) {
        try {
            let query = this.client
                .from('commissions')
                .select(`
                    *,
                    agencies (
                        id,
                        company_name,
                        tier_level,
                        company_type
                    )
                `)
                .eq('period', period);
            
            // フィルタリング
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.agencyId) {
                query = query.eq('agency_id', filters.agencyId);
            }
            
            const { data, error } = await query.order('created_at', { ascending: false });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('報酬取得エラー:', error);
            return { data: null, error };
        }
    }

    // 報酬作成または更新
    async upsertCommission(commissionData) {
        try {
            // まず既存のデータを確認
            const { data: existing, error: selectError } = await this.client
                .from('commissions')
                .select('id')
                .eq('agency_id', commissionData.agency_id)
                .eq('period', commissionData.period)
                .maybeSingle();
            
            // エラーハンドリング
            if (selectError && selectError.code !== 'PGRST116') {
                throw selectError;
            }
            
            let result;
            if (existing) {
                // 更新
                result = await this.client
                    .from('commissions')
                    .update(commissionData)
                    .eq('id', existing.id)
                    .select()
                    .single();
            } else {
                // 新規作成
                result = await this.client
                    .from('commissions')
                    .insert(commissionData)
                    .select()
                    .single();
            }
            
            if (result.error) throw result.error;
            return { data: result.data, error: null };
        } catch (error) {
            console.error('報酬作成/更新エラー:', error);
            return { data: null, error };
        }
    }

    // 報酬承認
    async approveCommission(id) {
        try {
            const { data: userData } = await this.client.auth.getUser();
            
            const { data, error } = await this.client
                .from('commissions')
                .update({
                    status: 'completed',
                    approved_at: new Date().toISOString(),
                    approved_by: userData?.user?.id
                })
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('報酬承認エラー:', error);
            return { data: null, error };
        }
    }

    // 一括承認
    async approveAllPending(period) {
        try {
            const { data: userData } = await this.client.auth.getUser();
            
            const { data, error } = await this.client
                .from('commissions')
                .update({
                    status: 'completed',
                    approved_at: new Date().toISOString(),
                    approved_by: userData?.user?.id
                })
                .eq('period', period)
                .eq('status', 'pending')
                .select();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('一括承認エラー:', error);
            return { data: null, error };
        }
    }

    // 階層ボーナス一覧取得
    async getHierarchyBonuses(period) {
        try {
            const { data, error } = await this.client
                .from('hierarchy_bonuses')
                .select('*')
                .eq('period', period)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('階層ボーナス取得エラー:', error);
            return { data: null, error };
        }
    }

    // 階層ボーナス作成
    async createHierarchyBonus(bonusData) {
        try {
            const { data, error } = await this.client
                .from('hierarchy_bonuses')
                .insert(bonusData)
                .select()
                .single();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('階層ボーナス作成エラー:', error);
            return { data: null, error };
        }
    }

    // 階層ボーナス承認
    async approveHierarchyBonus(id) {
        try {
            const { data: userData } = await this.client.auth.getUser();
            
            const { data, error } = await this.client
                .from('hierarchy_bonuses')
                .update({
                    status: 'completed',
                    approved_at: new Date().toISOString(),
                    approved_by: userData?.user?.id
                })
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            
            // 承認されたボーナスを該当する報酬に反映
            if (data) {
                await this.addBonusToCommission(data.benefit_agency_id, data.period, data.bonus_amount);
            }
            
            return { data, error: null };
        } catch (error) {
            console.error('階層ボーナス承認エラー:', error);
            return { data: null, error };
        }
    }

    // ボーナスを報酬に加算
    async addBonusToCommission(agencyId, period, bonusAmount) {
        try {
            // 既存の報酬を取得
            const { data: existing } = await this.client
                .from('commissions')
                .select('*')
                .eq('agency_id', agencyId)
                .eq('period', period)
                .single();
            
            if (existing) {
                const newHierarchyBonus = (existing.hierarchy_bonus || 0) + bonusAmount;
                const newTotalCommission = existing.direct_commission + newHierarchyBonus;
                
                // 税金再計算
                const taxCalc = this.calculateTaxDeductions(newTotalCommission, {
                    companyType: existing.company_type,
                    invoiceRegistered: existing.invoice_registered
                });
                
                // 更新
                await this.client
                    .from('commissions')
                    .update({
                        hierarchy_bonus: newHierarchyBonus,
                        total_commission: newTotalCommission,
                        invoice_deduction: taxCalc.invoiceDeduction,
                        withholding_tax: taxCalc.withholdingTax,
                        net_payment: taxCalc.netPayment
                    })
                    .eq('id', existing.id);
            }
        } catch (error) {
            console.error('ボーナス加算エラー:', error);
        }
    }

    // 支払い履歴取得
    async getPaymentHistory(filters = {}) {
        try {
            let query = this.client
                .from('payment_history')
                .select('*');
            
            if (filters.startDate) {
                query = query.gte('payment_date', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('payment_date', filters.endDate);
            }
            if (filters.agencyId) {
                query = query.eq('agency_id', filters.agencyId);
            }
            
            const { data, error } = await query.order('payment_date', { ascending: false });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('支払い履歴取得エラー:', error);
            return { data: null, error };
        }
    }

    // 支払い記録作成
    async createPaymentRecord(paymentData) {
        try {
            const { data, error } = await this.client
                .from('payment_history')
                .insert(paymentData)
                .select()
                .single();
            
            if (error) throw error;
            
            // 関連する報酬のステータスを更新
            if (paymentData.commission_id) {
                await this.client
                    .from('commissions')
                    .update({
                        payment_date: paymentData.payment_date,
                        payment_method: paymentData.payment_method
                    })
                    .eq('id', paymentData.commission_id);
            }
            
            return { data, error: null };
        } catch (error) {
            console.error('支払い記録作成エラー:', error);
            return { data: null, error };
        }
    }

    // 統計情報取得
    async getStatistics(period) {
        try {
            // 総報酬額
            const { data: totalData } = await this.client
                .from('commissions')
                .select('total_commission, status')
                .eq('period', period);
            
            const stats = {
                totalAmount: 0,
                pendingAmount: 0,
                completedAmount: 0,
                pendingCount: 0,
                completedCount: 0,
                hierarchyBonusTotal: 0
            };
            
            if (totalData) {
                totalData.forEach(comm => {
                    stats.totalAmount += comm.total_commission || 0;
                    if (comm.status === 'pending') {
                        stats.pendingAmount += comm.total_commission || 0;
                        stats.pendingCount++;
                    } else if (comm.status === 'completed') {
                        stats.completedAmount += comm.total_commission || 0;
                        stats.completedCount++;
                    }
                });
            }
            
            // 階層ボーナス合計
            const { data: bonusData } = await this.client
                .from('hierarchy_bonuses')
                .select('bonus_amount')
                .eq('period', period)
                .eq('status', 'completed');
            
            if (bonusData) {
                stats.hierarchyBonusTotal = bonusData.reduce((sum, b) => sum + (b.bonus_amount || 0), 0);
            }
            
            return { data: stats, error: null };
        } catch (error) {
            console.error('統計情報取得エラー:', error);
            return { data: null, error };
        }
    }

    // 報酬計算
    async calculateCommissions(period) {
        try {
            // 売上データを取得
            const { data: salesData } = await this.client
                .from('sales')
                .select(`
                    agency_id,
                    amount,
                    agencies (
                        id,
                        company_name,
                        tier,
                        company_type,
                        invoice_registered,
                        invoice_number
                    )
                `)
                .eq('period', period)
                .eq('status', 'completed');
            
            if (!salesData) return { data: null, error: new Error('売上データがありません') };
            
            // 代理店ごとに集計
            const agencyTotals = {};
            salesData.forEach(sale => {
                if (!agencyTotals[sale.agency_id]) {
                    agencyTotals[sale.agency_id] = {
                        agency: sale.agencies,
                        totalSales: 0
                    };
                }
                agencyTotals[sale.agency_id].totalSales += sale.amount;
            });
            
            // 報酬計算
            const commissions = [];
            for (const [agencyId, data] of Object.entries(agencyTotals)) {
                const commission = this.calculateAgencyCommission(
                    data.agency,
                    data.totalSales,
                    period
                );
                commissions.push(commission);
            }
            
            // データベースに保存
            for (const commission of commissions) {
                await this.upsertCommission(commission);
            }
            
            return { data: commissions, error: null };
        } catch (error) {
            console.error('報酬計算エラー:', error);
            return { data: null, error };
        }
    }

    // 代理店の報酬計算
    calculateAgencyCommission(agency, salesAmount, period) {
        // 報酬率（ティアに基づく）
        const commissionRates = {
            1: 30,
            2: 25,
            3: 20,
            4: 15
        };
        
        const tier = agency.tier || agency.tier_level || 1;
        const rate = commissionRates[tier] || 15;
        const directCommission = Math.floor(salesAmount * rate / 100);
        const totalCommission = directCommission; // 階層ボーナスは別途計算
        
        // 税金計算
        const taxCalc = this.calculateTaxDeductions(totalCommission, {
            companyType: agency.company_type || '法人',
            invoiceRegistered: agency.invoice_info?.registered || false
        });
        
        return {
            agency_id: agency.id,
            period: period,
            amount: totalCommission,  // amountカラムを追加
            sales_amount: salesAmount,
            direct_commission: directCommission,
            hierarchy_bonus: 0,
            total_commission: totalCommission,
            commission_rate: rate,
            tier: agency.tier || agency.tier_level || 1,
            company_type: agency.company_type,
            invoice_registered: agency.invoice_info?.registered || false,
            invoice_number: agency.invoice_info?.number || '',
            invoice_deduction: taxCalc.invoiceDeduction,
            withholding_tax: taxCalc.withholdingTax,
            net_payment: taxCalc.netPayment,
            status: 'pending'
        };
    }

    // 税金計算
    calculateTaxDeductions(totalAmount, agencyInfo) {
        let netPayment = totalAmount;
        let invoiceDeduction = 0;
        let withholdingTax = 0;
        
        // インボイス未登録の場合は2%控除
        if (!agencyInfo.invoiceRegistered) {
            invoiceDeduction = Math.floor(totalAmount * 0.02);
            netPayment -= invoiceDeduction;
        }
        
        // 個人事業主の場合は源泉徴収10.21%
        if (agencyInfo.companyType === 'individual' || agencyInfo.companyType === '個人') {
            withholdingTax = Math.floor(netPayment * 0.1021);
            netPayment -= withholdingTax;
        }
        
        return {
            invoiceDeduction: invoiceDeduction,
            withholdingTax: withholdingTax,
            netPayment: netPayment
        };
    }

    // 階層ボーナス計算
    async calculateHierarchyBonuses(period) {
        try {
            // 代理店の階層構造を取得
            const { data: agencies } = await this.client
                .from('agencies')
                .select('id, company_name, parent_agency_id, tier');
            
            // 売上データを取得
            const { data: sales } = await this.client
                .from('sales')
                .select('agency_id, amount')
                .eq('period', period)
                .eq('status', 'completed');
            
            if (!agencies || !sales) return { data: null, error: new Error('データ取得エラー') };
            
            // 階層ボーナス率
            const bonusRates = {
                1: 10, // 1階層上
                2: 8,  // 2階層上
                3: 6,  // 3階層上
                4: 4   // 4階層上
            };
            
            const hierarchyBonuses = [];
            
            // 売上ごとに階層ボーナスを計算
            for (const sale of sales) {
                const salesAgency = agencies.find(a => a.id === sale.agency_id);
                if (!salesAgency) continue;
                
                // 親階層を辿る
                let currentAgency = salesAgency;
                let level = 0;
                
                while (currentAgency.parent_agency_id && level < 4) {
                    level++;
                    const parentAgency = agencies.find(a => a.id === currentAgency.parent_agency_id);
                    if (!parentAgency) break;
                    
                    const bonusAmount = Math.floor(sale.amount * bonusRates[level] / 100);
                    
                    hierarchyBonuses.push({
                        period: period,
                        sales_agency_id: salesAgency.id,
                        sales_agency_name: salesAgency.company_name,
                        sales_amount: sale.amount,
                        benefit_agency_id: parentAgency.id,
                        benefit_agency_name: parentAgency.company_name,
                        relation: `${level}階層上`,
                        bonus_rate: bonusRates[level],
                        bonus_amount: bonusAmount,
                        status: 'pending'
                    });
                    
                    currentAgency = parentAgency;
                }
            }
            
            // データベースに保存
            for (const bonus of hierarchyBonuses) {
                await this.createHierarchyBonus(bonus);
            }
            
            return { data: hierarchyBonuses, error: null };
        } catch (error) {
            console.error('階層ボーナス計算エラー:', error);
            return { data: null, error };
        }
    }
}