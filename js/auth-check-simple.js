// 簡易認証チェック（auth-check.jsの簡易版）
// ログインページとデバッグページでは動作しない

(function() {
    // 現在のページパスを取得
    const currentPath = window.location.pathname;
    const fileName = currentPath.split('/').pop();
    
    // ログインページ、デバッグページ、index.htmlでは認証チェックをスキップ
    if (fileName.includes('login') || 
        fileName.includes('debug') || 
        fileName === 'index.html' || 
        fileName === '') {
        return;
    }
    
    // 認証情報をチェック
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        // 認証情報がない場合はログインページへ
        window.location.href = 'login.html';
    }
})();