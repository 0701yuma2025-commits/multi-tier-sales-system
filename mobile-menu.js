// モバイルメニュー制御用JavaScript

// ナビゲーションメニューの制御
function initMobileMenu() {
    // ナビゲーションにトグルボタンを追加
    const navElements = document.querySelectorAll('.nav');
    navElements.forEach(nav => {
        if (!nav.querySelector('.nav-toggle')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'nav-toggle';
            toggleBtn.innerHTML = '☰';
            // 初期状態を画面サイズに基づいて設定
            toggleBtn.style.display = window.innerWidth <= 768 ? 'block' : 'none';
            toggleBtn.onclick = toggleNav;
            nav.appendChild(toggleBtn);
            
            // ナビゲーションリストに閉じるボタンを追加
            const navList = nav.querySelector('.nav-list');
            if (navList && !navList.querySelector('.nav-close')) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'nav-close';
                closeBtn.innerHTML = '✕';
                closeBtn.onclick = closeNav;
                navList.insertBefore(closeBtn, navList.firstChild);
            }
        }
    });
    
    // サイドバーメニューの制御（設定画面用）
    const mainContent = document.querySelector('.main-content');
    const sidebar = document.querySelector('.sidebar');
    if (mainContent && sidebar && window.innerWidth <= 768) {
        if (!document.querySelector('.sidebar-toggle')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'sidebar-toggle';
            toggleBtn.innerHTML = '☰ メニュー';
            toggleBtn.onclick = toggleSidebar;
            mainContent.insertBefore(toggleBtn, mainContent.firstChild);
        }
    }
}

// ナビゲーショントグル
function toggleNav() {
    const navList = document.querySelector('.nav-list');
    const overlay = getOrCreateOverlay();
    
    if (navList.classList.contains('active')) {
        closeNav();
    } else {
        navList.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// ナビゲーションを閉じる
function closeNav() {
    const navList = document.querySelector('.nav-list');
    const overlay = document.querySelector('.mobile-overlay');
    
    navList.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// サイドバートグル
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = getOrCreateOverlay();
    
    if (sidebar.classList.contains('active')) {
        closeSidebar();
    } else {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// サイドバーを閉じる
function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-overlay');
    
    if (sidebar) {
        sidebar.classList.remove('active');
    }
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// オーバーレイの作成または取得
function getOrCreateOverlay() {
    let overlay = document.querySelector('.mobile-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            display: none;
        `;
        overlay.onclick = () => {
            closeNav();
            closeSidebar();
        };
        document.body.appendChild(overlay);
    }
    
    // アクティブ時の表示制御
    const style = document.createElement('style');
    style.textContent = '.mobile-overlay.active { display: block !important; }';
    if (!document.querySelector('#mobile-overlay-style')) {
        style.id = 'mobile-overlay-style';
        document.head.appendChild(style);
    }
    
    return overlay;
}

// テーブルのモバイル対応
function initMobileTables() {
    if (window.innerWidth <= 768) {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            if (!table.classList.contains('mobile-table')) {
                table.classList.add('mobile-table');
                
                // data-label属性を追加
                const headers = table.querySelectorAll('thead th');
                const rows = table.querySelectorAll('tbody tr');
                
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    cells.forEach((cell, index) => {
                        if (headers[index]) {
                            cell.setAttribute('data-label', headers[index].textContent);
                        }
                    });
                });
            }
        });
    }
}

// レスポンシブスタイルの動的読み込み
function loadResponsiveStyles() {
    if (!document.querySelector('#responsive-styles')) {
        const link = document.createElement('link');
        link.id = 'responsive-styles';
        link.rel = 'stylesheet';
        link.href = 'css/responsive-complete.css';
        document.head.appendChild(link);
    }
}

// ウィンドウリサイズ時の処理
function handleResize() {
    const width = window.innerWidth;
    
    // PCサイズに戻った時の処理
    if (width > 768) {
        closeNav();
        closeSidebar();
        document.body.style.overflow = '';
        
        // モバイル用ボタンを非表示
        const navToggle = document.querySelector('.nav-toggle');
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        if (navToggle) navToggle.style.display = 'none';
        if (sidebarToggle) sidebarToggle.style.display = 'none';
    } else {
        // モバイルサイズの時の処理
        const navToggle = document.querySelector('.nav-toggle');
        if (navToggle) navToggle.style.display = 'block';
        
        initMobileTables();
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    loadResponsiveStyles();
    initMobileMenu();
    initMobileTables();
    handleResize();
    
    // リサイズイベントの登録（デバウンス付き）
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleResize, 250);
    });
    
    // タッチデバイスの検出
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
    }
});

// グローバルに公開
window.mobileMenu = {
    toggleNav,
    closeNav,
    toggleSidebar,
    closeSidebar
};