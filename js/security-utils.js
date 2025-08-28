// セキュリティユーティリティ関数

// XSS対策：HTMLエスケープ
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// CSRF対策：トークン生成
function generateCSRFToken() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// CSRF対策：トークン検証
function validateCSRFToken(token) {
    const storedToken = sessionStorage.getItem('csrfToken');
    return token === storedToken;
}

// レート制限チェック
class RateLimiter {
    constructor(maxAttempts, windowMs) {
        this.maxAttempts = maxAttempts;
        this.windowMs = windowMs;
        this.attempts = new Map();
    }

    isAllowed(identifier) {
        const now = Date.now();
        const attempts = this.attempts.get(identifier) || [];
        
        // 期限切れの試行を削除
        const validAttempts = attempts.filter(timestamp => now - timestamp < this.windowMs);
        
        if (validAttempts.length >= this.maxAttempts) {
            return false;
        }
        
        validAttempts.push(now);
        this.attempts.set(identifier, validAttempts);
        return true;
    }

    getRemainingTime(identifier) {
        const now = Date.now();
        const attempts = this.attempts.get(identifier) || [];
        const validAttempts = attempts.filter(timestamp => now - timestamp < this.windowMs);
        
        if (validAttempts.length === 0) {
            return 0;
        }
        
        const oldestAttempt = Math.min(...validAttempts);
        return Math.max(0, this.windowMs - (now - oldestAttempt));
    }
}

// パスワード強度チェック
function checkPasswordStrength(password) {
    let strength = 0;
    const checks = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        numbers: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        noCommon: !isCommonPassword(password)
    };
    
    // スコア計算
    if (checks.length) strength += 20;
    if (checks.lowercase) strength += 20;
    if (checks.uppercase) strength += 20;
    if (checks.numbers) strength += 20;
    if (checks.special) strength += 20;
    
    // パスワード長によるボーナス
    if (password.length >= 12) strength += 10;
    if (password.length >= 16) strength += 10;
    
    // よくあるパスワードチェック
    if (!checks.noCommon) strength = Math.min(strength, 40);
    
    return {
        score: strength,
        checks: checks,
        level: getStrengthLevel(strength),
        feedback: getPasswordFeedback(checks)
    };
}

// パスワード強度レベル
function getStrengthLevel(score) {
    if (score >= 80) return 'strong';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'weak';
    return 'very-weak';
}

// パスワードフィードバック
function getPasswordFeedback(checks) {
    const feedback = [];
    if (!checks.length) feedback.push('8文字以上にしてください');
    if (!checks.lowercase) feedback.push('小文字を含めてください');
    if (!checks.uppercase) feedback.push('大文字を含めてください');
    if (!checks.numbers) feedback.push('数字を含めてください');
    if (!checks.special) feedback.push('特殊文字を含めてください');
    if (!checks.noCommon) feedback.push('よくあるパスワードは避けてください');
    return feedback;
}

// よくあるパスワードチェック
function isCommonPassword(password) {
    const commonPasswords = [
        'password', 'password123', '12345678', '123456789', 'qwerty', 
        'abc123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    return commonPasswords.includes(password.toLowerCase());
}

// 入力検証
class InputValidator {
    static email(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static phone(phone) {
        const re = /^[0-9]{10,11}$/;
        return re.test(phone.replace(/[-\s]/g, ''));
    }
    
    static url(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
    
    static alphanumeric(str) {
        const re = /^[a-zA-Z0-9]+$/;
        return re.test(str);
    }
    
    static japanese(str) {
        const re = /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/;
        return re.test(str);
    }
}

// SQLインジェクション対策：危険な文字をチェック
function hasSQLInjectionRisk(input) {
    const dangerousPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
        /(--|#|\/\*|\*\/)/,
        /('|")/,
        /(;|\||&)/
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(input));
}

// セッション管理
class SecureSession {
    static set(key, value, expiryMinutes = 30) {
        const item = {
            value: value,
            expiry: new Date().getTime() + (expiryMinutes * 60 * 1000)
        };
        sessionStorage.setItem(key, JSON.stringify(item));
    }
    
    static get(key) {
        const itemStr = sessionStorage.getItem(key);
        if (!itemStr) return null;
        
        try {
            const item = JSON.parse(itemStr);
            const now = new Date().getTime();
            
            if (now > item.expiry) {
                sessionStorage.removeItem(key);
                return null;
            }
            
            return item.value;
        } catch {
            return null;
        }
    }
    
    static remove(key) {
        sessionStorage.removeItem(key);
    }
    
    static clear() {
        sessionStorage.clear();
    }
}

// IPアドレス検証
function isValidIP(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// エクスポート
window.SecurityUtils = {
    escapeHtml,
    generateCSRFToken,
    validateCSRFToken,
    RateLimiter,
    checkPasswordStrength,
    InputValidator,
    hasSQLInjectionRisk,
    SecureSession,
    isValidIP
};
