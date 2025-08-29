// モバイル表示の拡張機能

document.addEventListener('DOMContentLoaded', function() {
    // テーブルのスクロール検出
    detectTableScroll();
    
    // ウィンドウリサイズ時に再チェック
    window.addEventListener('resize', detectTableScroll);
    
    // ヘッダーのスクロール検出
    detectHeaderScroll();
    
    // タッチデバイスでのホバー無効化
    disableHoverOnTouch();
    
    // モバイルメニューの初期化
    initMobileMenu();
});

// テーブルのスクロール可能性を検出
function detectTableScroll() {
    const tableContainers = document.querySelectorAll('.table-card');
    
    tableContainers.forEach(container => {
        const table = container.querySelector('table');
        if (table) {
            if (table.scrollWidth > container.clientWidth) {
                container.classList.add('has-scroll');
            } else {
                container.classList.remove('has-scroll');
            }
        }
    });
}

// ヘッダーのスクロール検出
function detectHeaderScroll() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    let lastScroll = 0;
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
}

// タッチデバイスでのホバー無効化
function disableHoverOnTouch() {
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (touch) {
        document.body.classList.add('touch-device');
        
        // CSSでホバー効果を無効化
        const style = document.createElement('style');
        style.textContent = `
            .touch-device tr:hover {
                background-color: transparent !important;
            }
            .touch-device .nav-item:hover {
                color: inherit !important;
            }
            .touch-device .btn:hover {
                transform: none !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// モバイルメニューの初期化
function initMobileMenu() {
    if (window.innerWidth > 768) return;
    
    // ハンバーガーメニューボタンを作成
    const menuButton = document.createElement('button');
    menuButton.className = 'mobile-menu-button';
    menuButton.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    menuButton.style.cssText = `
        display: none;
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        width: 24px;
        height: 20px;
        cursor: pointer;
        z-index: 101;
    `;
    
    // メニューボタンのスタイル
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 768px) {
            .mobile-menu-button {
                display: block !important;
            }
            .mobile-menu-button span {
                display: block;
                width: 100%;
                height: 2px;
                background-color: #374151;
                margin-bottom: 5px;
                transition: all 0.3s;
            }
            .mobile-menu-button.active span:nth-child(1) {
                transform: rotate(45deg) translate(5px, 5px);
            }
            .mobile-menu-button.active span:nth-child(2) {
                opacity: 0;
            }
            .mobile-menu-button.active span:nth-child(3) {
                transform: rotate(-45deg) translate(5px, -5px);
            }
            .nav.mobile-open {
                display: block !important;
                position: fixed;
                top: 60px;
                left: 0;
                right: 0;
                background: white;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 100;
            }
            .nav.mobile-open .nav-list {
                flex-direction: column;
                padding: 16px;
                gap: 8px;
            }
            .nav.mobile-open .nav-item {
                padding: 12px 16px;
                border-bottom: 1px solid #e5e7eb;
            }
        }
    `;
    document.head.appendChild(style);
    
    const header = document.querySelector('.header');
    if (header) {
        header.style.position = 'relative';
        header.appendChild(menuButton);
        
        // メニューの開閉
        menuButton.addEventListener('click', function() {
            const nav = document.querySelector('.nav');
            menuButton.classList.toggle('active');
            nav.classList.toggle('mobile-open');
            
            // 背景のスクロールを防ぐ
            if (nav.classList.contains('mobile-open')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        
        // メニュー項目クリックで閉じる
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function() {
                const nav = document.querySelector('.nav');
                const menuButton = document.querySelector('.mobile-menu-button');
                nav.classList.remove('mobile-open');
                menuButton.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
}

// ビューポート高さの修正（iOS Safari対応）
function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

setViewportHeight();
window.addEventListener('resize', setViewportHeight);

// フォーム要素のフォーカス時のズーム防止（iOS）
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    document.addEventListener('touchstart', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    });
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    });
}