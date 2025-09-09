/**
 * APIエラーコード体系
 * 
 * エラーコード形式: [カテゴリ]-[番号]
 * 例: AUTH-001, SALES-002
 */

// エラーカテゴリ定義
const ErrorCategory = {
    AUTH: 'AUTH',           // 認証・認可
    AGENCY: 'AGENCY',       // 代理店関連
    SALES: 'SALES',         // 売上関連
    COMMISSION: 'COMM',     // 報酬関連
    PAYMENT: 'PAY',         // 支払い関連
    CAMPAIGN: 'CAMP',       // キャンペーン関連
    VALIDATION: 'VAL',      // バリデーション
    SYSTEM: 'SYS',          // システムエラー
    NETWORK: 'NET',         // ネットワークエラー
    DATABASE: 'DB'          // データベースエラー
};

// エラーコード定義
const ErrorCodes = {
    // 認証・認可エラー (AUTH-xxx)
    AUTH_001: {
        code: 'AUTH-001',
        message: 'ログインが必要です',
        httpStatus: 401,
        userMessage: 'セッションが切れました。再度ログインしてください。'
    },
    AUTH_002: {
        code: 'AUTH-002',
        message: 'アクセス権限がありません',
        httpStatus: 403,
        userMessage: 'このページへのアクセス権限がありません。'
    },
    AUTH_003: {
        code: 'AUTH-003',
        message: 'メールアドレスまたはパスワードが正しくありません',
        httpStatus: 401,
        userMessage: 'メールアドレスまたはパスワードをご確認ください。'
    },
    AUTH_004: {
        code: 'AUTH-004',
        message: 'アカウントが無効化されています',
        httpStatus: 403,
        userMessage: 'アカウントが無効化されています。管理者にお問い合わせください。'
    },
    
    // 代理店関連エラー (AGENCY-xxx)
    AGENCY_001: {
        code: 'AGENCY-001',
        message: '代理店が見つかりません',
        httpStatus: 404,
        userMessage: '指定された代理店が見つかりません。'
    },
    AGENCY_002: {
        code: 'AGENCY-002',
        message: '代理店コードが重複しています',
        httpStatus: 409,
        userMessage: 'この代理店コードは既に使用されています。'
    },
    AGENCY_003: {
        code: 'AGENCY-003',
        message: '親代理店が無効です',
        httpStatus: 400,
        userMessage: '指定された親代理店が存在しないか、無効です。'
    },
    AGENCY_004: {
        code: 'AGENCY-004',
        message: '階層の上限を超えています',
        httpStatus: 400,
        userMessage: '代理店の階層は4階層までです。'
    },
    
    // 売上関連エラー (SALES-xxx)
    SALES_001: {
        code: 'SALES-001',
        message: '売上データが見つかりません',
        httpStatus: 404,
        userMessage: '指定された売上データが見つかりません。'
    },
    SALES_002: {
        code: 'SALES-002',
        message: '売上の重複登録',
        httpStatus: 409,
        userMessage: 'この売上は既に登録されています。'
    },
    SALES_003: {
        code: 'SALES-003',
        message: '売上金額が不正です',
        httpStatus: 400,
        userMessage: '売上金額は0円以上で入力してください。'
    },
    SALES_004: {
        code: 'SALES-004',
        message: '売上日が不正です',
        httpStatus: 400,
        userMessage: '売上日は未来の日付を指定できません。'
    },
    
    // 報酬関連エラー (COMM-xxx)
    COMMISSION_001: {
        code: 'COMM-001',
        message: '報酬計算エラー',
        httpStatus: 500,
        userMessage: '報酬の計算中にエラーが発生しました。'
    },
    COMMISSION_002: {
        code: 'COMM-002',
        message: '報酬率が設定されていません',
        httpStatus: 400,
        userMessage: 'この代理店の報酬率が設定されていません。'
    },
    COMMISSION_003: {
        code: 'COMM-003',
        message: '報酬が既に確定しています',
        httpStatus: 409,
        userMessage: 'この報酬は既に確定しているため変更できません。'
    },
    
    // 支払い関連エラー (PAY-xxx)
    PAYMENT_001: {
        code: 'PAY-001',
        message: '支払い情報が不足しています',
        httpStatus: 400,
        userMessage: '銀行口座情報を登録してください。'
    },
    PAYMENT_002: {
        code: 'PAY-002',
        message: '最低支払額に達していません',
        httpStatus: 400,
        userMessage: '支払い可能額が最低支払額（¥10,000）に達していません。'
    },
    PAYMENT_003: {
        code: 'PAY-003',
        message: '支払い処理中のエラー',
        httpStatus: 500,
        userMessage: '支払い処理中にエラーが発生しました。'
    },
    
    // キャンペーン関連エラー (CAMP-xxx)
    CAMPAIGN_001: {
        code: 'CAMP-001',
        message: 'キャンペーンが見つかりません',
        httpStatus: 404,
        userMessage: '指定されたキャンペーンが見つかりません。'
    },
    CAMPAIGN_002: {
        code: 'CAMP-002',
        message: 'キャンペーン期間が不正です',
        httpStatus: 400,
        userMessage: '開始日は終了日より前に設定してください。'
    },
    CAMPAIGN_003: {
        code: 'CAMP-003',
        message: 'キャンペーンが既に終了しています',
        httpStatus: 400,
        userMessage: 'このキャンペーンは既に終了しています。'
    },
    
    // バリデーションエラー (VAL-xxx)
    VALIDATION_001: {
        code: 'VAL-001',
        message: '必須項目が入力されていません',
        httpStatus: 400,
        userMessage: '必須項目を全て入力してください。'
    },
    VALIDATION_002: {
        code: 'VAL-002',
        message: 'メールアドレスの形式が不正です',
        httpStatus: 400,
        userMessage: '正しいメールアドレスを入力してください。'
    },
    VALIDATION_003: {
        code: 'VAL-003',
        message: '電話番号の形式が不正です',
        httpStatus: 400,
        userMessage: '正しい電話番号を入力してください。'
    },
    VALIDATION_004: {
        code: 'VAL-004',
        message: '日付の形式が不正です',
        httpStatus: 400,
        userMessage: '正しい日付を入力してください。'
    },
    
    // システムエラー (SYS-xxx)
    SYSTEM_001: {
        code: 'SYS-001',
        message: '予期しないエラーが発生しました',
        httpStatus: 500,
        userMessage: 'システムエラーが発生しました。時間をおいて再度お試しください。'
    },
    SYSTEM_002: {
        code: 'SYS-002',
        message: 'メンテナンス中です',
        httpStatus: 503,
        userMessage: 'システムメンテナンス中です。しばらくお待ちください。'
    },
    
    // ネットワークエラー (NET-xxx)
    NETWORK_001: {
        code: 'NET-001',
        message: 'ネットワークエラー',
        httpStatus: 0,
        userMessage: 'ネットワーク接続を確認してください。'
    },
    NETWORK_002: {
        code: 'NET-002',
        message: 'タイムアウトエラー',
        httpStatus: 408,
        userMessage: '処理がタイムアウトしました。再度お試しください。'
    },
    
    // データベースエラー (DB-xxx)
    DATABASE_001: {
        code: 'DB-001',
        message: 'データベース接続エラー',
        httpStatus: 500,
        userMessage: 'データベースへの接続に失敗しました。'
    },
    DATABASE_002: {
        code: 'DB-002',
        message: 'データの整合性エラー',
        httpStatus: 500,
        userMessage: 'データの整合性エラーが発生しました。'
    }
};

// エラーハンドリングクラス
class ApiError extends Error {
    constructor(errorCode, details = null) {
        const errorInfo = ErrorCodes[errorCode] || ErrorCodes.SYSTEM_001;
        super(errorInfo.message);
        
        this.code = errorInfo.code;
        this.httpStatus = errorInfo.httpStatus;
        this.userMessage = errorInfo.userMessage;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
    
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            userMessage: this.userMessage,
            details: this.details,
            timestamp: this.timestamp
        };
    }
}

// エラーハンドリングユーティリティ
const ErrorHandler = {
    // エラーを処理してユーザーに表示
    handle: function(error) {
        // console.error('API Error:', error);
        
        if (error instanceof ApiError) {
            // APIエラーの場合
            this.showErrorMessage(error.userMessage);
            
            // 認証エラーの場合はログイン画面へ
            if (error.code.startsWith('AUTH-')) {
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
        } else if (error.response) {
            // HTTPレスポンスエラーの場合
            const statusCode = error.response.status;
            const errorCode = this.getErrorCodeByStatus(statusCode);
            const apiError = new ApiError(errorCode);
            this.showErrorMessage(apiError.userMessage);
        } else {
            // その他のエラー
            this.showErrorMessage('予期しないエラーが発生しました。');
        }
        
        // エラーログを記録
        this.logError(error);
    },
    
    // HTTPステータスコードからエラーコードを取得
    getErrorCodeByStatus: function(status) {
        switch (status) {
            case 401: return 'AUTH_001';
            case 403: return 'AUTH_002';
            case 404: return 'SYSTEM_001';
            case 409: return 'VALIDATION_001';
            case 500: return 'SYSTEM_001';
            case 503: return 'SYSTEM_002';
            default: return 'SYSTEM_001';
        }
    },
    
    // エラーメッセージを表示
    showErrorMessage: function(message) {
        // 既存のエラーメッセージを削除
        const existingError = document.querySelector('.error-toast');
        if (existingError) {
            existingError.remove();
        }
        
        // エラートーストを作成
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.innerHTML = `
            <div class="error-toast-content">
                <span class="error-icon">⚠️</span>
                <span class="error-message">${message}</span>
            </div>
        `;
        
        // スタイルを追加
        const style = document.createElement('style');
        style.textContent = `
            .error-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ef4444;
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            }
            
            .error-toast-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .error-icon {
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
        document.body.appendChild(toast);
        
        // 5秒後に自動的に削除
        setTimeout(() => {
            toast.remove();
        }, 5000);
    },
    
    // エラーログを記録
    logError: function(error) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: error instanceof ApiError ? error.toJSON() : {
                message: error.message,
                stack: error.stack
            },
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        // LocalStorageにエラーログを保存
        const logs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
        logs.push(errorLog);
        
        // 最新100件のみ保持
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('errorLogs', JSON.stringify(logs));
        
        // デバッグ画面へ通知
        if (window.notifyDebugScreen) {
            window.notifyDebugScreen('error', errorLog);
        }
    }
};

// グローバルに公開
window.ApiError = ApiError;
window.ErrorHandler = ErrorHandler;
window.ErrorCodes = ErrorCodes;

// fetchのラッパー関数
window.apiRequest = async function(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            // エラーレスポンスの処理
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                // JSONパースエラーの場合
                throw new ApiError('SYSTEM_001');
            }
            
            // APIからエラーコードが返ってきた場合
            if (errorData.code) {
                const errorKey = errorData.code.replace('-', '_');
                throw new ApiError(errorKey, errorData.details);
            } else {
                // エラーコードがない場合はステータスコードから判定
                const errorCode = ErrorHandler.getErrorCodeByStatus(response.status);
                throw new ApiError(errorCode);
            }
        }
        
        return await response.json();
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        } else if (error.name === 'NetworkError' || error.name === 'TypeError') {
            throw new ApiError('NETWORK_001');
        } else {
            throw new ApiError('SYSTEM_001');
        }
    }
};