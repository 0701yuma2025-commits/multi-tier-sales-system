// ダッシュボードのリアルタイム更新機能

class DashboardRealtime {
    constructor() {
        this.supabaseClient = null;
        this.salesChannel = null;
        this.agenciesChannel = null;
        this.commissionsChannel = null;
        this.updateCallback = null;
        this.initialize();
    }
    
    initialize() {
        // 既存のSupabaseクライアントを再利用
        if (window.supabaseClient) {
            this.supabaseClient = window.supabaseClient;
        } else if (typeof initializeSupabase === 'function') {
            this.supabaseClient = initializeSupabase();
            // グローバルに保存して再利用可能にする
            window.supabaseClient = this.supabaseClient;
        } else {
            console.error('Supabaseクライアントの初期化に失敗しました');
            return;
        }
    }
    
    // リアルタイム更新を開始
    startRealtimeUpdates(callback) {
        if (!this.supabaseClient) return;
        
        this.updateCallback = callback;
        
        // 売上テーブルの変更を監視
        this.salesChannel = this.supabaseClient
            .channel('dashboard-sales-changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'sales' 
                },
                (payload) => {
                    console.log('売上データ変更検出:', payload);
                    this.handleSalesChange(payload);
                }
            )
            .subscribe();
        
        // 代理店テーブルの変更を監視
        this.agenciesChannel = this.supabaseClient
            .channel('dashboard-agencies-changes')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'agencies'
                },
                (payload) => {
                    console.log('代理店データ変更検出:', payload);
                    this.handleAgencyChange(payload);
                }
            )
            .subscribe();
        
        // 報酬テーブルの変更を監視
        this.commissionsChannel = this.supabaseClient
            .channel('dashboard-commissions-changes')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'commissions'
                },
                (payload) => {
                    console.log('報酬データ変更検出:', payload);
                    this.handleCommissionChange(payload);
                }
            )
            .subscribe();
        
        console.log('リアルタイム更新を開始しました');
    }
    
    // 売上データ変更ハンドラー
    handleSalesChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        // 変更タイプに応じて処理
        switch (eventType) {
            case 'INSERT':
                this.showNotification('新しい売上が登録されました', 'success');
                break;
            case 'UPDATE':
                this.showNotification('売上データが更新されました', 'info');
                break;
            case 'DELETE':
                this.showNotification('売上データが削除されました', 'warning');
                break;
        }
        
        // コールバックを実行してダッシュボードを更新
        if (this.updateCallback) {
            this.updateCallback('sales', payload);
        }
    }
    
    // 代理店データ変更ハンドラー
    handleAgencyChange(payload) {
        const { eventType, new: newRecord } = payload;
        
        if (eventType === 'INSERT') {
            this.showNotification('新しい代理店が登録されました', 'success');
        } else if (eventType === 'UPDATE' && newRecord) {
            // ステータス変更を検出
            if (newRecord.status === 'active') {
                this.showNotification('代理店が承認されました', 'success');
            }
        }
        
        if (this.updateCallback) {
            this.updateCallback('agencies', payload);
        }
    }
    
    // 報酬データ変更ハンドラー
    handleCommissionChange(payload) {
        const { eventType } = payload;
        
        if (eventType === 'INSERT') {
            this.showNotification('新しい報酬が計算されました', 'info');
        }
        
        if (this.updateCallback) {
            this.updateCallback('commissions', payload);
        }
    }
    
    // 通知表示
    showNotification(message, type = 'info') {
        // 通知要素を作成
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;
        
        // タイプに応じた色を設定
        const colors = {
            success: '#10b981',
            info: '#3b82f6',
            warning: '#f59e0b',
            error: '#ef4444'
        };
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 8px; height: 8px; background: ${colors[type]}; border-radius: 50%;"></div>
                <div style="flex: 1; color: #1f2937; font-size: 14px;">${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 3秒後に自動的に削除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // リアルタイム更新を停止
    stopRealtimeUpdates() {
        if (this.salesChannel) {
            this.supabaseClient.removeChannel(this.salesChannel);
            this.salesChannel = null;
        }
        
        if (this.agenciesChannel) {
            this.supabaseClient.removeChannel(this.agenciesChannel);
            this.agenciesChannel = null;
        }
        
        if (this.commissionsChannel) {
            this.supabaseClient.removeChannel(this.commissionsChannel);
            this.commissionsChannel = null;
        }
        
        console.log('リアルタイム更新を停止しました');
    }
    
    // 定期的な更新（フォールバック）
    startPolling(interval = 30000) {
        this.pollingInterval = setInterval(async () => {
            if (this.updateCallback) {
                this.updateCallback('poll', null);
            }
        }, interval);
        
        console.log(`ポーリング更新を開始しました（${interval/1000}秒間隔）`);
    }
    
    // ポーリングを停止
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('ポーリング更新を停止しました');
        }
    }
}

// アニメーション用のCSS
if (!document.getElementById('dashboard-realtime-styles')) {
    const style = document.createElement('style');
    style.id = 'dashboard-realtime-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .notification {
            transition: all 0.3s ease;
        }
        
        .notification:hover {
            transform: scale(1.02);
        }
    `;
    document.head.appendChild(style);
}