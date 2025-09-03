// 支払い管理用Supabaseデータベース操作
class PaymentsSupabaseDB {
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
    
    // 支払い待ちの報酬データを取得
    async getPendingPayments(period = null) {
        try {
            let query = this.client
                .from('commissions')
                .select(`
                    *,
                    agencies!inner (
                        id,
                        company_name,
                        bank_account,
                        invoice_info
                    )
                `)
                .eq('status', 'completed')  // 承認済み
                .is('payment_date', null);  // 未払い
            
            if (period) {
                query = query.eq('period', period);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            // 最低支払額でフィルタリング
            return data.map(commission => ({
                id: commission.id,
                agencyId: commission.agency_id,
                agencyName: commission.agencies.company_name,
                period: commission.period,
                grossAmount: parseFloat(commission.total_commission),
                invoiceDeduction: parseFloat(commission.invoice_deduction || 0),
                withholdingTax: parseFloat(commission.withholding_tax || 0),
                netAmount: parseFloat(commission.net_payment),
                bankAccount: this.formatBankAccount(commission.agencies.bank_account),
                status: parseFloat(commission.net_payment) < 10000 ? 'below_minimum' : 'pending',
                commissionData: commission
            }));
        } catch (error) {
            console.error('支払い待ちデータ取得エラー:', error);
            throw error;
        }
    }
    
    // 銀行口座情報をフォーマット
    formatBankAccount(bankAccount) {
        if (!bankAccount) return '未登録';
        
        return `${bankAccount.bank_name || ''} ${bankAccount.branch_name || ''} ${bankAccount.account_type || ''} ${bankAccount.account_number || ''}`.trim();
    }
    
    // 支払い実行
    async executePayment(paymentIds, paymentDate, notes = '') {
        try {
            const payments = [];
            const errors = [];
            
            for (const id of paymentIds) {
                try {
                    // 報酬情報を更新
                    const { data: commission, error: updateError } = await this.client
                        .from('commissions')
                        .update({
                            payment_date: paymentDate,
                            payment_method: '銀行振込',
                            status: 'completed',
                            notes: notes,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', id)
                        .select()
                        .single();
                    
                    if (updateError) throw updateError;
                    
                    // 支払い履歴を作成
                    const { data: history, error: historyError } = await this.client
                        .from('payment_history')
                        .insert({
                            commission_id: id,
                            agency_id: commission.agency_id,
                            agency_name: commission.agency_name || '',
                            payment_date: paymentDate,
                            amount: commission.net_payment,
                            payment_method: '銀行振込',
                            bank_account: commission.bank_account_info || '',
                            processor: (await this.client.auth.getUser()).data.user?.email || 'system',
                            transaction_id: this.generateTransactionId(),
                            notes: notes
                        })
                        .select()
                        .single();
                    
                    if (historyError) throw historyError;
                    
                    payments.push({ commission, history });
                } catch (error) {
                    errors.push({ id, error: error.message });
                }
            }
            
            return { payments, errors };
        } catch (error) {
            console.error('支払い実行エラー:', error);
            throw error;
        }
    }
    
    // トランザクションID生成
    generateTransactionId() {
        const date = new Date();
        const timestamp = date.getTime();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `PAY${timestamp}${random}`;
    }
    
    // 支払い履歴取得
    async getPaymentHistory(filters = {}) {
        try {
            let query = this.client
                .from('payment_history')
                .select(`
                    *,
                    commissions (
                        period,
                        total_commission,
                        net_payment
                    )
                `)
                .order('payment_date', { ascending: false });
            
            if (filters.startDate && filters.endDate) {
                query = query.gte('payment_date', filters.startDate)
                           .lte('payment_date', filters.endDate);
            }
            
            if (filters.agencyId) {
                query = query.eq('agency_id', filters.agencyId);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('支払い履歴取得エラー:', error);
            throw error;
        }
    }
    
    // 支払い統計取得
    async getPaymentStats() {
        try {
            // 今月の支払い総額
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            
            const { data: monthlyPayments, error: monthlyError } = await this.client
                .from('payment_history')
                .select('amount')
                .gte('payment_date', startOfMonth.toISOString());
            
            if (monthlyError) throw monthlyError;
            
            const monthlyTotal = monthlyPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            
            // 支払い待ち件数
            const { data: pendingPayments, error: pendingError } = await this.client
                .from('commissions')
                .select('id, net_payment')
                .eq('status', 'completed')
                .is('payment_date', null);
            
            if (pendingError) throw pendingError;
            
            const payableCount = pendingPayments.filter(p => parseFloat(p.net_payment) >= 10000).length;
            const belowMinimumCount = pendingPayments.filter(p => parseFloat(p.net_payment) < 10000).length;
            const totalPending = pendingPayments
                .filter(p => parseFloat(p.net_payment) >= 10000)
                .reduce((sum, p) => sum + parseFloat(p.net_payment), 0);
            
            return {
                monthlyTotal,
                payableCount,
                belowMinimumCount,
                totalPending
            };
        } catch (error) {
            console.error('支払い統計取得エラー:', error);
            throw error;
        }
    }
    
    // 振込データエクスポート用データ取得
    async getExportData(paymentIds) {
        try {
            const query = this.client
                .from('commissions')
                .select(`
                    *,
                    agencies (
                        company_name,
                        bank_account
                    )
                `)
                .in('id', paymentIds);
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            return data.map(commission => ({
                振込先名義: commission.agencies.company_name,
                銀行名: commission.agencies.bank_account?.bank_name || '',
                支店名: commission.agencies.bank_account?.branch_name || '',
                口座種別: commission.agencies.bank_account?.account_type || '',
                口座番号: commission.agencies.bank_account?.account_number || '',
                振込金額: commission.net_payment,
                摘要: `${commission.period} 販売報酬`
            }));
        } catch (error) {
            console.error('エクスポートデータ取得エラー:', error);
            throw error;
        }
    }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentsSupabaseDB;
}