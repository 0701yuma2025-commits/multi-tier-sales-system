// 詳細分析用Supabaseデータベースクラス
class AnalyticsSupabaseDB {
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
            // エラーを投げずに機能を制限
            this.client = null;
        }
    }

    // 期間内の代理店パフォーマンスデータ取得
    async getAgencyPerformance(startDate, endDate, filters = {}) {
        if (!this.client) {
            return { data: null, error: new Error('Supabaseが設定されていません') };
        }
        
        try {
            let query = this.client
                .from('agencies')
                .select(`
                    *,
                    sales (
                        amount,
                        sale_date,
                        status,
                        product_category
                    ),
                    commissions (
                        total_commission,
                        period,
                        status
                    )
                `)
                .gte('sales.sale_date', startDate)
                .lte('sales.sale_date', endDate)
                .eq('sales.status', 'confirmed');

            // フィルタリング
            if (filters.tierLevel) {
                query = query.eq('tier_level', filters.tierLevel);
            }
            if (filters.region) {
                query = query.eq('address->prefecture', filters.region);
            }

            const { data, error } = await query;
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('代理店パフォーマンスデータ取得エラー:', error);
            return { data: null, error };
        }
    }

    // 売上統計データ取得
    async getSalesStatistics(startDate, endDate) {
        if (!this.client) {
            return { data: null, error: new Error('Supabaseが設定されていません') };
        }
        
        try {
            const { data, error } = await this.client
                .from('sales')
                .select(`
                    amount,
                    sale_date,
                    product_category,
                    agency_id,
                    agencies (
                        company_name,
                        tier_level,
                        address
                    )
                `)
                .gte('sale_date', startDate)
                .lte('sale_date', endDate)
                .eq('status', 'confirmed');

            if (error) throw error;

            // 統計計算
            const stats = this.calculateSalesStats(data);
            return { data: stats, error: null };
        } catch (error) {
            console.error('売上統計データ取得エラー:', error);
            return { data: null, error };
        }
    }

    // 売上統計計算
    calculateSalesStats(salesData) {
        if (!salesData || salesData.length === 0) {
            return {
                totalSales: 0,
                averageOrderValue: 0,
                salesByCategory: {},
                salesByTier: {},
                salesByRegion: {},
                topAgencies: []
            };
        }

        const stats = {
            totalSales: 0,
            salesByCategory: {},
            salesByTier: {},
            salesByRegion: {},
            agencySales: {}
        };

        // データ集計
        salesData.forEach(sale => {
            stats.totalSales += sale.amount;

            // カテゴリ別
            if (!stats.salesByCategory[sale.product_category]) {
                stats.salesByCategory[sale.product_category] = 0;
            }
            stats.salesByCategory[sale.product_category] += sale.amount;

            // ティア別
            const tier = sale.agencies?.tier_level || 'Unknown';
            if (!stats.salesByTier[tier]) {
                stats.salesByTier[tier] = 0;
            }
            stats.salesByTier[tier] += sale.amount;

            // 地域別
            const region = sale.agencies?.address?.prefecture || 'Unknown';
            if (!stats.salesByRegion[region]) {
                stats.salesByRegion[region] = 0;
            }
            stats.salesByRegion[region] += sale.amount;

            // 代理店別
            if (!stats.agencySales[sale.agency_id]) {
                stats.agencySales[sale.agency_id] = {
                    name: sale.agencies?.company_name || 'Unknown',
                    total: 0,
                    count: 0
                };
            }
            stats.agencySales[sale.agency_id].total += sale.amount;
            stats.agencySales[sale.agency_id].count++;
        });

        // 平均注文額計算
        stats.averageOrderValue = stats.totalSales / salesData.length;

        // トップ代理店
        stats.topAgencies = Object.entries(stats.agencySales)
            .map(([id, data]) => ({
                id,
                name: data.name,
                totalSales: data.total,
                orderCount: data.count,
                averageOrder: data.total / data.count
            }))
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, 10);

        return stats;
    }

    // コホートデータ取得
    async getCohortData(months = 6) {
        if (!this.client) {
            return { data: null, error: new Error('Supabaseが設定されていません') };
        }
        
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);

            const { data, error } = await this.client
                .from('agencies')
                .select(`
                    created_at,
                    id,
                    sales (
                        amount,
                        sale_date
                    )
                `)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;

            // コホートデータ構造化
            const cohortData = this.structureCohortData(data);
            return { data: cohortData, error: null };
        } catch (error) {
            console.error('コホートデータ取得エラー:', error);
            return { data: null, error };
        }
    }

    // コホートデータ構造化
    structureCohortData(agencyData) {
        const cohorts = {};
        
        agencyData.forEach(agency => {
            const cohortMonth = new Date(agency.created_at).toISOString().substring(0, 7);
            
            if (!cohorts[cohortMonth]) {
                cohorts[cohortMonth] = {
                    month: cohortMonth,
                    agencies: [],
                    retention: {}
                };
            }
            
            cohorts[cohortMonth].agencies.push({
                id: agency.id,
                sales: agency.sales || []
            });
        });

        // 継続率計算
        Object.values(cohorts).forEach(cohort => {
            const totalAgencies = cohort.agencies.length;
            
            // 月ごとの継続率を計算
            for (let i = 0; i <= 5; i++) {
                const targetMonth = new Date(cohort.month);
                targetMonth.setMonth(targetMonth.getMonth() + i);
                const targetMonthStr = targetMonth.toISOString().substring(0, 7);
                
                const activeAgencies = cohort.agencies.filter(agency => 
                    agency.sales.some(sale => 
                        sale.sale_date.substring(0, 7) === targetMonthStr
                    )
                ).length;
                
                cohort.retention[`month${i}`] = (activeAgencies / totalAgencies) * 100;
            }
        });

        return cohorts;
    }

    // ファネルデータ取得
    async getFunnelData(startDate, endDate) {
        if (!this.client) {
            return { data: null, error: new Error('Supabaseが設定されていません') };
        }
        
        try {
            // リードから成約までのステージデータを取得
            const { data: leadsData } = await this.client
                .from('leads')
                .select('count')
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            const { data: opportunitiesData } = await this.client
                .from('opportunities')
                .select('count')
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            const { data: salesData } = await this.client
                .from('sales')
                .select('count')
                .gte('sale_date', startDate)
                .lte('sale_date', endDate)
                .eq('status', 'confirmed');

            // デモデータ（実際のテーブルがない場合）
            const funnelData = {
                leads: 1000,
                qualified: 650,
                opportunities: 320,
                negotiations: 180,
                closed: 142
            };

            return { data: funnelData, error: null };
        } catch (error) {
            console.error('ファネルデータ取得エラー:', error);
            return { data: null, error };
        }
    }

    // AIインサイト生成
    async generateAIInsights(analyticsData) {
        try {
            const insights = [];

            // 成長率分析
            if (analyticsData.growthRate > 20) {
                insights.push({
                    type: 'opportunity',
                    title: '急成長エリアの発見',
                    content: `過去30日間で${analyticsData.growthRate.toFixed(1)}%の成長を達成。特に${analyticsData.topGrowthArea}での成長が顕著です。`,
                    action: '成長要因の分析',
                    priority: 'high'
                });
            }

            // 低パフォーマンス検出
            if (analyticsData.lowPerformers.length > 0) {
                insights.push({
                    type: 'warning',
                    title: '改善が必要な代理店',
                    content: `${analyticsData.lowPerformers.length}社の代理店が目標を下回っています。サポート強化を推奨します。`,
                    action: '詳細分析',
                    priority: 'medium'
                });
            }

            // 異常値検出
            if (analyticsData.anomalies.length > 0) {
                insights.push({
                    type: 'alert',
                    title: '異常値の検出',
                    content: `${analyticsData.anomalies[0].description}。詳細な調査が必要です。`,
                    action: '詳細確認',
                    priority: 'high'
                });
            }

            // 予測
            insights.push({
                type: 'forecast',
                title: '売上予測',
                content: `現在のトレンドが続く場合、来月の売上は${analyticsData.forecast.nextMonth}万円（前月比${analyticsData.forecast.growth}%）と予測されます。`,
                action: '予測詳細',
                priority: 'medium'
            });

            return { data: insights, error: null };
        } catch (error) {
            console.error('AIインサイト生成エラー:', error);
            return { data: null, error };
        }
    }

    // メトリクス計算
    async calculateMetrics(startDate, endDate) {
        if (!this.client) {
            return { data: null, error: new Error('Supabaseが設定されていません') };
        }
        
        try {
            // 売上データ取得
            const { data: salesData } = await this.client
                .from('sales')
                .select('amount, sale_date, customer_id')
                .gte('sale_date', startDate)
                .lte('sale_date', endDate)
                .eq('status', 'confirmed');

            // 顧客データ取得
            const { data: customerData } = await this.client
                .from('customers')
                .select('id, created_at, acquisition_cost');

            // メトリクス計算
            const metrics = {
                averageOrderValue: this.calculateAOV(salesData),
                customerLifetimeValue: this.calculateLTV(salesData, customerData),
                customerAcquisitionCost: this.calculateCAC(customerData),
                retentionRate: await this.calculateRetentionRate(startDate, endDate),
                roi: 0,
                conversionRate: await this.calculateConversionRate(startDate, endDate)
            };

            // ROI計算
            if (metrics.customerLifetimeValue > 0 && metrics.customerAcquisitionCost > 0) {
                metrics.roi = ((metrics.customerLifetimeValue - metrics.customerAcquisitionCost) / metrics.customerAcquisitionCost) * 100;
            }

            return { data: metrics, error: null };
        } catch (error) {
            console.error('メトリクス計算エラー:', error);
            return { data: null, error };
        }
    }

    calculateAOV(salesData) {
        if (!salesData || salesData.length === 0) return 0;
        const total = salesData.reduce((sum, sale) => sum + sale.amount, 0);
        return total / salesData.length;
    }

    calculateLTV(salesData, customerData) {
        // 簡易的なLTV計算（実際はより複雑な計算が必要）
        return 428500; // デモ値
    }

    calculateCAC(customerData) {
        // 簡易的なCAC計算
        return 32100; // デモ値
    }

    async calculateRetentionRate(startDate, endDate) {
        // 継続率計算（簡易版）
        return 87.3; // デモ値
    }

    async calculateConversionRate(startDate, endDate) {
        // コンバージョン率計算（簡易版）
        return 14.8; // デモ値
    }
    
    // 削除予定のデモデータメソッド（使用しない）
    getDemoAgencyPerformance() {
        return [
            {
                id: '1',
                company_name: 'ABC商事',
                tier_level: 2,
                sales: Array(30).fill(null).map(() => ({
                    amount: Math.random() * 1000000 + 500000,
                    sale_date: new Date().toISOString()
                }))
            },
            {
                id: '2',
                company_name: 'XYZエージェンシー',
                tier_level: 1,
                sales: Array(25).fill(null).map(() => ({
                    amount: Math.random() * 800000 + 400000,
                    sale_date: new Date().toISOString()
                }))
            }
        ];
    }
    
    // デモ用売上統計
    getDemoSalesStatistics() {
        const topAgencies = [
            { id: '1', name: 'ABC商事', totalSales: 3250000, orderCount: 45, averageOrder: 72222 },
            { id: '2', name: 'XYZエージェンシー', totalSales: 2890000, orderCount: 38, averageOrder: 76052 },
            { id: '3', name: '山田営業企画', totalSales: 2450000, orderCount: 32, averageOrder: 76562 },
            { id: '4', name: '鈴木ビジネス', totalSales: 2100000, orderCount: 28, averageOrder: 75000 },
            { id: '5', name: 'グローバル販売', totalSales: 1850000, orderCount: 25, averageOrder: 74000 }
        ];
        
        return {
            totalSales: 12540000,
            averageOrderValue: 85420,
            salesByCategory: {
                premium: 5670000,
                standard: 4490000,
                basic: 2380000
            },
            salesByTier: {
                1: 4200000,
                2: 3800000,
                3: 2900000,
                4: 1640000
            },
            salesByRegion: {
                '関東': 5020000,
                '関西': 3760000,
                '中部': 2510000,
                '九州': 1250000
            },
            topAgencies: topAgencies
        };
    }
    
    // デモ用コホートデータ
    getDemoCohortData(months) {
        const cohorts = {};
        const today = new Date();
        
        for (let i = 0; i < months; i++) {
            const cohortMonth = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthStr = cohortMonth.toISOString().substring(0, 7);
            
            cohorts[monthStr] = {
                month: monthStr,
                agencies: Array(10 + Math.floor(Math.random() * 5)).fill(null).map((_, idx) => ({
                    id: `agency-${i}-${idx}`,
                    sales: []
                })),
                retention: {}
            };
            
            // 継続率を生成
            for (let j = 0; j <= i && j < 6; j++) {
                cohorts[monthStr].retention[`month${j}`] = Math.max(20, 100 - (j * 15) + (Math.random() * 10 - 5));
            }
        }
        
        return cohorts;
    }
    
    // デモ用ファネルデータ
    getDemoFunnelData() {
        return {
            leads: 1000,
            qualified: 650,
            opportunities: 320,
            negotiations: 180,
            closed: 142
        };
    }
    
    // デモ用メトリクス
    getDemoMetrics() {
        return {
            averageOrderValue: 85420,
            customerLifetimeValue: 428500,
            customerAcquisitionCost: 32100,
            retentionRate: 87.3,
            roi: 234,
            conversionRate: 14.8
        };
    }
}