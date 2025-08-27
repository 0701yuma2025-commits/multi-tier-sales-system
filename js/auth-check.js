// 認証チェック用のJavaScript
// 各ページで読み込んで使用

class AuthManager {
    constructor() {
        this.currentUser = null;
        // ログインページやデバッグページでは初期化時の認証チェックをスキップ
        const currentPath = window.location.pathname;
        if (!currentPath.includes('login') && !currentPath.includes('debug')) {
            this.checkAuth();
        }
    }
    
    // 認証状態をチェック
    checkAuth() {
        // ログインページやデバッグページでは認証チェックをスキップ
        const currentPath = window.location.pathname;
        if (currentPath.includes('login') || currentPath.includes('debug')) {
            return true;
        }
        
        const userStr = localStorage.getItem('currentUser');
        if (!userStr) {
            this.redirectToLogin();
            return false;
        }
        
        try {
            this.currentUser = JSON.parse(userStr);
            
            // Supabaseトークンの有効性をチェック（デモモードでない場合）
            if (!this.currentUser.isDemo) {
                const tokenStr = localStorage.getItem('supabase.auth.token');
                if (!tokenStr) {
                    this.redirectToLogin();
                    return false;
                }
                
                const token = JSON.parse(tokenStr);
                // トークンの有効期限をチェック
                if (token.expires_at && new Date(token.expires_at * 1000) < new Date()) {
                    this.logout();
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('認証エラー:', error);
            this.redirectToLogin();
            return false;
        }
    }
    
    // ユーザーの役割を取得
    getUserRole() {
        return this.currentUser ? this.currentUser.role : null;
    }
    
    // ユーザーのメールアドレスを取得
    getUserEmail() {
        return this.currentUser ? this.currentUser.email : null;
    }
    
    // 管理者かどうかをチェック
    isAdmin() {
        return this.getUserRole() === 'admin';
    }
    
    // 代理店かどうかをチェック
    isAgency() {
        return this.getUserRole() === 'agency';
    }
    
    // ページアクセス権限をチェック
    checkPageAccess(requiredRole) {
        if (!this.currentUser) {
            this.redirectToLogin();
            return false;
        }
        
        if (requiredRole && this.currentUser.role !== requiredRole) {
            // 権限がない場合は適切なダッシュボードにリダイレクト
            this.redirectToDashboard();
            return false;
        }
        
        return true;
    }
    
    // ログアウト処理
    logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('supabase.auth.token');
        this.redirectToLogin();
    }
    
    // ログインページへリダイレクト
    redirectToLogin() {
        if (!window.location.pathname.includes('login')) {
            window.location.href = 'login.html';
        }
    }
    
    // ダッシュボードへリダイレクト
    redirectToDashboard() {
        const dashboardUrl = this.isAdmin() 
            ? 'dashboard-admin.html' 
            : 'dashboard-agency.html';
        
        if (!window.location.pathname.includes(dashboardUrl)) {
            window.location.href = dashboardUrl;
        }
    }
    
    // ユーザー情報を画面に表示
    displayUserInfo() {
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            element.textContent = `${this.getUserEmail()} (${this.isAdmin() ? '管理者' : '代理店'})`;
        });
    }
    
    // セッションの更新（Supabase認証の場合）
    async refreshSession() {
        if (this.currentUser.isDemo) return true;
        
        try {
            const tokenStr = localStorage.getItem('supabase.auth.token');
            if (!tokenStr) return false;
            
            const token = JSON.parse(tokenStr);
            const response = await fetch(`${window.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': window.SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    refresh_token: token.refresh_token
                })
            });
            
            if (!response.ok) {
                throw new Error('セッション更新に失敗しました');
            }
            
            const newToken = await response.json();
            localStorage.setItem('supabase.auth.token', JSON.stringify(newToken));
            return true;
            
        } catch (error) {
            console.error('セッション更新エラー:', error);
            this.logout();
            return false;
        }
    }
}

// グローバルに認証マネージャーを作成
window.authManager = new AuthManager();

// ログアウト関数（既存のコードとの互換性のため）
function handleLogout() {
    if (confirm('ログアウトしますか？')) {
        window.authManager.logout();
    }
}