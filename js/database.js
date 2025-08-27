// ローカルデータベース管理クラス
class LocalDatabase {
    constructor() {
        this.dbName = 'multiTierSalesSystem';
        this.initDatabase();
    }
    
    // データベース初期化
    initDatabase() {
        if (!localStorage.getItem(this.dbName)) {
            const initialData = {
                sales: [],
                agencies: this.getInitialAgencies(),
                commissions: [],
                products: this.getInitialProducts()
            };
            localStorage.setItem(this.dbName, JSON.stringify(initialData));
        }
    }
    
    // 初期代理店データ
    getInitialAgencies() {
        return [
            {
                id: 'AGN20240001',
                company_name: '株式会社ABC商事',
                company_type: '法人',
                representative: {
                    name: '山田太郎',
                    email: 'abc@example.com',
                    phone: '03-1234-5678',
                    birth_date: '1980-01-01'
                },
                tier_level: 1,
                parent_agency_id: null,
                status: 'active',
                created_at: '2024-01-15'
            },
            {
                id: 'AGN20240002',
                company_name: 'XYZ営業株式会社',
                company_type: '法人',
                representative: {
                    name: '鈴木一郎',
                    email: 'xyz@example.com',
                    phone: '03-2345-6789',
                    birth_date: '1975-05-15'
                },
                tier_level: 2,
                parent_agency_id: 'AGN20240001',
                status: 'active',
                created_at: '2024-01-20'
            },
            {
                id: 'AGN20240003',
                company_name: '田中商店',
                company_type: '個人',
                representative: {
                    name: '田中花子',
                    email: 'tanaka@example.com',
                    phone: '03-3456-7890',
                    birth_date: '1990-08-20'
                },
                tier_level: 3,
                parent_agency_id: 'AGN20240002',
                status: 'active',
                created_at: '2024-02-05'
            },
            {
                id: 'AGN20240004',
                company_name: '山田エージェンシー',
                company_type: '個人',
                representative: {
                    name: '山田次郎',
                    email: 'yamada@example.com',
                    phone: '03-4567-8901',
                    birth_date: '1985-12-10'
                },
                tier_level: 2,
                parent_agency_id: 'AGN20240001',
                status: 'pending',
                created_at: '2024-03-14'
            },
            {
                id: 'AGN20240005',
                company_name: '佐藤サービス',
                company_type: '個人',
                representative: {
                    name: '佐藤三郎',
                    email: 'sato@example.com',
                    phone: '03-5678-9012',
                    birth_date: '1995-03-25'
                },
                tier_level: 4,
                parent_agency_id: 'AGN20240003',
                status: 'active',
                created_at: '2024-02-20'
            }
        ];
    }
    
    // 初期商品データ
    getInitialProducts() {
        return [
            {
                id: 'PRD001',
                name: '商品A',
                price: 100000,
                base_rate: 10.0,
                tier_rates: {
                    1: 10.0,
                    2: 8.0,
                    3: 6.0,
                    4: 4.0
                }
            },
            {
                id: 'PRD002',
                name: '商品B',
                price: 50000,
                base_rate: 8.0,
                tier_rates: {
                    1: 8.0,
                    2: 6.0,
                    3: 4.0,
                    4: 3.0
                }
            },
            {
                id: 'PRD003',
                name: '商品C',
                price: 30000,
                base_rate: 6.0,
                tier_rates: {
                    1: 6.0,
                    2: 5.0,
                    3: 3.0,
                    4: 2.0
                }
            }
        ];
    }
    
    // データ取得
    getData() {
        return JSON.parse(localStorage.getItem(this.dbName) || '{}');
    }
    
    // データ保存
    saveData(data) {
        localStorage.setItem(this.dbName, JSON.stringify(data));
    }
    
    // 年齢確認（18歳以上）
    checkAge(birthDate) {
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age >= 18;
    }
    
    // 売上追加
    addSale(saleData) {
        const data = this.getData();
        const sale = {
            ...saleData,
            id: this.generateSaleId(),
            createdAt: new Date().toISOString(),
            commissions: this.calculateCommissions(saleData)
        };
        
        data.sales.push(sale);
        this.saveData(data);
        
        // 報酬も追加
        this.addCommissions(sale.commissions);
        
        return sale;
    }
    
    // 売上ID生成
    generateSaleId() {
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 10000);
        return `S-${year}-${String(random).padStart(4, '0')}`;
    }
    
    // 報酬計算
    calculateCommissions(saleData) {
        const data = this.getData();
        const agency = data.agencies.find(a => a.id === saleData.agencyId);
        const product = data.products.find(p => p.id === saleData.product);
        const commissions = [];
        
        if (!agency || !product) return commissions;
        
        // 商品別の報酬率を使用
        const agencyTier = agency.tier_level || agency.tier;
        const commissionRate = product.tier_rates[agencyTier] / 100;
        
        // 階層ボーナス（上位代理店への還元率）
        const hierarchyBonus = {
            tier1_from_tier2: 0.02, // Tier2の売上の2%
            tier2_from_tier3: 0.015, // Tier3の売上の1.5%
            tier3_from_tier4: 0.01   // Tier4の売上の1%
        };
        
        // 現在の代理店の基本報酬
        commissions.push({
            agencyId: agency.id,
            agencyName: agency.company_name || agency.name,
            tier: agencyTier,
            rate: commissionRate,
            amount: saleData.amount * commissionRate,
            saleId: saleData.id,
            type: 'base'
        });
        
        // 上位代理店への階層ボーナス
        let currentAgency = agency;
        
        while (currentAgency.parent_agency_id || currentAgency.parentId) {
            const parentId = currentAgency.parent_agency_id || currentAgency.parentId;
            const parentAgency = data.agencies.find(a => a.id === parentId);
            if (parentAgency) {
                let bonusRate = 0;
                const currentTier = currentAgency.tier_level || currentAgency.tier;
                const parentTier = parentAgency.tier_level || parentAgency.tier;
                
                // 階層ボーナスの計算
                if (currentTier === 2 && parentTier === 1) {
                    bonusRate = hierarchyBonus.tier1_from_tier2;
                } else if (currentTier === 3 && parentTier === 2) {
                    bonusRate = hierarchyBonus.tier2_from_tier3;
                } else if (currentTier === 4 && parentTier === 3) {
                    bonusRate = hierarchyBonus.tier3_from_tier4;
                }
                
                if (bonusRate > 0) {
                    commissions.push({
                        agencyId: parentAgency.id,
                        agencyName: parentAgency.company_name || parentAgency.name,
                        tier: parentTier,
                        rate: bonusRate,
                        amount: saleData.amount * bonusRate,
                        saleId: saleData.id,
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
    
    // 報酬追加
    addCommissions(commissions) {
        const data = this.getData();
        commissions.forEach(commission => {
            data.commissions.push({
                ...commission,
                id: this.generateCommissionId(),
                status: 'unpaid',
                createdAt: new Date().toISOString()
            });
        });
        this.saveData(data);
    }
    
    // 報酬ID生成
    generateCommissionId() {
        return 'C-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    }
    
    // 売上一覧取得
    getSales(filters = {}) {
        const data = this.getData();
        let sales = data.sales || [];
        
        // フィルター適用
        if (filters.dateFrom) {
            sales = sales.filter(s => s.date >= filters.dateFrom);
        }
        if (filters.dateTo) {
            sales = sales.filter(s => s.date <= filters.dateTo);
        }
        if (filters.status) {
            sales = sales.filter(s => s.status === filters.status);
        }
        if (filters.agencyId) {
            sales = sales.filter(s => s.agencyId === filters.agencyId);
        }
        
        // 日付順にソート（新しい順）
        sales.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return sales;
    }
    
    // 売上削除
    deleteSale(saleId) {
        const data = this.getData();
        
        // 売上データを削除
        data.sales = data.sales.filter(s => s.id !== saleId);
        
        // 関連する報酬データも削除
        data.commissions = data.commissions.filter(c => c.saleId !== saleId);
        
        this.saveData(data);
        return true;
    }
    
    // 売上統計取得
    getSalesStats() {
        const data = this.getData();
        const sales = data.sales || [];
        
        // 今月の売上
        const now = new Date();
        const thisMonth = sales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate.getMonth() === now.getMonth() && 
                   saleDate.getFullYear() === now.getFullYear() &&
                   s.status !== 'cancelled';
        });
        
        const totalAmount = thisMonth.reduce((sum, s) => sum + Number(s.amount), 0);
        const count = thisMonth.length;
        const average = count > 0 ? totalAmount / count : 0;
        
        // 前月の売上
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        const lastMonthSales = sales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate.getMonth() === lastMonth.getMonth() && 
                   saleDate.getFullYear() === lastMonth.getFullYear() &&
                   s.status !== 'cancelled';
        });
        const lastMonthTotal = lastMonthSales.reduce((sum, s) => sum + Number(s.amount), 0);
        
        const growth = lastMonthTotal > 0 ? 
            ((totalAmount - lastMonthTotal) / lastMonthTotal * 100).toFixed(1) : 0;
        
        return {
            total: totalAmount,
            count: count,
            average: Math.floor(average),
            growth: growth
        };
    }
    
    // 代理店取得
    getAgencies() {
        const data = this.getData();
        return data.agencies || [];
    }
    
    // 商品取得
    getProducts() {
        const data = this.getData();
        return data.products || [];
    }
}

// グローバルにデータベースインスタンスを作成
const db = new LocalDatabase();