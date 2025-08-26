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
                id: '001',
                name: '株式会社ABC商事',
                email: 'abc@example.com',
                tier: 1,
                parentId: null,
                status: 'active',
                createdAt: '2024-01-15'
            },
            {
                id: '002',
                name: 'XYZ営業株式会社',
                email: 'xyz@example.com',
                tier: 2,
                parentId: '001',
                status: 'active',
                createdAt: '2024-01-20'
            },
            {
                id: '003',
                name: '田中商店',
                email: 'tanaka@example.com',
                tier: 3,
                parentId: '002',
                status: 'active',
                createdAt: '2024-02-05'
            },
            {
                id: '004',
                name: '山田エージェンシー',
                email: 'yamada@example.com',
                tier: 2,
                parentId: '001',
                status: 'pending',
                createdAt: '2024-03-14'
            },
            {
                id: '005',
                name: '佐藤サービス',
                email: 'sato@example.com',
                tier: 4,
                parentId: '003',
                status: 'active',
                createdAt: '2024-02-20'
            }
        ];
    }
    
    // 初期商品データ
    getInitialProducts() {
        return [
            {
                id: 'premium',
                name: 'プレミアムプラン',
                price: 100000
            },
            {
                id: 'standard',
                name: 'スタンダードプラン',
                price: 50000
            },
            {
                id: 'basic',
                name: 'ベーシックプラン',
                price: 30000
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
        const commissions = [];
        
        if (!agency) return commissions;
        
        // 報酬率（階層別）
        const commissionRates = {
            1: 0.30, // Tier1: 30%
            2: 0.25, // Tier2: 25%
            3: 0.20, // Tier3: 20%
            4: 0.15  // Tier4: 15%
        };
        
        // 現在の代理店の報酬
        commissions.push({
            agencyId: agency.id,
            agencyName: agency.name,
            tier: agency.tier,
            rate: commissionRates[agency.tier],
            amount: saleData.amount * commissionRates[agency.tier],
            saleId: saleData.id
        });
        
        // 上位代理店の報酬（差額）
        let currentAgency = agency;
        let previousRate = commissionRates[agency.tier];
        
        while (currentAgency.parentId) {
            const parentAgency = data.agencies.find(a => a.id === currentAgency.parentId);
            if (parentAgency) {
                const parentRate = commissionRates[parentAgency.tier];
                const differenceRate = parentRate - previousRate;
                
                if (differenceRate > 0) {
                    commissions.push({
                        agencyId: parentAgency.id,
                        agencyName: parentAgency.name,
                        tier: parentAgency.tier,
                        rate: differenceRate,
                        amount: saleData.amount * differenceRate,
                        saleId: saleData.id
                    });
                }
                
                currentAgency = parentAgency;
                previousRate = parentRate;
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