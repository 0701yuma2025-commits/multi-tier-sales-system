/**
 * 共通関数ライブラリ
 * 複数の画面で使用される関数を統一管理
 */

// ログアウト処理
function handleLogout() {
    if (confirm('ログアウトしますか？')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('supabase.auth.token');
        window.location.replace('login.html?logout=true');
    }
}

// ユーザー情報表示
function displayUserInfo(elementId = 'userDisplay') {
    const userStr = localStorage.getItem('currentUser');
    const element = document.getElementById(elementId);
    
    if (!element) return;
    
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            element.textContent = `${user.email} (${user.role === 'admin' ? '管理者' : '代理店'})`;
        } catch (e) {
            element.textContent = 'ゲストユーザー';
        }
    } else {
        element.textContent = 'ゲストユーザー';
    }
}

// モーダル制御
const ModalController = {
    // モーダルを開く
    open: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    },
    
    // モーダルを閉じる
    close: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            
            // フォームがある場合はリセット
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    },
    
    // 外側クリックで閉じる設定
    setupOutsideClick: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    ModalController.close(modalId);
                }
            });
        }
    }
};

// 日付フォーマット
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP');
}

// 金額フォーマット
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '¥0';
    return '¥' + Number(amount).toLocaleString('ja-JP');
}

// パーセンテージフォーマット
function formatPercentage(value) {
    if (value === null || value === undefined) return '0%';
    return Number(value).toFixed(1) + '%';
}

// 成功メッセージ表示
function showSuccessMessage(message, duration = 3000) {
    // 既存のメッセージを削除
    const existingMessage = document.querySelector('.success-toast');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // 新しいメッセージを作成
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `
        <div class="success-toast-content">
            <span class="success-icon">✅</span>
            <span class="success-message">${message}</span>
        </div>
    `;
    
    // スタイルを追加（まだ存在しない場合）
    if (!document.querySelector('#success-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'success-toast-styles';
        style.textContent = `
            .success-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            }
            
            .success-toast-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .success-icon {
                font-size: 20px;
            }
            
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
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // 指定時間後に削除
    setTimeout(() => {
        toast.remove();
    }, duration);
}

// ローディング状態管理
const LoadingManager = {
    show: function(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.disabled = true;
            element.dataset.originalText = element.textContent;
            element.innerHTML = '<span class="loading-spinner"></span> 処理中...';
        }
    },
    
    hide: function(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.disabled = false;
            element.textContent = element.dataset.originalText || element.textContent;
        }
    }
};

// ローディングスピナーのスタイル（初回のみ追加）
if (!document.querySelector('#loading-spinner-styles')) {
    const style = document.createElement('style');
    style.id = 'loading-spinner-styles';
    style.textContent = `
        .loading-spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid #f3f3f3;
            border-radius: 50%;
            border-top-color: currentColor;
            animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}